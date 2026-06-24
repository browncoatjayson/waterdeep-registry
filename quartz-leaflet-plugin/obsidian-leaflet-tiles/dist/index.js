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
function mercatorY(lat) {
  return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
}
function applyTransform(loc, t) {
  const lat = loc[0];
  const lng = loc[1];
  const py = t.mode === "mercator" ? mercatorY(lat) : lat;
  const ourLng = t.A * lng + t.B * py + t.C;
  const ourLat = t.D * lng + t.E * py + t.F;
  return [ourLat, ourLng];
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
function buildMarkers(contentDir, mapId, transform, currentSlug, slugIndex) {
  const out = [];
  for (const m of rawMarkersForMap(contentDir, mapId)) {
    if (!Array.isArray(m.loc) || typeof m.loc[0] !== "number" || typeof m.loc[1] !== "number") {
      continue;
    }
    const [lat, lng] = applyTransform(m.loc, transform);
    const marker = {
      lat,
      lng,
      title: (m.description ?? "").toString()
    };
    if (m.link) {
      const targetSlug = slugIndex.get(m.link.toLowerCase());
      if (targetSlug) marker.href = resolveRelative(currentSlug, targetSlug);
    }
    out.push(marker);
  }
  return out;
}

// src/scripts/leaflet-map.inline.ts
var leaflet_map_inline_default = `var b="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";function l(n,t){let e=typeof n=="number"?n:parseFloat(String(n));return Number.isFinite(e)?e:t}function w(n){let t=atob(n);try{return decodeURIComponent(Array.prototype.map.call(t,e=>"%"+("00"+e.charCodeAt(0).toString(16)).slice(-2)).join(""))}catch{return t}}function v(n,t,e){return Math.max(1,Math.ceil(n/Math.pow(2,e-t)))}function Z(n,t){if(typeof L>"u")return;let e=String(t.tileServer||"");if(!e)return;let o=l(t.minZoom,0),r=l(t.maxZoom,8),u=l(t.defaultZoom,o),a=l(t.zoomDelta,1),s=256,c=Math.round(r),z=/\\{-y\\}/.test(e),f=1,A=1,m=t.bounds;Array.isArray(m)&&Array.isArray(m[1])&&(f=l(m[1][0],1),A=l(m[1][1],1));let i=L.map(n,{crs:L.CRS.Simple,minZoom:o,maxZoom:r,zoomSnap:a>0?a:1,zoomDelta:a>0?a:1,attributionControl:!1}),N=L.TileLayer.extend({getTileUrl:function(y){let d=y.z,g=y.x,p=y.y;if(d<0||d>c)return b;let R=v(f,d,c),E=v(A,d,c);if(g<0||p<0||g>=R||p>=E)return b;let M=z?E-1-p:p;return e.replace("{z}",String(d)).replace("{x}",String(g)).replace("{-y}",String(M)).replace("{y}",String(M))}}),h=f*s,x=A*s,T=L.latLngBounds(i.unproject([0,0],c),i.unproject([h,x],c));new N("",{tileSize:s,noWrap:t.noWrap!==!1,minNativeZoom:0,maxNativeZoom:c,bounds:T,errorTileUrl:b}).addTo(i),t.maxBounds!==void 0&&i.setMaxBounds(T),i.setView(i.unproject([h/2,x/2],c),u),B(i,n),setTimeout(()=>i.invalidateSize(),0)}function C(n){return String(n).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function B(n,t){let e=t.dataset.markers;if(!e)return;let o;try{o=JSON.parse(w(e))}catch{return}Array.isArray(o)&&o.forEach(r=>{if(typeof r.lat!="number"||typeof r.lng!="number")return;let u=typeof r.href=="string"&&r.href.length>0,a=L.circleMarker([r.lat,r.lng],{radius:5,weight:2,color:u?"#2f6f5e":"#c98f2f",fillColor:u?"#3bb38f":"#e0b25a",fillOpacity:.85}),s=r.title?C(r.title):"";s&&a.bindTooltip(s),u&&a.bindPopup('<a href="'+C(r.href)+'" class="internal">'+(s||"Open note")+"</a>"),a.addTo(n)})}function S(){document.querySelectorAll(".olt-map").forEach(t=>{if(t.dataset.oltInit==="1")return;let e=t.dataset.olt;if(!e)return;let o;try{o=JSON.parse(w(e))}catch{return}t.dataset.oltInit="1",Z(t,o)})}S();document.addEventListener("nav",S);document.addEventListener("render",S);
`;

// src/styles/leaflet-map.scss
var leaflet_map_default = ".olt-map {\n  width: 100%;\n  margin: 1rem 0;\n  border-radius: 6px;\n  overflow: hidden;\n  background: #0b0c0e;\n}\n.olt-map img {\n  max-width: none !important;\n  padding: 0 !important;\n  border: none !important;\n}\n\n.leaflet-container {\n  background: #0b0c0e;\n  font: inherit;\n  z-index: 0;\n}\n.leaflet-container img {\n  max-width: none !important;\n}";

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
            const markers = config.id ? buildMarkers(
              contentDir,
              String(config.id),
              markerTransform,
              currentSlug,
              slugIndex
            ) : [];
            const markersB64 = Buffer.from(
              JSON.stringify(markers),
              "utf-8"
            ).toString("base64");
            node.data = node.data || {};
            node.data.hName = "div";
            node.data.hProperties = {
              className: ["olt-map"],
              dataOlt: json,
              dataMarkers: markersB64,
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