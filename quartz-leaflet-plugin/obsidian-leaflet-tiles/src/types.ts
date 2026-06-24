// The subset of obsidian-leaflet ```leaflet block keys this plugin understands.
// Unknown keys are preserved (passed through) but ignored — never fatal.
export interface LeafletTileConfig {
  /** Map identifier (used later to bind frontmatter markers — Phase 2). */
  id?: string;
  /** Tile URL template, e.g. ".../{z}/{x}/{-y}.png". {-y} = inverted-Y. */
  tileServer?: string;
  /** Coordinate reference system. Only "simple" is supported in Phase 1. */
  crs?: string;
  /** Container height, e.g. "900px" or a number (treated as px). */
  height?: string | number;
  /** Container width, e.g. "95%" or a number (treated as px). */
  width?: string | number;
  /** [[x0,y0],[x1,y1]] — second corner gives max-zoom tile counts (x1, y1). */
  bounds?: number[][];
  maxBounds?: number[][];
  minZoom?: number;
  maxZoom?: number;
  defaultZoom?: number;
  zoomDelta?: number;
  noWrap?: boolean;
  // Parsed but currently unused (measurement tool — future):
  unit?: string;
  scale?: number;
  // Any other keys obsidian-leaflet allows are tolerated:
  [key: string]: unknown;
}

/**
 * Maps obsidian-leaflet marker coordinates (geographic lat/lng degrees) onto our
 * tiled CRS.Simple map. Verified empirically (see dev/marker-align.html):
 *   py = (mode === "mercator") ? mercatorY(lat) : lat
 *   ourLng = A*lng + B*py + C
 *   ourLat = D*lng + E*py + F
 * where mercatorY(lat) = ln(tan(PI/4 + lat*PI/360)).
 */
export interface MarkerTransform {
  mode: "mercator" | "raw";
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  F: number;
}

/** A marker ready to render: final map coordinates + label + optional note link. */
export interface RenderMarker {
  lat: number;
  lng: number;
  title: string;
  href?: string;
}
