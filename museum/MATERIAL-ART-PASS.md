# Cathedral Museum material and relief pass

Structural masonry now uses physically sized UVs instead of stretching a texture over a scaled unit cube. Its large stone faces are subdivided into ~0.56 m patches and use a very shallow grayscale displacement map. Height moves at most 6 mm outward/inward, so walls, doorway boundaries and collisions remain unchanged.

Surfaces:
- Limestone: imported Poly Haven base color, normal, roughness, optional AO and height. Procedural depth fallback if a source height map is unavailable.
- Walnut: local PBR color, normal and roughness, optional height-derived bump, consistent grain scale on panels.
- Vault: tiled white-plaster PBR maps with restrained normal strength. The vaulted roof mesh is not displaced.
- Metals: brushed brass, dark iron and honed trim with distinct metalness and fine roughness.
- Stained glass: physically based colored glazing, modest reflection and emissive intensity, with existing leadwork geometry.
- Archival paper: fine aged-paper fibers instead of a blank flat material.
- Floor: exactly the previously approved geometry, color, finish and tiling. The new importer deliberately keeps the existing floor image files.

Performance: wall and trim textures are shared on the GPU across segments; mesh UVs carry the tile scale. Displacement runs only on the broad wall faces, while the narrow caps remain flat to prevent edge cracking. Physical collisions use the original undisplaced geometry.

Assets: scripts/import_cathedral_assets.py requests extra ambient-occlusion and height maps when the official Poly Haven API provides them. Existing local textures are retained. The GitHub Actions workflow runs the importer when the script changes.

Limitations: a browser playtest is still needed to judge the appearance and mobile frame rate. Subtle shader displacement is surface relief, not completely sculpted stonework. The automated tests verify that the floor settings, PBR materials and working entrances remain intact.
