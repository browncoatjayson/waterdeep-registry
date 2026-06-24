import { QuartzTransformerPlugin } from '@quartz-community/types';

interface ObsidianLeafletTilesOptions {
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
declare const ObsidianLeafletTiles: QuartzTransformerPlugin<Partial<ObsidianLeafletTilesOptions>>;

export { ObsidianLeafletTiles, type ObsidianLeafletTilesOptions };
