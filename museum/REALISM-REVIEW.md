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

## Second pass: GTAO, room probes, and stride / foot contact

- GTAO uses the pinned Three.js addon, a bounded render target (DPR <= 1.15 and longest side <= 1600), modest sample counts and an output color pass. Transparent surfaces and interaction cylinders are excluded from the AO geometry pass, not the beauty pass. Unsupported hardware or an exception falls back to direct rendering. Auto mode disables GTAO after sustained low frame rates.
- Captures a 128-pixel cube reflection lazily once per visited gallery or vestibule, after the PBR, prop and HDR loads settle. Filters with PMREM and applies to that room's existing floor material only. The character and daylight planes are excluded from captures; their visibility is restored. Other materials retain the original environment. No continuous cube capture, box projection or planar reflections.
- Samples 48 poses on a separate copy of the active walking rig. Identified left/right ankle tracks provide a stance-speed estimate in world units and contact phase flags. Incompatible or implausible samples fall back to the earlier 3-unit nominal speed. Manual and routed movement use the calibrated preferred speed. Compatible two-joint chains receive bounded CCD stance correction; it releases on sharp turns, gestures, excessive drift or insufficient blend. Corrections are reset before the next mixer update. This is not validated against the actual deployed Ara/Jordan assets yet.

### Additional comparison switches

- `?quality=low`: no GTAO or room probes, render DPR <= 1.
- `?quality=high`: enables enhanced rendering even on narrow screens, where hardware permits; does not automatically disable GTAO for low frame rates.
- Default/auto: enhanced rendering on desktop-width viewports with automatic GTAO fallback.
- `?ao=0`, `?reflections=0`, `?footik=0`: independent disable switches; disabling foot IK retains stride measurement.
- `?debug=1`: also reports active pipeline, probe count and whether stride calibration and compatible IK are active.
- `?realism=0`: comparison also disables new AO, probes and stride calibration.

### Review additions

Compare the nave and side galleries with GTAO on/off. Confirm stained glass, rays, contact decals and text remain visible and no phantom AO silhouettes appear around transparent display cases. Pause in each gallery until a probe is captured, then check the floor for unnatural brightness, projection errors or capture hitches. Inspect debug stride status and observe the feet in a side-on view during straight walking, turns, starts and stops. Test both detailed and fallback rigs. Verify there are no WebGL errors and compare desktop/mobile FPS before choosing hardware requirements.

Six source/pure-math regression checks passed when evaluated against the branch in JavaScript. The tests include synthetic stance-speed recovery and unsupported-track fallback; this does not establish actual character rig compatibility or WebGL rendering quality.

## Next

Live visual review, native-rig tuning if needed, localized shadows, broader reflection coverage, adaptive resolution, geometry batching, true non-repeating material sampling and offline global illumination. Do not claim these are already implemented.
