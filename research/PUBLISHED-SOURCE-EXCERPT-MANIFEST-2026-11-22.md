# Newly published selected court-source PDFs — provenance and release checklist

**Edition:** 2026-11-22. **Original sources:** the six remaining matching Sonoma Superior Court portal PDF printouts supplied privately. **New public outputs:** six short PDF exhibits, containing 21 pages total (including six editorial covers), for five distinct case profiles. **No unredacted original is public.**

## Output manifest

| Original PDF | Original pages | Public excerpt PDF | Public pages | Original source pages visibly reproduced | SHA-256 of public PDF |
| --- | ---: | --- | ---: | --- | --- |
| `Elena.CourtREcords.pdf` | 51 | [`SCR-751314-1_Selected_Redacted_Docket_Excerpt.pdf`](../public-records/SCR-751314-1_Selected_Redacted_Docket_Excerpt.pdf) | 4 | 1, 7, 51 | `239f138b04d7fd4669c75a5c738ebc80e09d32a65ca64be616bc628cd5875ad6` |
| `HOLZWORTH.CourtRecords.pdf` | 40 | [`SCR-627215-1_Selected_Redacted_Docket_Excerpt.pdf`](../public-records/SCR-627215-1_Selected_Redacted_Docket_Excerpt.pdf) | 4 | 1, 7, 39 | `d87bb32b2aa66b02594161f5acbc8ea236d2be22e862bf532ff2e743b532bd95` |
| `Halaweh.CourtRecords.pdf` | 54 | [`SCR-651671-1_Selected_Redacted_Docket_Excerpt.pdf`](../public-records/SCR-651671-1_Selected_Redacted_Docket_Excerpt.pdf) | 3 | 1, 54 | `2092d63317ebb444193b1bd1b918fb306c2d33be3a68e6ce95913801677f2b92` |
| `MERMAN.CourtRecords.pdf` | 63 | [`SCR-563322-1_Selected_Redacted_Docket_Excerpt.pdf`](../public-records/SCR-563322-1_Selected_Redacted_Docket_Excerpt.pdf) | 3 | 1, 62 | `6557a1101d1b5090295033d1c6574f1c9b488708e282e91ca5e3aad6e91267c8` |
| `RAMOS.CourtRecords.pdf` | 76 | [`SCR-728488-1_Selected_Redacted_Docket_Excerpt.pdf`](../public-records/SCR-728488-1_Selected_Redacted_Docket_Excerpt.pdf) | 4 | 1, 75, 76 | `2358cf3629920506b2d9e291245717c643fbf016f86740c10cc72f17e2870354` |
| `SCR-627215-1.pdf` | 39 | [`SCR-627215-1_Scanned_Secondary_Excerpt.pdf`](../public-records/SCR-627215-1_Scanned_Secondary_Excerpt.pdf) | 3 | 1, 39 | `5125aab1ccf669e03935a7b788d4b47767f4d4691af4f9792491eb6f136d39ef` |

## Privacy screening and regeneration logic

1. **Source selection:** Only specified rectangular regions on explicitly chosen source pages were kept. The defendant-case header strips show case number, criminal classification and portal case-status label without the original Party section.
2. **Minimization:** Case summaries outside source-image clips are freshly written editorial text, not extracted hidden content. Page crops were limited to relevant verdict, restitution, appellate or supervision entries. Private individuals, bank evidence, medical/treatment details, addresses, counsel mailing information, and unrelated witness testimony were omitted.
3. **Raster rebuild:** Each kept source region was rendered to pixels and inserted as a JPEG image into a new PDF. The original PDF file structure, text layer, embedded objects, annotations, metadata, and material outside the kept rectangles were not copied.
4. **Output checks:** The new PDFs were opened to verify their page counts and absence of embedded attachments. The six local output byte hashes were checked against the GitHub blob object SHA-1 values at publication, and the six blob paths were confirmed in the committed Git tree `baa0c8d383cf59045ca148530c60573419108f01`. The local PDF text extraction contains editorial covers and image captions, not the hidden source records.
5. **Editorial limitations:** The file titles, cover and source pages label these as *selected, cropped court-source excerpts*. **They are not complete docket replicas, not certified judgments and not real-time court status checks.** No private victim or witness details should be inferred from the omitted pages.

## Remaining review status

This publication does **not** clear the complete six original source PDFs for republication. Their combined **323 source pages** still require full, legible, page-by-page review, targeted privacy redactions, and a second verification of the final page renderings if full documents are to be released. Two of the six are separate exports of the same `SCR-627215-1` criminal case involving Jeffrey Holzworth. The original 30-PDF evidence collection continues to support **14 distinct matched Sonoma case profiles**, not 15.

Existing public count remains **six complete previously redacted source reproductions**, **nine limited one-page case headers**, plus **six new selectively cropped source PDFs**. Do not describe the three categories as interchangeable.

See [the all-30-PDF inventory](COMPLETE-30-PDF-INVENTORY-2026-11-22.md) and the [public records status page](../records/).
