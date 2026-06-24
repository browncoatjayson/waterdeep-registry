import { QuartzTransformerPlugin } from '@quartz-community/types';

/**
 * Maps obsidian-leaflet marker coordinates (geographic lat/lng degrees) onto our
 * tiled CRS.Simple map. Verified empirically (see dev/marker-align.html):
 *   py = (mode === "mercator") ? mercatorY(lat) : lat
 *   ourLng = A*lng + B*py + C
 *   ourLat = D*lng + E*py + F
 * where mercatorY(lat) = ln(tan(PI/4 + lat*PI/360)).
 */
interface MarkerTransform {
    mode: "mercator" | "raw";
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
    F: number;
}

interface ObsidianLeafletTilesOptions {
    leafletCss?: string;
    leafletJs?: string;
    /** Maps obsidian-leaflet marker coordinates onto the tiled map. */
    markerTransform?: Partial<MarkerTransform>;
}
/**
 * Quartz v5 transformer. Renders ```leaflet code blocks as tiled Leaflet maps,
 * and (Phase 2) reads markers from obsidian-leaflet's data.json, transforms
 * their coordinates onto the map, and links each to its note.
 */
declare const ObsidianLeafletTiles: QuartzTransformerPlugin<Partial<ObsidianLeafletTilesOptions>>;

export { ObsidianLeafletTiles, type ObsidianLeafletTilesOptions };
