# Sonoma Case Ledger

A public-facing, static archive of Sonoma County court case outcomes.

## Site structure

- \`index.html\` — homepage and research standards.
- \`cases/constantine-petros/index.html\` — the first court-record case file.
- \`assets/styles.css\` — shared responsive styling.
- \`sitemap.xml\` and \`robots.txt\` — search-crawler discovery files.

## First case: People v. Petros, SCR-715528-1

Based on an 11-page export of the Sonoma County Superior Court's public case portal dated November 18, 2026:

- Four counts (001, 002, 003, 005) were dismissed on March 28, 2017.
- Count 004 received a no-contest plea and a conviction recorded in 2017.
- On September 17, 2020, the court reduced the remaining offense to a misdemeanor and granted dismissal under Penal Code 1203.4. Probation ended early.
- A PC 1203.4 dismissal is **not** an acquittal or a finding of factual innocence.
- The docket does not establish whether any custodial time was actually served.

### Source handling

The PDF export supplied during research is **not yet uploaded to this repository**. The case page cites the official public portal and exact PDF page references. Do not claim a PDF is hosted until it has actually been added. Only upload documents authorized for public distribution, and review for confidential or sealed information before sharing.

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

The character attempts to load a free CC0 Gobkit GLB with Idle/Walk clips; a procedural visitor works if the GLB cannot be loaded. No third-party asset ZIP is required to build the museum shell. See [museum/ASSET-CREDITS.md](museum/ASSET-CREDITS.md) for exact sources and licenses.

To test: publish GitHub Pages from `main` at root, then open `https://colindmcintyre.github.io/sonomacaseledger/museum/`. WebGL and the Three.js CDN are required for the 3D view. Full case articles remain accessible as normal HTML pages.

**Phase 4 is deferred:** lighting/art polish, sound, advanced animation transitions, mobile optimization and accessibility testing.
