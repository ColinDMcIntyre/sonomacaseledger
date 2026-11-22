# Renderpeople character upgrade — private prototype status (November 22, 2026)

## Decision and source inventory

Eric is the first candidate for the museum visitor because his shirt, tie, and dark vest fit the editorial-gallery setting. The site owner supplied `renderpeople_free_rigged_people_FBX.zip`, which contains three nested FBX asset sets:

| Candidate | Source zip inside owner-supplied archive | Model and textures |
| --- | --- | --- |
| Eric (selected) | `rp_eric_rigged_001_FBX.zip` (~45 MB nested ZIP) | Rigged FBX, diffuse/gloss/normal/two masks |
| Carla | `rp_carla_rigged_001_FBX.zip` | Rigged FBX, diffuse/gloss/normal/two masks |
| Claudia | `rp_claudia_rigged_002_FBX.zip` | Rigged FBX, diffuse/gloss/normal/two masks |

The private importer successfully extracted Eric's `rp_eric_rigged_001_yup_t.fbx` and prepared five reduced 1024×1024 JPG textures. A Blender-based local GLB export script exists as a private downloadable preparation kit for the owner, but the conversion has **not been run or validated in Blender** here. These source archives did not establish that the models have usable named Idle and Walk animation clips. Rigged T-pose geometry must not be presented as a finished walking character.

## Important licensing restriction

Renderpeople's 2024 [General Terms and Conditions](https://renderpeople.com/general-terms-and-conditions/) apply to its free data under §2.5. Section 4.1 permits real-time rendering in games and interactive applications, but §4.3(b) separately prohibits making model files directly accessible or easily downloadable/extractable by third parties. Rendering a direct `.glb` URL from a public GitHub Pages repository would expose the original or converted model as a freely downloadable asset.

**Do not commit Renderpeople's FBX, GLB, textures, or source ZIP to this public repository.** The root `.gitignore` blocks the common filenames, and a repository test checks for unintended public-asset inclusion. Neither the current `museum/assets/manifest.json` nor `museum/character.js` should be changed to claim that a proprietary model is installed.

Before public deployment, obtain specific written authorization from Renderpeople for the intended browser delivery method. Contact: info@renderpeople.com. Alternative: use a photorealistic character with a public-web-compatible license that permits direct delivery of the compiled 3D asset.

## Private in-browser museum preview (implemented; live playback untested)

A developer-only preview loader is now present at:

https://colindmcintyre.github.io/sonomacaseledger/museum/?private-character=1

Open the page in a browser with WebGL support. A **Preview private visitor** button appears at the top. Select the extracted **`rp_eric_rigged_001_yup_t.fbx`** and JPG textures from the `tex/` directory in one file-picker selection. The browser loads them with Three.js's FBXLoader, replaces the local player's visible model, and applies an experimental, procedurally driven arm/leg walk cycle using the verified `upperarm_l/r`, `upperleg_l/r`, `lowerleg_l/r` bones. The locally loaded files are **not uploaded, persisted, or shared with other site visitors**. A file-picker-only preview avoids making the proprietary source a publicly downloadable website asset.

Implementation: `museum/private-renderpeople-preview.js` (loaded only with the explicit query parameter), `museum/character.js` (preview model installation and approximate gait), `museum/museum.js` (lazy opt-in wiring).

**Limitations:** This preview has been source-checked but has **not undergone an interactive visual test with the owner's actual FBX in a running browser**. The arm pose, materials, scaling, face details, walk cycle and mobile performance may require adjustment. It is not a production replacement, a proper retargeted skeletal walk animation, or public distribution permission.

## Autonomous public-facing upgrade path (November 22)

As the owner cannot reliably open or test the previous local-file FBX preview, the museum no longer depends on that manual step for public improvement. Eric remains a private licensed prototype.

For a public-facing detailed character, the repository now includes a source-limited import workflow for Innerscene's **CC0 Jordan** business-clothed rigged human. Innerscene's model carries seven animation clips, including idle and walking: https://www.innerscene.com/tools/library/3d-parts/locomotion-collection-jordan-3d-person-animated-911f1584 .

- `scripts/import_cc0_detailed_visitor.py`: trusted-source HTTPS download and 30 MB cap.
- `scripts/audit_public_cc0_visitor.py`: validates GLB 2.0, skinned mesh, materials/textures, named idle and walk clips, output size and compatibility with the current loader.
- `.github/workflows/import-cc0-visitor.yml`: automated 1K texture resize/WebP compression, size/rig verification, protected fallback checks, and publication of the CC0 binary and `character.highDetail` manifest entry **only after validation succeeds**.
- `museum/character.js`: swaps to high detail without interrupting play, keeping the old model if loading fails.
- `museum/museum.js`: HD control on mobile after successful import; delayed automatic upgrade only for roomy desktops without restricted connections.
- `tests/high-detail-visitor.test.mjs`: regression checks for all of the above.

**Current verified publication status:** The high-detail CC0 binary and the manifest entry were not yet present in the repository during this editing session. Therefore the current public character remains the existing visitor; the importer is a validated *deployment mechanism*, not proof of a live replacement. The JavaScript has had structural syntax checks, but the imported animated character has not been visually tested here. No Renderpeople binary was published.

## Live museum status

**The public museum still uses the existing CC0 Casual Walker visitor** and built-in procedural fallback. A visitor may explicitly load an FBX already on their own device in private preview mode; no Renderpeople assets have been published. The existing visitor is retained so the museum and its animation system continue to function.

## Remaining integration steps

1. Run Blender's private FBX→GLB import/export, inspect bone names, textures and mesh complexity.
2. Rig-retarget and bake separately licensed Walk and Idle clips so both are named and playable.
3. Measure compressed file size and 3D load/render performance on mobile.
4. Obtain permission for the exact deployment mechanism or switch to a compatible free human-model license.
5. After permission, update the source manifest and interactive visitor loader, keeping fallback behavior.
