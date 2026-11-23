# 37 case-specific museum dioramas — November 2026

## Current implementation

The virtual cathedral now has a 3D contextual illustration for every one of the 37 case records. The visual catalog is in museum/case-dioramas.js; all 30 county and six federal cases, plus the separately added Constantine Petros record, have explicit case-slug recipes. The legal record in research/case-data.json and the individual HTML pages remains the source of truth.

Each exhibit is labeled ILLUSTRATIVE · NOT EVIDENCE. The accessible HTML case panel also describes the contextual object and repeats the disclaimer. Motifs are symbolic and deliberately generic where verified factual detail is limited. No actual victim property, checks, account numbers, insignia or branded employer facilities have been recreated. Constantine Petros's legal timeline distinguishes 2017 count outcomes from the 2020 Penal Code §1203.4 post-conviction relief and does not represent it as an acquittal.

## Optional locally imported CC0 models

The diorama catalog can use eight additional Poly Haven models, hosted within GitHub Pages and cached by the loader. If a model has not been imported, fails to load or is unavailable, its original Three.js geometry substitute remains visible. The import script is scripts/import_museum_assets.py and its GitHub Action is .github/workflows/import-museum-assets.yml. A source listing below is not proof that the downloadable file has been committed: check the local path in museum/assets/manifest.json.

| Role | Original source | License | Context |
| --- | --- | --- | --- |
| coveredCar | https://polyhaven.com/a/covered_car | CC0 1.0 | Classic-car restoration business |
| schoolDesk | https://polyhaven.com/a/SchoolDesk_01 | CC0 1.0 | School-program treasurer |
| notepads | https://polyhaven.com/a/office_notepads | CC0 1.0 | Claims and loan paperwork |
| binder | https://polyhaven.com/a/binder_notebook | CC0 1.0 | Trust and investment records |
| officeDesk | https://polyhaven.com/a/metal_office_desk | CC0 1.0 | Business/manager bookkeeping |
| stationery | https://polyhaven.com/a/stationery_supplies | CC0 1.0 | Administrative context |
| cashRegister | https://polyhaven.com/a/CashRegister_01 | CC0 1.0 | Revenue context |
| stapler | https://polyhaven.com/a/vintage_stapler | CC0 1.0 | Secondary office prop |

Poly Haven license and reuse: https://polyhaven.com/license . Models are artistic contextual illustrations and not items collected from these legal cases. They are fetched as official 1K glTF packages with companion textures; no third-party asset API is requested by a visitor's browser.

The current locally imported animated visitor is Casual Walker v1 LOD0 (CC0; https://tevy.dev/models/casual-walker). Earlier Gobkit/remote-visitor references in the historical build notes below are superseded.

## Realistic guide upgrade — rights and deployment

The user supplied Renderpeople Eric, Carla, and Claudia FBX archives for character work. **Those models are not redistributed through this public website.** Renderpeople's [terms](https://renderpeople.com/general-terms-and-conditions/) grant render-use rights but restrict directly exposing individual model files. A local-only Eric FBX preview exists for development; it is not the installed public guide.

For a compatible public-facing upgrade, this repository includes a guarded importer for **Jordan — Locomotion Collection**, an original business-clothed, skinned, animated character by Innerscene derived from MakeHuman/MPFB CC0 assets:
- Source and rights: https://www.innerscene.com/tools/library/3d-parts/locomotion-collection-jordan-3d-person-animated-911f1584 (CC0 1.0).
- Rig: multiple named clips including idle, relaxed walk, brisk walk, and others (as described by the source).
- Original model size: approximately 23.3 MB. The import workflow attempts 1024-pixel textures and WebP compression and will **not publish a file** if rigging/animations, file size, or decoder requirements fail validation.
- Output (only after successful import): `museum/assets/characters/realistic_guide_cc0.glb`; manifest `character.highDetail` must point to it with an explicit CC0 source.
- Loading: the existing lightweight character appears immediately. After the museum's first frame, visitors on normal network connections (desktop or mobile) progressively load the high-detail model; Data Saver and slow connections can load it only through an optional **HD** control.
- Fallback: failure to download, load, or validate leaves the existing CC0 Casual Walker/procedural visitor working.

**Publication status must be checked against the repository tree and the manifest.** The existence of importer scripts does not mean the large high-detail binary was successfully downloaded, installed, visually tested, or released. Do not describe the high-detail visitor as live until those checks pass.



## Technical approach

- Case displays use original transparent vitrines, not an opaque imported display cabinet that might conceal the contextual object.
- The asset-library loader normalizes any imported model to fit the vitrine. It caches source models and uses procedural fallback objects on failure.
- The case modal and 3D objects use the same case-by-slug art catalog, while all court outcomes continue to come from the existing research source.
- The import workflow can run on relevant script changes or by manual dispatch. Its source metadata is kept in the manifest.

---

## Superseded historical build notes

Older text below describes the earlier phases and may contain outdated camera geometry, character provenance and imported-asset status. Current source code and manifest take precedence.

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

## Playtest graphics and controls update (November 2026)

- **Controls:** WASD and arrow keys move relative to the camera; E interacts with a nearby exhibit; mouse/touch point-and-click still works. Manual movement cancels an automatic path. Nearby exhibits show a clickable E prompt.
- **Camera:** The initial view is closer and lower. Visitors can toggle between Close view and Overview, rotate by dragging, and zoom using wheel/pinch/buttons.
- **Character:** The Gobkit character and procedural fallback were scaled up. The fallback now has more detailed clothing, face features, shoes, and a soft alpha contact shadow. The existing CC0 pack remains low-poly, not photorealistic.
- **Materials:** `materials.js` generates physically based walnut, brass, marble, archival paper, stained-glass-like material, and carpet. The renderer uses an indoor reflection environment and improved lighting and shadows on desktop. Panels, columns, display cases and lighting were refined.
- **Verified free image textures:** Poly Haven [Marble 01](https://polyhaven.com/a/marble_01) and [Marble Tiles](https://polyhaven.com/a/marble_tiles) (CC0). The Three.js loader requests 1K JPG diffuse maps from `dl.polyhaven.org`; if the request fails or is blocked, procedural fallback textures remain visible. This approach doesn't require the user to buy or download textures manually.

**Realism limit:** This is a higher-quality PBR pass on procedural architecture. It is **not a photorealistic museum yet**. That would require replacing the stylized character and simplified exhibit meshes with detailed scanned or professionally modeled assets, using full normal/roughness texture sets, and testing shadow and rendering performance on actual devices.

## November 2026 vaulted architecture update

- Rooms now use **tall architectural walls** and **cutaway barrel-vault ribs**. Curved plaster eaves remain visible near the walls; no opaque roof slab covers the playable floor. The camera-facing upper walls and eaves are hidden automatically, including when orbiting.
- All exhibits are built from **rectangular marble, walnut, glass and brass vitrines** instead of round game-like pedestals. Informational exhibits use museum-style desks, lecterns and framed records.
- The heavily mottled external marble tile texture has been removed. The new **subtle cream marble texture is self-contained procedural artwork** with restrained veins and low-contrast grout.
- The starting camera is closer and lower, with the Overview toggle retained. The visitor is larger. Performance and framing still need live playtesting across desktop and mobile.
- The case directory is collapsed by default; **F** opens search, or use the top Cases & search button. No source documents or case records were changed.

## Third-person rebuild — November 2026

- The orthographic/isometric camera was replaced with a **perspective third-person follow camera** (FOV 62°, or 68° on narrow phones). It follows the visitor from behind at an adjustable ~10.7-unit default distance, aims slightly ahead, supports horizontal and vertical drag and stops before solid walls. Follow/Wide changes the camera distance.
- Architecture was completely rebuilt using full-height stone galleries, real doorway gaps, barrel-vault plaster ceilings above the camera, warm pendant lighting, and walnut-trimmed archival display furniture. The building is no longer a cutaway/isometric diorama.
- The Gobkit CC0 GLB loader previously hid the procedural model even when no usable Walk/Idle clips were found. The new loader **requires both recognizable animations** before enabling the external model. Otherwise the built-in articulated visitor rig visibly walks and idles. It reports the actual animation source, not a misleading generic "animated GLB" status.
- No source data, case summaries or court outcomes were changed. The source-backed HTML articles remain the primary accessible reading experience.
- This is a large art and camera redesign, not a claim that procedural models are photorealistic. Live browser playtesting is needed to validate proportions, animation quality and hardware performance.
