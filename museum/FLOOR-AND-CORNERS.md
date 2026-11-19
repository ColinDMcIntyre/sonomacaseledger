# Floor and stone architecture cleanup

## Why the floor flickered
The seven corridor floor planes were rendered directly over the eight room floors at Y=0. GPU depth precision cannot choose a unique front surface when two surfaces are coplanar. This is z-fighting; changing material roughness or adding an offset cannot reliably fix it.

`museum/floor-geometry.js` now subtracts all room footprints (and earlier corridor fragments) from the hallway floor pieces before drawing them. The seven original corridors reduce to one actual exposed bridge between the vestibule and records library. The rest is already covered by room floors. The completed floor uses exactly one visible surface per position.

## Making the existing stone floor less repetitive
The approved PBR color, marble finish and floor size remain the same. Per-room UV phase offsets are applied consistently to albedo, normal and roughness maps. An inexpensive shader adds low-frequency continuous world-space patina, making repeated texture tiles harder to pick out. The shader intentionally keeps brightness variation subtle.

## Improving masonry
Corners now have repeated beveled quoin blocks with visible joints. A narrow stone skirting and masonry stringcourse follow solid wall segments, stopping at door apertures. Reusing an instanced 3D corner detail avoids hundreds of individual draw calls.

The wall shader also adds restrained world-space weathering, especially near the base. It works alongside the existing real sandstone PBR normal, roughness, ambient occlusion and height maps.

## Tradeoffs
The new floor shader affects color variation; it is not screen-space ambient occlusion (SSAO) or full real-time global illumination, which are substantially more expensive on mobile. Actual floor mesh overlaps are removed instead of disguised.

Run `node --test tests/museum-*.test.mjs` after updates. A browser check is still required for aesthetic quality, mobile frame rate and any remaining stitching at the architecture joints.
