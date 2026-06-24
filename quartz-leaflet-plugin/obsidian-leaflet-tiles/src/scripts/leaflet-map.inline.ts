// Browser script. Runs after Leaflet (global `L`) is loaded. Finds every
// .olt-map div, renders the tiled map, its markers (coloured + grouped by type),
// and adds search + type-filter controls.

declare const L: any;

const TRANSPARENT =
  "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

function decodeB64(b64: string): string {
  const bin = atob(b64);
  try {
    return decodeURIComponent(
      Array.prototype.map
        .call(bin, (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
  } catch {
    return bin;
  }
}

function parseB64<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(decodeB64(raw)) as T;
  } catch {
    return null;
  }
}

function tileCount(maxCount: number, z: number, maxNative: number): number {
  return Math.max(1, Math.ceil(maxCount / Math.pow(2, maxNative - z)));
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildMap(el: HTMLElement, cfg: Record<string, any>): void {
  if (typeof L === "undefined") return;
  const tileServer: string = String(cfg.tileServer || "");
  if (!tileServer) return;

  const minZoom = num(cfg.minZoom, 0);
  const maxZoom = num(cfg.maxZoom, 8);
  const defaultZoom = num(cfg.defaultZoom, minZoom);
  const zoomDelta = num(cfg.zoomDelta, 1);
  const tileSize = 256;
  const maxNative = Math.round(maxZoom);
  const invertY = /\{-y\}/.test(tileServer);

  let maxCountX = 1;
  let maxCountY = 1;
  const b = cfg.bounds;
  if (Array.isArray(b) && Array.isArray(b[1])) {
    maxCountX = num(b[1][0], 1);
    maxCountY = num(b[1][1], 1);
  }

  const map = L.map(el, {
    crs: L.CRS.Simple,
    minZoom,
    maxZoom,
    zoomSnap: zoomDelta > 0 ? zoomDelta : 1,
    zoomDelta: zoomDelta > 0 ? zoomDelta : 1,
    attributionControl: false,
  });

  const TileClass = L.TileLayer.extend({
    getTileUrl: function (coords: any): string {
      const z = coords.z;
      const x = coords.x;
      const y = coords.y;
      if (z < 0 || z > maxNative) return TRANSPARENT;
      const xc = tileCount(maxCountX, z, maxNative);
      const yc = tileCount(maxCountY, z, maxNative);
      if (x < 0 || y < 0 || x >= xc || y >= yc) return TRANSPARENT;
      const fy = invertY ? yc - 1 - y : y;
      return tileServer
        .replace("{z}", String(z))
        .replace("{x}", String(x))
        .replace("{-y}", String(fy))
        .replace("{y}", String(fy));
    },
  });

  const wpx = maxCountX * tileSize;
  const hpx = maxCountY * tileSize;
  const bounds = L.latLngBounds(
    map.unproject([0, 0], maxNative),
    map.unproject([wpx, hpx], maxNative),
  );

  new TileClass("", {
    tileSize,
    noWrap: cfg.noWrap !== false,
    minNativeZoom: 0,
    maxNativeZoom: maxNative,
    bounds,
    errorTileUrl: TRANSPARENT,
  }).addTo(map);

  if (cfg.maxBounds !== undefined) map.setMaxBounds(bounds);
  map.setView(map.unproject([wpx / 2, hpx / 2], maxNative), defaultZoom);
  renderMarkers(map, el);
  setTimeout(() => map.invalidateSize(), 0);
}

interface SearchEntry {
  q: string;
  title: string;
  lat: number;
  lng: number;
  cm: any;
}

function renderMarkers(map: any, el: HTMLElement): void {
  const markers = parseB64<Array<Record<string, any>>>(el.dataset.markers);
  const types = parseB64<Array<Record<string, any>>>(el.dataset.types);
  if (!Array.isArray(markers) || markers.length === 0) return;
  const legend = Array.isArray(types) ? types : [];

  const groups: Record<string, any> = {};
  legend.forEach((t) => {
    groups[t.type] = L.layerGroup().addTo(map);
  });

  const index: SearchEntry[] = [];
  markers.forEach((m) => {
    if (typeof m.lat !== "number" || typeof m.lng !== "number") return;
    const linked = typeof m.href === "string" && m.href.length > 0;
    const cm = L.circleMarker([m.lat, m.lng], {
      radius: 5,
      weight: 2,
      color: "#1c1c1c",
      fillColor: typeof m.color === "string" ? m.color : "#888888",
      fillOpacity: 0.9,
    });
    const title = m.title ? escapeHtml(String(m.title)) : "";
    if (title) cm.bindTooltip(title);
    if (linked) {
      cm.bindPopup(
        '<a href="' + escapeHtml(String(m.href)) + '" class="internal">' + (title || "Open note") + "</a>",
      );
    }
    let g = groups[m.type];
    if (!g) g = groups[m.type] = L.layerGroup().addTo(map);
    cm.addTo(g);
    if (m.title) {
      index.push({ q: String(m.title).toLowerCase(), title: String(m.title), lat: m.lat, lng: m.lng, cm });
    }
  });

  if (legend.length > 1) addFilterControl(map, legend, groups);
  if (index.length > 0) addSearchControl(map, index);
}

function addFilterControl(map: any, legend: Array<Record<string, any>>, groups: Record<string, any>): void {
  const ctrl = L.control({ position: "topright" });
  ctrl.onAdd = function () {
    const div = L.DomUtil.create("div", "olt-filter");
    div.innerHTML = '<div class="olt-filter-head">Filter</div>';
    legend.forEach((t) => {
      const row = L.DomUtil.create("label", "olt-filter-row", div);
      row.innerHTML =
        '<input type="checkbox" checked> ' +
        '<span class="olt-swatch" style="background:' + escapeHtml(String(t.color)) + '"></span>' +
        '<span class="olt-flabel">' + escapeHtml(String(t.label)) + "</span>" +
        '<span class="olt-fcount">' + Number(t.count) + "</span>";
      const cb = row.querySelector("input") as HTMLInputElement;
      cb.addEventListener("change", () => {
        const g = groups[t.type];
        if (!g) return;
        if (cb.checked) g.addTo(map);
        else map.removeLayer(g);
      });
    });
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);
    return div;
  };
  ctrl.addTo(map);
}

function addSearchControl(map: any, index: SearchEntry[]): void {
  const listId = "olt-list-" + Math.random().toString(36).slice(2, 8);
  const ctrl = L.control({ position: "topleft" });
  ctrl.onAdd = function () {
    const div = L.DomUtil.create("div", "olt-search");
    const opts = index.map((i) => '<option value="' + escapeHtml(i.title) + '">').join("");
    div.innerHTML =
      '<input type="text" class="olt-search-input" placeholder="Search pins…" list="' + listId + '">' +
      '<datalist id="' + listId + '">' + opts + "</datalist>";
    const input = div.querySelector("input") as HTMLInputElement;
    const go = () => {
      const q = input.value.trim().toLowerCase();
      if (!q) return;
      const hit = index.find((i) => i.q === q) || index.find((i) => i.q.indexOf(q) !== -1);
      if (!hit) return;
      const target = Math.min(map.getMaxZoom(), Math.max(map.getZoom(), 7.5));
      map.setView([hit.lat, hit.lng], target);
      if (hit.cm.getPopup && hit.cm.getPopup()) hit.cm.openPopup();
      else if (hit.cm.openTooltip) hit.cm.openTooltip();
    };
    input.addEventListener("change", go);
    input.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") go();
    });
    L.DomEvent.disableClickPropagation(div);
    return div;
  };
  ctrl.addTo(map);
}

function initOltMaps(): void {
  document.querySelectorAll<HTMLElement>(".olt-map").forEach((el) => {
    if (el.dataset.oltInit === "1") return;
    const raw = el.dataset.olt;
    if (!raw) return;
    let cfg: Record<string, any>;
    try {
      cfg = JSON.parse(decodeB64(raw));
    } catch {
      return;
    }
    el.dataset.oltInit = "1";
    buildMap(el, cfg);
  });
}

initOltMaps();
document.addEventListener("nav", initOltMaps);
document.addEventListener("render", initOltMaps);

export default "";
