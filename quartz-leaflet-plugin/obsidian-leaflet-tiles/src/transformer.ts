import { visit } from "unist-util-visit";
import type { QuartzTransformerPlugin } from "@quartz-community/types";
import { parseLeafletBlock, toCssSize } from "./parse";
// These two imports resolve to strings at build time (see tsup.config.ts):
import leafletMapScript from "./scripts/leaflet-map.inline";
import leafletMapStyle from "./styles/leaflet-map.scss";

const DEFAULT_LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const DEFAULT_LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

export interface ObsidianLeafletTilesOptions {
  /** Override the Leaflet stylesheet URL (e.g. to self-host / pin a version). */
  leafletCss?: string;
  /** Override the Leaflet script URL. */
  leafletJs?: string;
}

/**
 * Quartz v5 transformer. Finds ```leaflet code blocks, parses their YAML body,
 * and replaces each with a <div class="olt-map"> carrying the config (base64
 * JSON in data-olt). A browser script then renders the tiled Leaflet map.
 */
export const ObsidianLeafletTiles: QuartzTransformerPlugin<
  Partial<ObsidianLeafletTilesOptions>
> = (opts) => {
  const leafletCss = opts?.leafletCss ?? DEFAULT_LEAFLET_CSS;
  const leafletJs = opts?.leafletJs ?? DEFAULT_LEAFLET_JS;

  return {
    name: "ObsidianLeafletTiles",
    markdownPlugins() {
      return [
        () => (tree: unknown) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          visit(tree as any, "code", (node: any) => {
            if (!node || node.lang !== "leaflet") return;
            const body = typeof node.value === "string" ? node.value : "";
            const config = parseLeafletBlock(body);
            if (!config) return; // unparseable -> leave the block untouched

            const json = Buffer.from(JSON.stringify(config), "utf-8").toString("base64");
            const height = toCssSize(config.height, "600px");
            const width = toCssSize(config.width, "100%");

            // Turn this mdast code node into a <div> in the output HTML, with no
            // children, via mdast-util-to-hast's hName/hProperties hooks. This
            // avoids relying on raw-HTML passthrough and keeps syntax
            // highlighting (which targets <pre><code>) from touching it.
            node.data = node.data || {};
            node.data.hName = "div";
            node.data.hProperties = {
              className: ["olt-map"],
              dataOlt: json,
              style: `height:${height};width:${width};max-width:${width};`,
            };
            node.data.hChildren = [];
          });
        },
      ];
    },
    externalResources() {
      return {
        css: [{ content: leafletCss }, { content: leafletMapStyle, inline: true }],
        js: [
          {
            src: leafletJs,
            loadTime: "beforeDOMReady",
            contentType: "external",
          },
          {
            script: leafletMapScript,
            loadTime: "afterDOMReady",
            contentType: "inline",
          },
        ],
      };
    },
  };
};
