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
