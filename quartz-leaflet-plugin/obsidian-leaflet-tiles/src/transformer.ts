import { visit } from "unist-util-visit";
import type { QuartzTransformerPlugin } from "@quartz-community/types";
import { parseLeafletBlock, toCssSize } from "./parse";
import { buildMarkerData, buildSlugIndex } from "./markers";
import type { MarkerTransform } from "./types";
// These two imports resolve to strings at build time (see tsup.config.ts):
import leafletMapScript from "./scripts/leaflet-map.inline";
import leafletMapStyle from "./styles/leaflet-map.scss";

const DEFAULT_LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const DEFAULT_LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

// Verified against the Waterdeep map (dev/marker-align.html). Override per-vault
// via the plugin's `markerTransform` option if your markers use a different frame.
const DEFAULT_MARKER_TRANSFORM: MarkerTransform = {
  mode: "mercator",
  A: 0.711065,
  B: 0.001104,
  C: 127.989676,
  D: -0.0001,
  E: 40.742995,
  F: -91.989785,
};

export interface ObsidianLeafletTilesOptions {
  leafletCss?: string;
  leafletJs?: string;
  markerTransform?: Partial<MarkerTransform>;
}

export const ObsidianLeafletTiles: QuartzTransformerPlugin<
  Partial<ObsidianLeafletTilesOptions>
> = (opts) => {
  const leafletCss = opts?.leafletCss ?? DEFAULT_LEAFLET_CSS;
  const leafletJs = opts?.leafletJs ?? DEFAULT_LEAFLET_JS;
  const markerTransform: MarkerTransform = {
    ...DEFAULT_MARKER_TRANSFORM,
    ...(opts?.markerTransform ?? {}),
  };

  return {
    name: "ObsidianLeafletTiles",
    markdownPlugins(ctx) {
      const contentDir = ctx.argv.directory;
      const slugIndex = buildSlugIndex((ctx.allSlugs as unknown as string[]) ?? []);
      return [
        () => (tree: unknown, file: any) => {
          const currentSlug = (file?.data?.slug as string) ?? "";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          visit(tree as any, "code", (node: any) => {
            if (!node || node.lang !== "leaflet") return;
            const body = typeof node.value === "string" ? node.value : "";
            const config = parseLeafletBlock(body);
            if (!config) return;

            const json = Buffer.from(JSON.stringify(config), "utf-8").toString("base64");
            const height = toCssSize(config.height, "600px");
            const width = toCssSize(config.width, "100%");

            const data = config.id
              ? buildMarkerData(
                  contentDir,
                  String(config.id),
                  markerTransform,
                  currentSlug,
                  slugIndex,
                )
              : { markers: [], types: [] };
            const markersB64 = Buffer.from(
              JSON.stringify(data.markers),
              "utf-8",
            ).toString("base64");
            const typesB64 = Buffer.from(
              JSON.stringify(data.types),
              "utf-8",
            ).toString("base64");

            node.data = node.data || {};
            node.data.hName = "div";
            node.data.hProperties = {
              className: ["olt-map"],
              dataOlt: json,
              dataMarkers: markersB64,
              dataTypes: typesB64,
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
          { src: leafletJs, loadTime: "beforeDOMReady", contentType: "external" },
          { script: leafletMapScript, loadTime: "afterDOMReady", contentType: "inline" },
        ],
      };
    },
  };
};
