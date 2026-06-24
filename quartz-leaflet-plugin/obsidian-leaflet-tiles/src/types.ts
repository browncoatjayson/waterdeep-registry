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
