# Museum realism pass — visual review checklist

This branch is intentionally not merged before visual review. The traditional archive, navigation geometry, case records, CC0 character selection and existing sun-shaft geometry are unchanged.

## Compare and measure

- Default museum URL: updated lighting, material variation, motion and beam dust.
- `?realism=0`: comparison with the previous lighting/material/motion settings, without the new dust.
- `?debug=1`: opt-in FPS, approximate frame-time, draw-call, triangle, geometry and texture counts.
- `?realism=0&debug=1`: comparison with diagnostics.
- FX disables ambient exhibit animation and dust. Reduced-motion preference disables new idle variations, head glances and dust.

## Changes

- Less hemisphere/fill/environment light; more local pendant light; no new lights or shadow passes.
- World-space macro, mid-scale and filtered fine-scale material variation; roughness varies independently. Original image maps, mortar and floor UV alignment are preserved. This does not yet eliminate all repeating albedo/normal-map features.
- Smoothed manual acceleration/braking and route arrival slowdown; measured displacement drives mixer blend and playback tempo. The initial nominal walking speed of 3 world units/s is a provisional tuning value, not calibrated motion-capture stride length.
- Compatible native idle variations with cooldown and no immediate repeat, plus bounded additive head glances when a supported head bone exists. Existing native animations, wrist correction and manual gestures remain.
- One shared particle draw call for subtle dust inside existing shafts, only when shafts are enabled. No change to the original shafts.

## Verify before release

1. Compare both modes from the same camera position in the nave, dark corridors and every gallery. Confirm labels and exhibits remain readable.
2. Check all material shader compilation in the browser console and compare stone, wood and floor near/far. Verify no obvious tiling seams or aliasing.
3. Test WASD, click-to-walk, path turns, walls, stopping, exhibit interactions, map, focus loss and all character fallbacks; verify that footsteps and movement agree. Calibrate nominal speed against the actual active rig if sliding persists.
4. Check native Ara and Jordan fallback bone names and available idle clips; confirm additive head motion does not disturb source animations.
5. Compare performance on mobile and desktop with the diagnostics overlay, including FX off and reduced motion. No minimum specs are established yet.

Run source regressions with `node --test tests/museum-realism.test.mjs`. The tests are not a live shader, animation, or browser benchmark.

## Next

Actual stride-length/foot-contact calibration, foot-locking IK, GTAO, localized shadows and room probes, quality presets/adaptive resolution, geometry batching and offline global illumination are separate subsequent passes. Do not claim those are already implemented.
