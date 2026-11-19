# Sonoma Case Ledger — 3D Museum Asset & Animation Plan

## Implemented in phases 1–3

- **Three.js v0.180.0** loaded as an ES module from jsDelivr. Three.js is MIT licensed. The site is a static GitHub Pages app, with no server or paid service required.
- **Museum rooms, corridors, walls, flooring, columns, brass trim, pedestals, exhibit cases, paper models, portals, clock sculpture, glowing rings and signs** are generated directly in `museum/world.js`. All geometry and exhibit animations are original in-source code. This makes the first version editable without any downloadable architectural model.
- **CC0 animated visitor:** Gobkit Free Character Pack Vol. 1, `OfficeLady.glb`. Source: https://gobkit.itch.io/gobkit-free-character-pack-vol-1 and direct file: https://gobkit.com/freebies/human001/OfficeLady.glb . Verified against the free-asset manifest at https://gobkit.com/api/free . This is an external URL loaded by the browser; no binary model was copied into the repository. The Gobkit pack includes named **Idle** and **Walk** clips. If the source cannot be fetched, a procedural 3D visitor with locally animated arms and legs is rendered instead.
- **Case data:** the museum uses the existing local `research/case-data.json` archive with 30 additional county records, six federal records and the existing Constantine Petros case page. The 3D exhibit is a viewing interface, not the legal source of truth. Each case links to its complete HTML page.

## Free additions considered but not imported yet

These are **options**, not assets already integrated:

1. **Quaternius Universal Animation Library (Standard)** — https://quaternius.itch.io/universal-animation-library — CC0, more animations for future NPC or visitor interactions. Not needed for simple Idle/Walk and not yet rigged or retargeted in this app.
2. **Kenney Furniture Kit** — https://kenney.nl/assets/furniture-kit — CC0, additional tables, shelves and seating. Existing museum furniture is currently procedural.
3. **Poly Haven** — https://polyhaven.com/textures — CC0, high-resolution PBR wood, marble and stone textures. Not used in the initial prototype because low-weight procedural materials load faster.

## Modular architecture

```
museum/
  index.html       # HTML HUD, accessible panels, navigation and import map
  museum.css       # Layout, archive overlay and responsive controls
  world.js         # ROOM_DEFS + connected corridors + reusable exhibit bases
  character.js     # CC0 visitor loader + native-geometry fallback + Idle/Walk
  museum.js        # Archive data binding, A* navigation, event handling, search
  ASSET-CREDITS.md # This document
```

**Adding a room:** add a configuration to `ROOM_DEFS` in `world.js`, add the connecting floor to `HALLWAYS`, and then assign records to that room in `galleryFor` in `museum.js`. The reusable pedestal and information-panel code does not change.

**Adding an exhibit type:** extend `addExhibit()` in `world.js` and `openExhibit()` in `museum.js`, keeping any record summary in the HTML dialog for accessibility.

**Navigation:** mouse or touch tap-floor walking, raycast interactive pedestals, drag camera orbit, mouse wheel/pinch zoom, smooth isometric follow camera and an A* pathfinder. Keyboard-independent; the directory supports standard keyboard focus.

## Content and court-record safeguards

The museum provides no trophy or guilt-based ranking. It keeps the county and federal wings separate, explicitly distinguishes source verification, avoids claims about actual prison time served, and identifies Penal Code §1203.4 as post-conviction relief rather than acquittal. The developer's relationship to Constantine Petros's personal website is disclosed.

## Known phase-4 items — deferred pending playtesting

Lighting and performance tuning, shadows, baked PBR textures, sound effects, advanced visitor animation blending, optimization of touch gestures, accessibility audit, additional furnishing and custom art. These were deliberately not represented as completed.
