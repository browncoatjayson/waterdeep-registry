# obsidian-leaflet-tiles

A **Quartz v5** transformer plugin that renders [Obsidian Leaflet](https://github.com/javalent/obsidian-leaflet)
` ```leaflet ` code blocks as live, interactive **tiled** maps on your published site —
so the same note that shows a map in Obsidian shows one on the website.

This is **Phase 1: the map renders**. Markers/pins that link to notes are Phase 2 (not yet built).

## What it supports (Phase 1)

It reads the same ` ```leaflet ` block you already use in Obsidian. Currently honored keys:

| Key | Behavior |
|---|---|
| `tileServer` | Tile URL template, e.g. `.../{z}/{x}/{-y}.png`. `{-y}` = inverted-Y (handled). |
| `crs: simple` | Flat pixel map (the only mode supported now). |
| `bounds` / `maxBounds` | `[[x0,y0],[x1,y1]]` — the second corner gives the tile-grid size at max zoom. |
| `minZoom` `maxZoom` `defaultZoom` `zoomDelta` | Zoom limits, starting zoom, and zoom granularity. |
| `height` `width` | Map container size (e.g. `900px`, `95%`). |
| `noWrap` | Stops the map repeating. Defaults on. |

Any other keys (`unit`, `scale`, markers, etc.) are **ignored, not errors** — the map still renders.
Real-world/OpenStreetMap maps, single-image maps, and markers are intentionally out of scope here.

## How tile-Y inversion works (why this plugin exists)

Obsidian's tile pyramids are often **not** powers of two, so Leaflet's built-in `{-y}` / TMS
handling (which assumes `2^zoom` tiles) requests tiles that don't exist and fails. This plugin
computes the file's Y index against the **real per-zoom tile count** derived from `bounds`. This
was verified empirically against the Waterdeep map before any plugin code was written.

## Install (local development)

1. Put this folder somewhere in your Quartz repo, e.g. `./quartz-leaflet-plugin/obsidian-leaflet-tiles`.
2. Add it to `quartz.config.yaml` under `plugins:` (a local path source — no GitHub needed):

   ```yaml
     - source: ./quartz-leaflet-plugin/obsidian-leaflet-tiles
       enabled: true
       order: 35
   ```

3. Build the plugin (Quartz does NOT auto-build *local* plugins, only ones it clones from GitHub):

   ```bash
   cd quartz-leaflet-plugin/obsidian-leaflet-tiles
   npm install
   npm run build          # produces dist/index.js — what Quartz loads
   # or: npm run dev       # tsup watch mode; auto-rebuilds dist/ on changes
   ```

4. Run `npx quartz build --serve` from the repo root.

> Note: once published to GitHub and referenced as `github:owner/repo`, Quartz *will* auto-install
> and build it — the manual build is only needed for the local-path dev workflow.

## Options

| Option | Default | Description |
|---|---|---|
| `leafletCss` | unpkg Leaflet 1.9.4 CSS | Override to self-host or pin a different version. |
| `leafletJs` | unpkg Leaflet 1.9.4 JS | Override to self-host or pin a different version. |

## Status / roadmap

- **Phase 1 (this):** render tiled `crs: simple` maps from ` ```leaflet ` blocks.
- **Phase 2:** markers from note frontmatter, pins linking to property notes, popups.
- **Phase 3:** see the project plan — pursued only on demand.

## License

MIT.
