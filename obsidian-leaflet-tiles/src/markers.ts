import fs from "fs";
import path from "path";
import type {
  MarkerTransform,
  RenderMarker,
  MarkerTypeInfo,
  MarkerData,
} from "./types";

// ---------------------------------------------------------------------------
// Reading obsidian-leaflet's data.json at build time (defensive: any unexpected
// shape yields no markers, never a crash). Must be committed for CI to see it.
// ---------------------------------------------------------------------------

interface RawMarker {
  loc?: [number, number];
  description?: string | null;
  link?: string | null;
  type?: string | null;
}

let cache: unknown = null;
let cachePath = "";

function loadData(contentDir: string): any {
  const p = path.join(
    contentDir,
    ".obsidian",
    "plugins",
    "obsidian-leaflet-plugin",
    "data.json",
  );
  if (cachePath === p && cache !== null) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    cache = null;
  }
  cachePath = p;
  return cache;
}

function rawMarkersForMap(contentDir: string, mapId: string): RawMarker[] {
  const data = loadData(contentDir);
  const list = data?.mapMarkers;
  if (!Array.isArray(list)) return [];
  const entry = list.find((m: any) => m?.id === mapId);
  return Array.isArray(entry?.markers) ? entry.markers : [];
}

const FALLBACK_COLOR = "#888888";

/** type name -> colour, from obsidian-leaflet's markerIcons + defaultMarker. */
function buildColorMap(contentDir: string): Map<string, string> {
  const data = loadData(contentDir);
  const map = new Map<string, string>();
  const dm = data?.defaultMarker;
  map.set("default", typeof dm?.color === "string" ? dm.color : FALLBACK_COLOR);
  const list = data?.markerIcons;
  if (Array.isArray(list)) {
    for (const t of list) {
      if (t?.type) {
        map.set(String(t.type), typeof t.color === "string" ? t.color : FALLBACK_COLOR);
      }
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Coordinate transform: geographic (lat/lng) -> our CRS.Simple map coords.
// ---------------------------------------------------------------------------

function mercatorY(lat: number): number {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}
function applyTransform(loc: [number, number], t: MarkerTransform): [number, number] {
  const lat = loc[0];
  const lng = loc[1];
  const py = t.mode === "mercator" ? mercatorY(lat) : lat;
  return [t.D * lng + t.E * py + t.F, t.A * lng + t.B * py + t.C];
}

// ---------------------------------------------------------------------------
// Link resolution (replicated from @quartz-community/utils so links behave
// exactly like every other Quartz internal link).
// ---------------------------------------------------------------------------

function endsWith(s: string, suffix: string): boolean {
  return s === suffix || s.endsWith("/" + suffix);
}
function trimSuffix(s: string, suffix: string): string {
  if (endsWith(s, suffix)) s = s.slice(0, -suffix.length);
  return s;
}
function stripSlashes(s: string, onlyStripPrefix?: boolean): string {
  if (s.startsWith("/")) s = s.substring(1);
  if (!onlyStripPrefix && s.endsWith("/")) s = s.slice(0, -1);
  return s;
}
function simplifySlug(fp: string): string {
  const res = stripSlashes(trimSuffix(fp, "index"), true);
  return res.length === 0 ? "/" : res;
}
function pathToRoot(slug: string): string {
  let rootPath = slug
    .split("/")
    .filter((x) => x !== "")
    .slice(0, -1)
    .map(() => "..")
    .join("/");
  if (rootPath.length === 0) rootPath = ".";
  return rootPath;
}
function joinSegments(...args: string[]): string {
  return args.filter((s) => s.length > 0).join("/").replace(/\/+/g, "/");
}
function resolveRelative(current: string, target: string): string {
  return joinSegments(pathToRoot(current), simplifySlug(target));
}
function lastSegment(slug: string): string {
  const parts = slug.split("/").filter((x) => x !== "");
  return (parts[parts.length - 1] ?? "").toLowerCase();
}
export function buildSlugIndex(allSlugs: string[]): Map<string, string> {
  const idx = new Map<string, string>();
  for (const slug of allSlugs) {
    const key = lastSegment(slug);
    if (key && !idx.has(key)) idx.set(key, slug);
  }
  return idx;
}

// ---------------------------------------------------------------------------
// Public: render-ready markers + the type legend for one map block.
// ---------------------------------------------------------------------------

export function buildMarkerData(
  contentDir: string,
  mapId: string,
  transform: MarkerTransform,
  currentSlug: string,
  slugIndex: Map<string, string>,
): MarkerData {
  const colors = buildColorMap(contentDir);
  const markers: RenderMarker[] = [];

  for (const m of rawMarkersForMap(contentDir, mapId)) {
    if (
      !Array.isArray(m.loc) ||
      typeof m.loc[0] !== "number" ||
      typeof m.loc[1] !== "number"
    ) {
      continue;
    }
    const title = (m.description ?? "").toString().trim();
    if (!title && !m.link) continue; // skip blank markers (stray clicks)

    const type = (m.type ?? "default").toString() || "default";
    const [lat, lng] = applyTransform(m.loc as [number, number], transform);
    const marker: RenderMarker = {
      lat,
      lng,
      title,
      type,
      color: colors.get(type) ?? FALLBACK_COLOR,
    };
    if (m.link) {
      const targetSlug = slugIndex.get(m.link.toLowerCase());
      if (targetSlug) marker.href = resolveRelative(currentSlug, targetSlug);
    }
    markers.push(marker);
  }

  // Legend: the types actually present, with counts. "default" -> Uncategorised, sorted last.
  const seen = new Map<string, { color: string; count: number }>();
  for (const mk of markers) {
    const e = seen.get(mk.type) ?? { color: mk.color, count: 0 };
    e.count += 1;
    seen.set(mk.type, e);
  }
  const types: MarkerTypeInfo[] = [...seen.entries()].map(([type, e]) => ({
    type,
    label: type === "default" ? "Uncategorised" : type,
    color: e.color,
    count: e.count,
  }));
  types.sort((a, b) => {
    if (a.type === "default") return 1;
    if (b.type === "default") return -1;
    return a.label.localeCompare(b.label);
  });

  return { markers, types };
}
