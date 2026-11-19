# 3D asset replacement plan for Sonoma Case Ledger

The museum now supports local glTF assets without changing its case data, navigation, collision or reading experience. The model installer is ready; the actual art files are **not installed yet**.

## Verified free models (Poly Haven, CC0)

| Role | Model | Link |
| --- | --- | --- |
| Case display | Vintage Cabinet 01 | https://polyhaven.com/a/vintage_cabinet_01 |
| Directory desk | Classic Console 01 | https://polyhaven.com/a/ClassicConsole_01 |
| Visitor seating | Arm Chair 01 | https://polyhaven.com/a/ArmChair_01 |
| Library storage | Gothic Cabinet 01 | https://polyhaven.com/a/GothicCabinet_01 |
| Optional extra | Wooden Chair 01 | https://polyhaven.com/a/WoodenChair_01 |

Official API documentation: https://polyhaven.com/our-api . All four selected models use Poly Haven's CC0 license. The importer uses Poly Haven's API with an identifying User-Agent and downloads only 1K/2K glTF files and their required companions.

## How to import the actual models

In GitHub, open **Actions > Import free museum props (CC0) > Run workflow**. The workflow runs the importer, downloads the files and commits them back to the repository. It is **manual-only** to avoid using Actions minutes without your action. The linked GitHub account must permit Actions writes. Or run this on a computer with internet access and push its resulting files:

    python3 scripts/import_museum_assets.py

The files go under museum/assets/models/, and the importer updates museum/assets/manifest.json with real glTF paths.

The browser-side code now replaces case display geometry with the downloaded cabinet if the file loads successfully. The original case links, display labels and interaction colliders stay intact. The original geometry remains visible if a model fails to load.

**Current status:** No Poly Haven model binaries were uploaded by the assistant. GitHub Actions or a local script run is still required to get them into the project. Because GitHub Actions bot pushes do not always trigger a GitHub Pages rebuild, a regular push or manual deployment may be needed after import.

## Character and animations

The existing Gobkit/procedural character is still a fallback. A new realistic human needs a licensed, skinned model with usable Idle and Walk clips embedded in one GLB. Adobe Mixamo supports animations for video games and can be used with an Adobe ID: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html .

Export the final character as museum/assets/characters/visitor.glb and set manifest.character.path to ./assets/characters/visitor.glb. Ensure embedded clips have names including Idle and Walk. The existing loader now prioritizes that local file when present, otherwise it uses the old placeholder and native animation fallback.

Automatic Mixamo login, rigging and character export are **not completed**.

## Camera and controls

The third-person look-at point was changed to aim directly at the visitor instead of an offset several metres into the room. This is the first correction for the reported far-right character framing. WASD, click-to-move, E interaction and searchable records remain as before.

## Playtest priorities

1. Verify the character is horizontally centered and the follow camera stays behind them.
2. Run the Poly Haven import action and confirm case exhibits render as actual cabinet models.
3. Test the Records Library seating and storage models.
4. Check interaction and case links in every gallery.
5. Add a final skinned character with Idle/Walk clips and check transitions.

## Relevant implementation files

- museum/asset-library.js: local model loader, scale and animation-safe cloning
- museum/assets/manifest.json: source links and installed path configuration
- scripts/import_museum_assets.py: official API downloader
- .github/workflows/import-museum-assets.yml: manual GitHub Action
- museum/world.js: swappable exhibit slots and collision
- museum/museum.js: centered camera and asset startup
