import { visit } from 'unist-util-visit';
import { parse } from 'yaml';
import fs from 'fs';
import path from 'path';

// src/transformer.ts
function parseLeafletBlock(body) {
  let data;
  try {
    data = parse(body);
  } catch {
    return null;
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  return data;
}
function toCssSize(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) return `${value}px`;
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  return fallback;
}
var cache = null;
var cachePath = "";
function loadData(contentDir) {
  const p = path.join(
    contentDir,
    ".obsidian",
    "plugins",
    "obsidian-leaflet-plugin",
    "data.json"
  );
  if (cachePath === p && cache !== null) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    cache = null;
  }
  cachePath = p;
  return cache;
}
function rawMarkersForMap(contentDir, mapId) {
  const data = loadData(contentDir);
  const list = data?.mapMarkers;
  if (!Array.isArray(list)) return [];
  const entry = list.find((m) => m?.id === mapId);
  return Array.isArray(entry?.markers) ? entry.markers : [];
}
var FALLBACK_COLOR = "#888888";
function buildColorMap(contentDir) {
  const data = loadData(contentDir);
  const map = /* @__PURE__ */ new Map();
  const dm = data?.defaultMarker;
  map.set("default", typeof dm?.color === "string" ? dm.color : FALLBACK_COLOR);
  const list = data?.markerIcons;
  if (Array.isArray(list)) {
    for (const t of list) {
      if (t?.type) {
        map.set(String(t.type), typeof t.color === "string" ? t.color : FALLBACK_COLOR);
      }
    }
  }
  return map;
}
function mercatorY(lat) {
  return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
}
function applyTransform(loc, t) {
  const lat = loc[0];
  const lng = loc[1];
  const py = t.mode === "mercator" ? mercatorY(lat) : lat;
  return [t.D * lng + t.E * py + t.F, t.A * lng + t.B * py + t.C];
}
function endsWith(s, suffix) {
  return s === suffix || s.endsWith("/" + suffix);
}
function trimSuffix(s, suffix) {
  if (endsWith(s, suffix)) s = s.slice(0, -suffix.length);
  return s;
}
function stripSlashes(s, onlyStripPrefix) {
  if (s.startsWith("/")) s = s.substring(1);
  return s;
}
function simplifySlug(fp) {
  const res = stripSlashes(trimSuffix(fp, "index"));
  return res.length === 0 ? "/" : res;
}
function pathToRoot(slug) {
  let rootPath = slug.split("/").filter((x) => x !== "").slice(0, -1).map(() => "..").join("/");
  if (rootPath.length === 0) rootPath = ".";
  return rootPath;
}
function joinSegments(...args) {
  return args.filter((s) => s.length > 0).join("/").replace(/\/+/g, "/");
}
function resolveRelative(current, target) {
  return joinSegments(pathToRoot(current), simplifySlug(target));
}
function lastSegment(slug) {
  const parts = slug.split("/").filter((x) => x !== "");
  return (parts[parts.length - 1] ?? "").toLowerCase();
}
function buildSlugIndex(allSlugs) {
  const idx = /* @__PURE__ */ new Map();
  for (const slug of allSlugs) {
    const key = lastSegment(slug);
    if (key && !idx.has(key)) idx.set(key, slug);
  }
  return idx;
}
function buildMarkerData(contentDir, mapId, transform, currentSlug, slugIndex) {
  const colors = buildColorMap(contentDir);
  const markers = [];
  for (const m of rawMarkersForMap(contentDir, mapId)) {
    if (!Array.isArray(m.loc) || typeof m.loc[0] !== "number" || typeof m.loc[1] !== "number") {
      continue;
    }
    const title = (m.description ?? "").toString().trim();
    if (!title && !m.link) continue;
    const type = (m.type ?? "default").toString() || "default";
    const [lat, lng] = applyTransform(m.loc, transform);
    const marker = {
      lat,
      lng,
      title,
      type,
      color: colors.get(type) ?? FALLBACK_COLOR
    };
    if (m.link) {
      const targetSlug = slugIndex.get(m.link.toLowerCase());
      if (targetSlug) marker.href = resolveRelative(currentSlug, targetSlug);
    }
    markers.push(marker);
  }
  const seen = /* @__PURE__ */ new Map();
  for (const mk of markers) {
    const e = seen.get(mk.type) ?? { color: mk.color, count: 0 };
    e.count += 1;
    seen.set(mk.type, e);
  }
  const types = [...seen.entries()].map(([type, e]) => ({
    type,
    label: type === "default" ? "Uncategorised" : type,
    color: e.color,
    count: e.count
  }));
  types.sort((a, b) => {
    if (a.type === "default") return 1;
    if (b.type === "default") return -1;
    return a.label.localeCompare(b.label);
  });
  return { markers, types };
}

// src/scripts/leaflet-map.inline.ts
var leaflet_map_inline_default = `var v="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";function g(t,e){let r=typeof t=="number"?t:parseFloat(String(t));return Number.isFinite(r)?r:e}function H(t){let e=atob(t);try{return decodeURIComponent(Array.prototype.map.call(e,r=>"%"+("00"+r.charCodeAt(0).toString(16)).slice(-2)).join(""))}catch{return e}}function k(t){if(!t)return null;try{return JSON.parse(H(t))}catch{return null}}function P(t,e,r){return Math.max(1,Math.ceil(t/Math.pow(2,r-e)))}function h(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}var D=new DOMParser;async function q(t){try{let e=await fetch(t);if(!e.ok)return"";let l=D.parseFromString(await e.text(),"text/html").querySelector(".center article");return l?l.innerHTML:""}catch{return""}}function N(t,e){if(typeof L>"u")return;let r=String(e.tileServer||"");if(!r)return;let l=g(e.minZoom,0),i=g(e.maxZoom,8),s=g(e.defaultZoom,l),c=g(e.zoomDelta,1),n=256,o=Math.round(i),a=/\\{-y\\}/.test(r),p=1,d=1,f=e.bounds;Array.isArray(f)&&Array.isArray(f[1])&&(p=g(f[1][0],1),d=g(f[1][1],1));let u=L.map(t,{crs:L.CRS.Simple,minZoom:l,maxZoom:i,zoomSnap:c>0?c:1,zoomDelta:c>0?c:1,attributionControl:!1}),A=L.TileLayer.extend({getTileUrl:function(S){let y=S.z,b=S.x,m=S.y;if(y<0||y>o)return v;let R=P(p,y,o),C=P(d,y,o);if(b<0||m<0||b>=R||m>=C)return v;let w=a?C-1-m:m;return r.replace("{z}",String(y)).replace("{x}",String(b)).replace("{-y}",String(w)).replace("{y}",String(w))}}),E=p*n,x=d*n,M=L.latLngBounds(u.unproject([0,0],o),u.unproject([E,x],o));new A("",{tileSize:n,noWrap:e.noWrap!==!1,minNativeZoom:0,maxNativeZoom:o,bounds:M,errorTileUrl:v}).addTo(u),e.maxBounds!==void 0&&u.setMaxBounds(M),u.setView(u.unproject([E/2,x/2],o),s),Z(u,t),setTimeout(()=>u.invalidateSize(),0)}function Z(t,e){let r=k(e.dataset.markers),l=k(e.dataset.types);if(!Array.isArray(r)||r.length===0)return;let i=Array.isArray(l)?l:[],s={};i.forEach(n=>{s[n.type]=L.layerGroup().addTo(t)});let c=[];r.forEach(n=>{if(typeof n.lat!="number"||typeof n.lng!="number")return;let o=typeof n.href=="string"&&n.href.length>0,a=L.circleMarker([n.lat,n.lng],{radius:5,weight:2,color:"#1c1c1c",fillColor:typeof n.color=="string"?n.color:"#888888",fillOpacity:.9}),p=n.title?h(String(n.title)):"";if(p&&a.bindTooltip(p),o){let f=String(n.href);a.bindPopup('<div class="olt-popup-loading">\\u2026</div>',{className:"olt-popup",maxWidth:360,minWidth:260,maxHeight:360});let u=!1;a.on("popupopen",()=>{u||(u=!0,q(f).then(A=>{a.setPopupContent(A||p||"Open note")}))})}let d=s[n.type];d||(d=s[n.type]=L.layerGroup().addTo(t)),a.addTo(d),n.title&&c.push({q:String(n.title).toLowerCase(),title:String(n.title),lat:n.lat,lng:n.lng,cm:a})}),i.length>1&&z(t,i,s),c.length>0&&B(t,c)}function z(t,e,r){let l=L.control({position:"topright"});l.onAdd=function(){let i=L.DomUtil.create("div","olt-filter");return i.innerHTML='<div class="olt-filter-head">Filter</div>',e.forEach(s=>{let c=L.DomUtil.create("label","olt-filter-row",i);c.innerHTML='<input type="checkbox" checked> <span class="olt-swatch" style="background:'+h(String(s.color))+'"></span><span class="olt-flabel">'+h(String(s.label))+'</span><span class="olt-fcount">'+Number(s.count)+"</span>";let n=c.querySelector("input");n.addEventListener("change",()=>{let o=r[s.type];o&&(n.checked?o.addTo(t):t.removeLayer(o))})}),L.DomEvent.disableClickPropagation(i),L.DomEvent.disableScrollPropagation(i),i},l.addTo(t)}function B(t,e){let r="olt-list-"+Math.random().toString(36).slice(2,8),l=L.control({position:"topleft"});l.onAdd=function(){let i=L.DomUtil.create("div","olt-search"),s=e.map(o=>'<option value="'+h(o.title)+'">').join("");i.innerHTML='<input type="text" class="olt-search-input" placeholder="Search pins\\u2026" list="'+r+'"><datalist id="'+r+'">'+s+"</datalist>";let c=i.querySelector("input"),n=()=>{let o=c.value.trim().toLowerCase();if(!o)return;let a=e.find(d=>d.q===o)||e.find(d=>d.q.indexOf(o)!==-1);if(!a)return;let p=Math.min(t.getMaxZoom(),Math.max(t.getZoom(),7.5));t.setView([a.lat,a.lng],p),a.cm.getPopup&&a.cm.getPopup()?a.cm.openPopup():a.cm.openTooltip&&a.cm.openTooltip()};return c.addEventListener("change",n),c.addEventListener("keydown",o=>{o.key==="Enter"&&n()}),L.DomEvent.disableClickPropagation(i),i},l.addTo(t)}function T(){document.querySelectorAll(".olt-map").forEach(t=>{if(t.dataset.oltInit==="1")return;let e=t.dataset.olt;if(!e)return;let r;try{r=JSON.parse(H(e))}catch{return}t.dataset.oltInit="1",N(t,r)})}T();document.addEventListener("nav",T);document.addEventListener("render",T);
`;

// src/styles/leaflet-map.scss
var leaflet_map_default = ".olt-map {\n  width: 100%;\n  margin: 1rem 0;\n  border-radius: 6px;\n  overflow: hidden;\n  background: #0b0c0e;\n}\n.olt-map img {\n  max-width: none !important;\n  padding: 0 !important;\n  border: none !important;\n}\n\n.olt-popup .leaflet-popup-content-wrapper {\n  background: var(--light);\n  color: var(--dark);\n  border-radius: 6px;\n}\n\n.olt-popup .leaflet-popup-content {\n  margin: 0.75rem 0.9rem;\n  max-height: 320px;\n  overflow-y: auto;\n}\n.olt-popup .leaflet-popup-content > :first-child {\n  margin-top: 0;\n}\n\n.leaflet-container {\n  background: #0b0c0e;\n  font: inherit;\n  z-index: 0;\n}\n.leaflet-container img {\n  max-width: none !important;\n}\n\n.olt-filter,\n.olt-search {\n  background: rgba(20, 22, 26, 0.92);\n  color: #e6e6e6;\n  border-radius: 6px;\n  padding: 6px 8px;\n  font: 13px/1.3 system-ui, sans-serif;\n  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);\n}\n\n.olt-filter-head {\n  font-weight: 600;\n  font-size: 11px;\n  text-transform: uppercase;\n  letter-spacing: 0.04em;\n  color: #8fb3a8;\n  margin-bottom: 4px;\n}\n\n.olt-filter-row {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  cursor: pointer;\n  padding: 2px 0;\n}\n\n.olt-filter-row input {\n  margin: 0;\n}\n\n.olt-swatch {\n  width: 12px;\n  height: 12px;\n  border-radius: 50%;\n  display: inline-block;\n  flex: 0 0 auto;\n  border: 1px solid rgba(255, 255, 255, 0.4);\n}\n\n.olt-flabel {\n  flex: 1;\n}\n\n.olt-fcount {\n  opacity: 0.6;\n  font-size: 11px;\n}\n\n.olt-search-input {\n  background: #2a2d31;\n  color: #fff;\n  border: 1px solid #444;\n  border-radius: 4px;\n  padding: 4px 6px;\n  font-size: 13px;\n  width: 170px;\n}";

// src/transformer.ts
var DEFAULT_LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
var DEFAULT_LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
var DEFAULT_MARKER_TRANSFORM = {
  mode: "mercator",
  A: 0.711065,
  B: 1104e-6,
  C: 127.989676,
  D: -1e-4,
  E: 40.742995,
  F: -91.989785
};
var ObsidianLeafletTiles = (opts) => {
  const leafletCss = opts?.leafletCss ?? DEFAULT_LEAFLET_CSS;
  const leafletJs = opts?.leafletJs ?? DEFAULT_LEAFLET_JS;
  const markerTransform = {
    ...DEFAULT_MARKER_TRANSFORM,
    ...opts?.markerTransform ?? {}
  };
  return {
    name: "ObsidianLeafletTiles",
    markdownPlugins(ctx) {
      const contentDir = ctx.argv.directory;
      const slugIndex = buildSlugIndex(ctx.allSlugs ?? []);
      return [
        () => (tree, file) => {
          const currentSlug = file?.data?.slug ?? "";
          visit(tree, "code", (node) => {
            if (!node || node.lang !== "leaflet") return;
            const body = typeof node.value === "string" ? node.value : "";
            const config = parseLeafletBlock(body);
            if (!config) return;
            const json = Buffer.from(JSON.stringify(config), "utf-8").toString("base64");
            const height = toCssSize(config.height, "600px");
            const width = toCssSize(config.width, "100%");
            const data = config.id ? buildMarkerData(
              contentDir,
              String(config.id),
              markerTransform,
              currentSlug,
              slugIndex
            ) : { markers: [], types: [] };
            const markersB64 = Buffer.from(
              JSON.stringify(data.markers),
              "utf-8"
            ).toString("base64");
            const typesB64 = Buffer.from(
              JSON.stringify(data.types),
              "utf-8"
            ).toString("base64");
            node.data = node.data || {};
            node.data.hName = "div";
            node.data.hProperties = {
              className: ["olt-map"],
              dataOlt: json,
              dataMarkers: markersB64,
              dataTypes: typesB64,
              style: `height:${height};width:${width};max-width:${width};`
            };
            node.data.hChildren = [];
          });
        }
      ];
    },
    externalResources() {
      return {
        css: [{ content: leafletCss }, { content: leaflet_map_default, inline: true }],
        js: [
          { src: leafletJs, loadTime: "beforeDOMReady", contentType: "external" },
          { script: leaflet_map_inline_default, loadTime: "afterDOMReady", contentType: "inline" }
        ]
      };
    }
  };
};

export { ObsidianLeafletTiles };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map