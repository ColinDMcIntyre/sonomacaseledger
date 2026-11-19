# Cathedral Museum rebuild — architecture, assets and verification

## Building and game design
The seven case-wing IDs have been preserved, but the box-room layout was replaced with the basilica plan defined in `layout.js`: a 20 × 60 m central nave, four 22 × 22 m side chapels, a 20 × 24 m federal apse, a rear vestibule and a separate wood-rich records library.

Portal and corridor definitions are shared by the walkable floor and the architectural openings, so the scene no longer needs to conceal walls from the camera. The default visitor spawns in the vestibule, faces the nave and uses a centered third-person follow camera. Case selection, search, legal-record links and interactive collision objects retain their previous data.

## Architecture
`architecture.js` makes physically thick extruded walls with arched doorway and window apertures, masonry piers, walnut paneling, cornices, ribbed barrel vaults and a continuous clear nave aisle. `stained-glass.js` generates original secular stained-glass patterns and glass-shaped panes in actual wall openings. Floor color patterns are subtle approximate light pools, not physically accurate projection.

## Real PBR and HDR assets
`materials.js` asynchronously loads official Poly Haven 1K diffuse, OpenGL normal and roughness textures for:
- [Beige Wall 001](https://polyhaven.com/a/beige_wall_001) — warm limestone/plaster interior treatment
- [Tiled Floor 001](https://polyhaven.com/a/tiled_floor_001) — clean indoor stone floor
- [Walnut Veneer](https://polyhaven.com/a/walnut_veneer) — paneling, desks and cabinets
- [White Plaster 02](https://polyhaven.com/a/white_plaster_02) — vaulted plaster ceilings

`lighting.js` loads the free [Church Meeting Room HDRI](https://polyhaven.com/a/church_meeting_room), uses physically based environment reflections, warm pendants and gentle daylight. HDRI is used for lighting only, never as a photorealistic panorama background.

These assets are CC0 1.0. The browser tries locally imported files first and official static Poly Haven CDN paths second; stable procedural materials and a studio environment are used if unavailable. The browser does not invoke Poly Haven's authenticated/identified API.

## Visitor
The selected replacement is [Casual Walker](https://tevy.dev/models/casual-walker), pinned 2026-v1 CC0, 27,997 triangles, four named animations including idle and walk. The importer validates the glTF 2.0 binary header. The current character module already requires separate idle/walk clips before swapping in a GLB.

## Asset import
`scripts/import_cathedral_assets.py` downloads and validates the CC0 assets, writes `museum/assets/cathedral/materials.json`, saves the 1K HDR and updates `museum/assets/manifest.json` with a local CC0 visitor. `.github/workflows/import-cathedral-assets.yml` runs once when the workflow/script is pushed, and can be triggered manually under GitHub Actions. The action requires repository contents write permission. If automatic import fails, check workflow logs before claiming that the real assets are installed.

Existing Poly Haven case cabinets, historic storage and seating remain installed through `asset-library.js`. The original case exhibit geometry is a fallback if a file cannot load.

## Validation checklist
1. Start in the vestibule and walk north into the nave without passing through stone.
2. Open and revisit all four chapels, the federal apse and the records library.
3. Verify the gallery map corresponds to the basilica layout and all 37 case links still open.
4. Verify stained-glass windows are placed within actual apertures and the high vaulted ceiling is visible from below.
5. Check local CC0 material and visitor imports in network inspector and the GitHub Actions log.
6. Test camera framing and movement on desktop and mobile.
7. Measure actual frame rates; static syntax checks alone do not constitute a browser playtest.

The historic legal records and case summaries have not been rewritten for this visual rebuild.
