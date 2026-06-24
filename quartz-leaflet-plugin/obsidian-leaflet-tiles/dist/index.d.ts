import { QuartzTransformerPlugin } from '@quartz-community/types';

/**
 * Maps obsidian-leaflet marker coordinates (geographic lat/lng degrees) onto our
 * tiled CRS.Simple map. Verified empirically (dev/marker-align.html):
 *   py = (mode === "mercator") ? mercatorY(lat) : lat
 *   ourLng = A*lng + B*py + C ; ourLat = D*lng + E*py + F
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
    markerTransform?: Partial<MarkerTransform>;
}
declare const ObsidianLeafletTiles: QuartzTransformerPlugin<Partial<ObsidianLeafletTilesOptions>>;

export { ObsidianLeafletTiles, type ObsidianLeafletTilesOptions };
