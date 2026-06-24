export interface LeafletTileConfig {
  /** Map identifier (used to bind frontmatter/data.json markers — Phase 2). */
  id?: string;
  /** Tile URL template, e.g. ".../{z}/{x}/{-y}.png". {-y} = inverted-Y. */
  tileServer?: string;
  /** Coordinate reference system. Only "simple" is supported. */
  crs?: string;
  height?: string | number;
  width?: string | number;
  /** [[x0,y0],[x1,y1]] — second corner gives max-zoom tile counts (x1, y1). */
  bounds?: number[][];
  maxBounds?: number[][];
  minZoom?: number;
  maxZoom?: number;
  defaultZoom?: number;
  zoomDelta?: number;
  noWrap?: boolean;
  unit?: string;
  scale?: number;
  [key: string]: unknown;
}

/**
 * Maps obsidian-leaflet marker coordinates (geographic lat/lng degrees) onto our
 * tiled CRS.Simple map. Verified empirically (dev/marker-align.html):
 *   py = (mode === "mercator") ? mercatorY(lat) : lat
 *   ourLng = A*lng + B*py + C ; ourLat = D*lng + E*py + F
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

/** A marker ready to render: final map coordinates, label, link, type, colour. */
export interface RenderMarker {
  lat: number;
  lng: number;
  title: string;
  href?: string;
  type: string;
  color: string;
}

/** One entry in the filter legend: a marker type present on the map. */
export interface MarkerTypeInfo {
  type: string;
  label: string;
  color: string;
  count: number;
}

/** What the transformer embeds for the browser to render. */
export interface MarkerData {
  markers: RenderMarker[];
  types: MarkerTypeInfo[];
}
