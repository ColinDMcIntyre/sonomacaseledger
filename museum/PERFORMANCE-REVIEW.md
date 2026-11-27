# Museum performance pass

## Movement
Hold either Shift key with WASD or the arrow keys to sprint. Walking remains stride-calibrated; sprint speed is bounded to 4.8–6.8 world units/second. Native run/jog clips are used when compatible; otherwise the walking cadence increases. Foot-lock IK is suspended during faster movement. Click-to-walk routes retain walking speed.

## Startup
Architecture is constructed in yielding stages; PBR maps for each role download in parallel and are installed together. Only models referenced by the museum are requested. Case diorama construction yields between exhibits. The initial studio PMREM is generated only if the HDR is unavailable. All selected character, prop, texture and HDR loads settle before the first interactive frame. Selected asset failures keep the existing fallback appearance. Texture upload, asynchronous shader compilation, a frozen shadow render and an initial postprocessing render are performed while the loading screen is present. The first total load may still be longer on slow hardware/networks; driver work can still block individual frames.

## Reflections and rendering
Default enhanced mode prewarms one actual nave reflection and shares it across floor materials at the same 128-pixel cube resolution. This trades exact room-specific reflection contents for a much smaller startup workload, consistent appearance and no room-entry reflection pop. Opt in to the previous room-specific quality with `?reflections=local`, which prewarms all rooms before play and takes longer. `?reflections=0` uses the HDR environment alone. Cube faces yield separately; no cube renders are triggered by movement. Original lighting, material resolution, sun rays and structural geometry are preserved.

Static opaque exhibit meshes with compatible materials, vertex attributes, and shadow flags can be merged locally. Animated, transparent, interactive, mirrored and custom-rendered meshes are excluded. Camera raycasts use cached static bounds and repeat only when the ray changes. Exhibit proximity uses cached positions at 10 Hz; E still checks immediately. GTAO transparency exclusions are cached, and auto mode reduces AO resolution before reducing the main render resolution or falling back to direct rendering. High mode leaves the requested quality unchanged. Actual FPS is device-specific.

## Review
- `?debug=1`: FPS, frame times, draw calls, resolution, AO scale, probe mode/count, stride, batch savings and prewarmed texture count.
- `?batch=0`: compare against unbatched static exhibits.
- `?quality=high&reflections=local`: full local reflections and non-adaptive high quality.
- `?quality=low`: simpler rendering fallback.
- `?ao=0`: isolate GTAO.
- `?surface=0`: compare surface polish.

Run `node --test tests/museum-performance.test.mjs tests/museum-realism.test.mjs`. Eleven source/math tests passed against the branch in a JavaScript evaluator; twelve modules parsed. Full Node/CI results, browser/WebGL verification and measured performance improvements require separate verification. Test a cold load, keyboard sprint/release, focus loss, doorway collision, automatic routes, texture appearance before crossing doorways, case labels and transparent glass, and compare identical paths with the diagnostics overlay. The more advanced surface-polish experiment remains separate.
