# Screenshot-driven camera and masonry correction

The November 18 screenshot revealed two separate faults:
1. Renderer.setSize(..., false) sized the WebGL drawing buffer using devicePixelRatio without explicitly updating its displayed CSS width. On high-DPI desktops, the element could be larger than the visible fixed viewport and cropped. Rendering now has explicit width/height and the correct CSS logical dimensions (canvas uses 100% viewport). The camera follows the actual visitor position immediately instead of a lagging target.
2. The animated imported visitor was centered on loading but the frame update zeroed its model X/Z translation. The measured local origin is now preserved through animation updates, preventing the model from drifting away from the tracked root.

The previous Poly Haven beige_wall_001 surface was nearly featureless in the screenshot. Its wall-only replacement is a visible, coursed warm-sandstone asset: https://polyhaven.com/a/sandstone_blocks_04 (CC0). The import script writes unique filenames containing sandstone_blocks_04 so cached beige images cannot be reused. While the new assets are being deployed, the procedural sandstone fallback also renders block joints. Columns remain smoother cut stone.

The floor and connected doorways have not been redesigned or restyled.

Verification: Run node --test tests/museum-*.test.mjs. Review desktop and mobile after GitHub Pages and the asset import Action finish. The browser should show the visitor near horizontal center and distinct sandstone joints in the masonry walls.
