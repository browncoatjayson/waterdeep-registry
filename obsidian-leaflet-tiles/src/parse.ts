import { parse as parseYaml } from "yaml";
import type { LeafletTileConfig } from "./types";

/**
 * Parse the YAML body of a ```leaflet code block into a config object.
 * Returns null if the body can't be parsed as a YAML mapping — in that case
 * the caller leaves the original code block untouched rather than erroring.
 */
export function parseLeafletBlock(body: string): LeafletTileConfig | null {
  let data: unknown;
  try {
    data = parseYaml(body);
  } catch {
    return null;
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  return data as LeafletTileConfig;
}

/** Normalize a height/width value to a CSS dimension string. */
export function toCssSize(value: unknown, fallback: string): string {
  if (typeof value === "number" && Number.isFinite(value)) return `${value}px`;
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  return fallback;
}
