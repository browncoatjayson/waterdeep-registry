// Browser script. Runs after Leaflet (loaded from CDN) is available as the
// global `L`. Finds every .olt-map div, reads its config, and renders a tiled
// CRS.Simple map. Tile-Y inversion is computed against the REAL per-zoom tile
// count (not 2^zoom), which is what Obsidian's non-power-of-two raster pyramids
// require — verified empirically in dev/tile-test.html.

// Leaflet is a global provided by the CDN <script> tag.
declare const L: any;

const TRANSPARENT =
  "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

// Decode base64 (UTF-8 safe) back to the JSON config string.
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

// Tiles at a given zoom = ceil(maxCount / 2^(maxNativeZoom - zoom)).
function tileCount(maxCount: number, z: number, maxNative: number): number {
  return Math.max(1, Math.ceil(maxCount / Math.pow(2, maxNative - z)));
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

  // bounds: [[x0,y0],[x1,y1]] — second corner gives max-zoom tile counts.
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

  if (cfg.maxBounds !== undefined) {
    map.setMaxBounds(bounds);
  }
  map.setView(map.unproject([wpx / 2, hpx / 2], maxNative), defaultZoom);
  renderMarkers(map, el);
  // Containers sized via CSS can mis-measure on first paint; nudge Leaflet.
  setTimeout(() => map.invalidateSize(), 0);
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMarkers(map: any, el: HTMLElement): void {
  const raw = el.dataset.markers;
  if (!raw) return;
  let ms: Array<Record<string, any>>;
  try {
    ms = JSON.parse(decodeB64(raw));
  } catch {
    return;
  }
  if (!Array.isArray(ms)) return;
  ms.forEach((m) => {
    if (typeof m.lat !== "number" || typeof m.lng !== "number") return;
    const linked = typeof m.href === "string" && m.href.length > 0;
    const marker = L.circleMarker([m.lat, m.lng], {
      radius: 5,
      weight: 2,
      color: linked ? "#2f6f5e" : "#c98f2f",
      fillColor: linked ? "#3bb38f" : "#e0b25a",
      fillOpacity: 0.85,
    });
    const title = m.title ? escapeHtml(m.title) : "";
    if (title) marker.bindTooltip(title);
    if (linked) {
      marker.bindPopup(
        '<a href="' + escapeHtml(m.href) + '" class="internal">' + (title || "Open note") + "</a>",
      );
    }
    marker.addTo(map);
  });
}

function initOltMaps(): void {
  const nodes = document.querySelectorAll<HTMLElement>(".olt-map");
  nodes.forEach((el) => {
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
// Quartz SPA navigation: re-init on each page change. The per-element
// dataset.oltInit guard makes initOltMaps idempotent, so re-firing is safe.
document.addEventListener("nav", initOltMaps);
document.addEventListener("render", initOltMaps);

// Satisfies the type-checker (this file is a module). The build loader
// (tsup.config.ts) strips this line and substitutes the bundled script.
export default "";
