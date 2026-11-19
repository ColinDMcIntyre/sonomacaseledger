# Doorway traversal, textured trim, and object variation

The invisible-door regression was traced to floor geometry and navigation being coupled. The previous anti-flicker pass removed overlapping corridor *floor meshes* but also removed their *walkable collision footprints*. Room floors each apply a 6.5 cm margin, leaving an invisible gap at all eight thresholds.

**Resolution:** Render the same non-overlapping corridor floor geometry as before. Restore every original hallway rectangle to the navigation footprints, independent of what is actually drawn. Cross-doorway `canMove` tests now cover every portal, rather than checking room centers on a coarse grid.

The architectural trim and skirting that appeared flat light brown now use the already-imported walnut PBR color, normal, roughness, ambient occlusion and height maps. Columns and rounded corner quoin stones remain limestone/plaster, with the separate plaster PBR normal and roughness maps. Stone and timber are deliberately not interchangeable.

To break up repeated assets, built-in wood geometry uses metre-scale UVs and unique seeded offsets, while a subtle world-space material shader changes color naturally across different pieces. Instanced corner stones have slight per-block tint variation. Imported glass cabinets and archive furniture retain their authored UVs; each instance gets only modest color, roughness and size variation, keeping the shared PBR textures intact.

Neither the existing stone floor material/texture nor the legal case records are changed. The actual appearance still requires browser verification after GitHub Pages deployment.
