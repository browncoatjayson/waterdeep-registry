import fs from "fs";
import path from "path";
import type { MarkerTransform, RenderMarker } from "./types";

// ---------------------------------------------------------------------------
// Reading obsidian-leaflet's marker data (its plugin data.json), at build time.
// We parse defensively: any shape we don't recognise yields no markers, never a
// crash. The file must be committed for CI to see it (it lives under .obsidian).
// ---------------------------------------------------------------------------

interface RawMarker {
  loc?: [number, number];
  description?: string | null;
  link?: string | null;
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

// ---------------------------------------------------------------------------
// Coordinate transform: geographic (lat/lng) -> our CRS.Simple map coords.
// ---------------------------------------------------------------------------

function mercatorY(lat: number): number {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}

function applyTransform(
  loc: [number, number],
  t: MarkerTransform,
): [number, number] {
  const lat = loc[0];
  const lng = loc[1];
  const py = t.mode === "mercator" ? mercatorY(lat) : lat;
  const ourLng = t.A * lng + t.B * py + t.C;
  const ourLat = t.D * lng + t.E * py + t.F;
  return [ourLat, ourLng]; // Leaflet order: [lat, lng]
}

// ---------------------------------------------------------------------------
// Link resolution. obsidian-leaflet stores a marker's link as a note name; we
// resolve it to that note's published URL, relative to the current page, using
// the same logic as Quartz's own internal links (replicated from
// @quartz-community/utils so links behave identically to every other link).
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
  return args
    .filter((s) => s.length > 0)
    .join("/")
    .replace(/\/+/g, "/");
}
function resolveRelative(current: string, target: string): string {
  return joinSegments(pathToRoot(current), simplifySlug(target));
}

/** basename of a slug, lowercased (for case-tolerant link matching). */
function lastSegment(slug: string): string {
  const parts = slug.split("/").filter((x) => x !== "");
  return (parts[parts.length - 1] ?? "").toLowerCase();
}

/** Map a note name (basename) -> its full slug. */
export function buildSlugIndex(allSlugs: string[]): Map<string, string> {
  const idx = new Map<string, string>();
  for (const slug of allSlugs) {
    const key = lastSegment(slug);
    if (key && !idx.has(key)) idx.set(key, slug);
  }
  return idx;
}

// ---------------------------------------------------------------------------
// Public: build render-ready markers for one map block.
// ---------------------------------------------------------------------------

export function buildMarkers(
  contentDir: string,
  mapId: string,
  transform: MarkerTransform,
  currentSlug: string,
  slugIndex: Map<string, string>,
): RenderMarker[] {
  const out: RenderMarker[] = [];
  for (const m of rawMarkersForMap(contentDir, mapId)) {
    if (
      !Array.isArray(m.loc) ||
      typeof m.loc[0] !== "number" ||
      typeof m.loc[1] !== "number"
    ) {
      continue; // skip markers without valid coordinates
    }
    const [lat, lng] = applyTransform(m.loc as [number, number], transform);
    const marker: RenderMarker = {
      lat,
      lng,
      title: (m.description ?? "").toString(),
    };
    if (m.link) {
      const targetSlug = slugIndex.get(m.link.toLowerCase());
      if (targetSlug) marker.href = resolveRelative(currentSlug, targetSlug);
    }
    out.push(marker);
  }
  return out;
}
