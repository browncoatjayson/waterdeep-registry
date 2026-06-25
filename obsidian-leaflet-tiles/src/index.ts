// Quartz's config-loader scans this module's exports for the plugin function,
// so keep the only runtime export the plugin itself.
export { ObsidianLeafletTiles } from "./transformer";
export type { ObsidianLeafletTilesOptions } from "./transformer";
