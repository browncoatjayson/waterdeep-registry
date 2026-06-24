import { visit } from 'unist-util-visit';
import { parse } from 'yaml';

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

// src/scripts/leaflet-map.inline.ts
var leaflet_map_inline_default = 'var f="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";function a(e,t){let n=typeof e=="number"?e:parseFloat(String(e));return Number.isFinite(n)?n:t}function w(e){let t=atob(e);try{return decodeURIComponent(Array.prototype.map.call(t,n=>"%"+("00"+n.charCodeAt(0).toString(16)).slice(-2)).join(""))}catch{return t}}function C(e,t,n){return Math.max(1,Math.ceil(e/Math.pow(2,n-t)))}function B(e,t){if(typeof L>"u")return;let n=String(t.tileServer||"");if(!n)return;let i=a(t.minZoom,0),b=a(t.maxZoom,8),E=a(t.defaultZoom,i),c=a(t.zoomDelta,1),m=256,o=Math.round(b),z=/\\{-y\\}/.test(n),d=1,A=1,u=t.bounds;Array.isArray(u)&&Array.isArray(u[1])&&(d=a(u[1][0],1),A=a(u[1][1],1));let r=L.map(e,{crs:L.CRS.Simple,minZoom:i,maxZoom:b,zoomSnap:c>0?c:1,zoomDelta:c>0?c:1,attributionControl:!1}),M=L.TileLayer.extend({getTileUrl:function(p){let s=p.z,y=p.x,l=p.y;if(s<0||s>o)return f;let Z=C(d,s,o),h=C(A,s,o);if(y<0||l<0||y>=Z||l>=h)return f;let v=z?h-1-l:l;return n.replace("{z}",String(s)).replace("{x}",String(y)).replace("{-y}",String(v)).replace("{y}",String(v))}}),x=d*m,g=A*m,T=L.latLngBounds(r.unproject([0,0],o),r.unproject([x,g],o));new M("",{tileSize:m,noWrap:t.noWrap!==!1,minNativeZoom:0,maxNativeZoom:o,bounds:T,errorTileUrl:f}).addTo(r),t.maxBounds!==void 0&&r.setMaxBounds(T),r.setView(r.unproject([x/2,g/2],o),E),setTimeout(()=>r.invalidateSize(),0)}function S(){document.querySelectorAll(".olt-map").forEach(t=>{if(t.dataset.oltInit==="1")return;let n=t.dataset.olt;if(!n)return;let i;try{i=JSON.parse(w(n))}catch{return}t.dataset.oltInit="1",B(t,i)})}S();document.addEventListener("nav",S);document.addEventListener("render",S);\n';

// src/styles/leaflet-map.scss
var leaflet_map_default = ".olt-map {\n  width: 100%;\n  margin: 1rem 0;\n  border-radius: 6px;\n  overflow: hidden;\n  background: #0b0c0e;\n}\n.olt-map img {\n  max-width: none !important;\n  padding: 0 !important;\n  border: none !important;\n}\n\n.leaflet-container {\n  background: #0b0c0e;\n  font: inherit;\n  z-index: 0;\n}\n.leaflet-container img {\n  max-width: none !important;\n}";

// src/transformer.ts
var DEFAULT_LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
var DEFAULT_LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
var ObsidianLeafletTiles = (opts) => {
  const leafletCss = opts?.leafletCss ?? DEFAULT_LEAFLET_CSS;
  const leafletJs = opts?.leafletJs ?? DEFAULT_LEAFLET_JS;
  return {
    name: "ObsidianLeafletTiles",
    markdownPlugins() {
      return [
        () => (tree) => {
          visit(tree, "code", (node) => {
            if (!node || node.lang !== "leaflet") return;
            const body = typeof node.value === "string" ? node.value : "";
            const config = parseLeafletBlock(body);
            if (!config) return;
            const json = Buffer.from(JSON.stringify(config), "utf-8").toString("base64");
            const height = toCssSize(config.height, "600px");
            const width = toCssSize(config.width, "100%");
            node.data = node.data || {};
            node.data.hName = "div";
            node.data.hProperties = {
              className: ["olt-map"],
              dataOlt: json,
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
          {
            src: leafletJs,
            loadTime: "beforeDOMReady",
            contentType: "external"
          },
          {
            script: leaflet_map_inline_default,
            loadTime: "afterDOMReady",
            contentType: "inline"
          }
        ]
      };
    }
  };
};

export { ObsidianLeafletTiles };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map