# Sonoma Case Ledger

A public-facing, static archive of Sonoma County court case outcomes.

## Site structure

- \`index.html\` — small, no-JavaScript entry landing with direct links to the traditional archive and 3D museum.
- \`cases/constantine-petros/index.html\` — the first court-record case file.
- \`assets/styles.css\` — shared responsive styling.
- \`sitemap.xml\` and \`robots.txt\` — search-crawler discovery files.

## Fast homepage and search visibility

The site opens at **`/` with a pure HTML/CSS landing page**. It immediately offers two plain anchor links:

- **Traditional website:** `./cases/`, a searchable text-first county case archive, with related federal profiles and court-record status linked in the navigation.
- **3D interactive experience:** `./museum/`, a separate Three.js application that fetches the engine, models and textures **only after the visitor chooses the museum**.

The homepage uses self-contained critical CSS, system fonts, no third-party images, no client-side page JavaScript and no redirect. Its visible research description and standard `<a href>` links are intentionally retained for indexing; do not replace the homepage with a blank JavaScript-only splash screen. The museum remains heavier because its visual assets are separate from this first load.

**Performance guardrail:** `node --test tests/landing-page.test.mjs` checks the no-JS/no-media requirement, the 16 KB raw HTML budget, metadata, crawlable links and key anchors. A GitHub Actions workflow runs the test when landing files change. This is a *static budget check*, not a measured Lighthouse score or guaranteed search ranking.

**Post-deployment verification:** inspect the public homepage on both mobile and desktop, test both entry options, check [PageSpeed Insights](https://pagespeed.web.dev/) for real LCP/INP/CLS metrics, and submit `https://colindmcintyre.github.io/sonomacaseledger/sitemap.xml` as a sitemap in a verified [Google Search Console](https://search.google.com/search-console/) property. Performance and ranking depend on user networks, devices, indexing and content quality, not only HTML size.

## Cloudflare Pages — current recommended deployment

The Cloudflare build creates a **public-only `dist/` directory**, instead of publishing the repository root. It includes ordinary case pages, the museum, approved source PDFs and the case data needed by the museum. Source archives, developer tooling and the Renderpeople FBX files are not included.

**Configure the Git-connected Cloudflare Pages project as follows:**

| Field | Value |
| --- | --- |
| Repository | `ColinDMcIntyre/sonomacaseledger` |
| Production branch | `main` |
| Framework | `None` |
| Build command | `node scripts/build-cloudflare.mjs` |
| Output directory | `dist` |
| Node version | 22 (Cloudflare Pages default) |

The build fetches a [CC0 animated business-dressed character named Jordan](https://www.innerscene.com/tools/library/3d-parts/locomotion-collection-jordan-3d-person-animated-911f1584) from Innerscene during deployment, verifies the GLB's integrity, skinning and idle/walk clips, and only then includes it at `museum/assets/characters/realistic_guide_cc0.glb`. This model is licensed for **public redistribution**. The existing CC0 `visitor.glb` remains an immediate fallback if downloading or validating the larger model fails.

Because the 3D experience is optional on the landing page, the model is never requested on the lightweight homepage. Within the 3D museum, the loading screen now waits for the **correct high-detail guide first**, so visitors no longer watch a different character swap in afterward. An automated humanoid pose corrector relaxes T-pose shoulders, wrists and over-wide legs. The visible guide is normalized to approximately 2.64 museum units and the follow camera is closer. If the detailed model cannot load in 24 seconds, the lightweight animated visitor becomes the fallback; on Data Saver/slow connections the lightweight visitor remains the default and HD can be requested manually. The original detailed GLB is about 23.3 MB, which is large for mobile devices.

**Local/offline build verification:**

```sh
SKIP_HD_DOWNLOAD=1 node scripts/build-cloudflare.mjs
node --test tests/cloudflare-build.test.mjs tests/high-detail-visitor.test.mjs tests/character-pose.test.mjs tests/renderpeople-license-guard.test.mjs
```

Cloudflare Pages must use the command and output directory above. An ordinary static deployment with the output set to `.` will not download the character or include it.

**Custom domain:** after `sonomacaseledger.org` is registered and attached, set the Cloudflare build environment variable `SITE_ORIGIN=https://sonomacaseledger.org` to rewrite absolute canonical, social and sitemap URLs for the new origin. Until then, existing absolute URLs may still point to GitHub Pages. Verify the Cloudflare deployment works before changing the repository to private.

**Current limitation:** the automated download and model appearance are not verified until a real Cloudflare build runs. The model is not a Renderpeople asset. Do not claim the high-detail guide is live based solely on the committed build script.

## First case: People v. Petros, SCR-715528-1

Based on an 11-page export of the Sonoma County Superior Court's public case portal dated November 18, 2026:

- Four counts (001, 002, 003, 005) were dismissed on March 28, 2017.
- Count 004 received a no-contest plea and a conviction recorded in 2017.
- On September 17, 2020, the court reduced the remaining offense to a misdemeanor and granted dismissal under Penal Code 1203.4. Probation ended early.
- A PC 1203.4 dismissal is **not** an acquittal or a finding of factual innocence.
- The docket does not establish whether any custodial time was actually served.

### Source handling

The unredacted original Petros export remains private. A separate **privacy-redacted 11-page reproduction** is public at [`public-records/SCR-715528-1_PublicCopy.pdf`](public-records/SCR-715528-1_PublicCopy.pdf). It is an informational copy of a court-portal printout, not a certified judgment. Do not publish an original or unreviewed scan.

## Publishing free with GitHub Pages

1. Go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select \`main\` and \`/ (root)\`, then Save.
4. Website URL after deployment: https://colindmcintyre.github.io/sonomacaseledger/

If the site is later moved to a custom domain, update canonical URLs, Open Graph URLs, sitemap, and robots.txt.

## Editorial rules

- Do not describe accusations as findings.
- Report count-by-count outcomes, dates, plea histories and post-conviction relief precisely.
- Do not say "acquitted" when the docket only documents dismissal.
- Do not invent jail time served, acquittals, exonerations, monetary losses, or reasons for dismissal.
- Disclose developer and commissioning connections to anyone featured.
- The archive is not an official court website.


## 3D Museum — phases 1–3

The new **isometric Three.js museum** is at `museum/`, and is linked from the homepage. It uses seven connected rooms: Grand Rotunda, Investment & Banking, Business & Property, Insurance & Financial Services, Public Trust, Federal Wing and Records Library. The county and federal wing distinction is explicit.

Visitors click the floor to walk, click exhibits to read a source-backed summary, and use the map/directory to jump between wings. The museum is generated from shared `world.js` components and the existing `research/case-data.json` register. New case records do not need custom 3D logic.

Cloudflare builds install the CC0 Jordan model when validation succeeds, and the museum prioritizes this visitor. The older CC0 Casual Walker GLB and a native procedural visitor are retained as fallbacks. No third-party proprietary character ZIP is required. See [museum/ASSET-CREDITS.md](museum/ASSET-CREDITS.md) for exact sources and licenses.

To test: publish GitHub Pages from `main` at root, then open `https://colindmcintyre.github.io/sonomacaseledger/museum/`. WebGL and the Three.js CDN are required for the 3D view. Full case articles remain accessible as normal HTML pages.

**Phase 4 is deferred:** lighting/art polish, sound, advanced animation transitions, mobile optimization and accessibility testing.

## Current source and docket transparency

The public archive now distinguishes **source grade** (A: government, court or regulator source; A/B: mixed primary material and reporting; B: published reporting) from **complete trial-court docket review**. A government announcement alone is not a verified full docket. Each of the 37 case pages displays a source date and explicit docket-status note.

The current Sonoma record acquisition tracker is [research/COURT-RECORDS-CHECKLIST.md](research/COURT-RECORDS-CHECKLIST.md) (also available as CSV). Of 31 county profiles, **14** have matched criminal case-detail records and **17** remain unresolved or unmatched. The private source collection contains 30 PDFs; six complete privacy-redacted public reproductions and nine limited header excerpts are published. New court PDFs must be examined before upload, and confidential/unredacted protected documents must not be published. See [corrections](corrections/) for public correction requests and [research/README.md](research/README.md) for evidence-grade rules. The dated source register is not live court monitoring. The [November 21 review progress log](research/COURT-REVIEW-PROGRESS-2026-11-21.md) records the 430-page remaining PDF preflight, newly checked later proceedings and strict public-release holds.
