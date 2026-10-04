# Self-hosted pixel fonts

Checked 2026-09-28. All font assets are bundled locally under `public/assets/third-party/fonts/`. They require no Google Fonts service, network request, API key, account, or operating-system font installation at runtime. All distributed font binaries use **SIL Open Font License 1.1 (OFL-1.1)**, separately from the application's code licence.

## Files and family names

| File | CSS family name | Weight | Bytes | Purpose |
| --- | --- | --- | ---: | --- |
| `pixelify-sans-variable.woff2` | `Pixelify Sans` | 400–700, variable | 23,060 | Pixel headings, buttons and navigation |
| `lexigrove-ipa-pixel.woff2` | `Lexigrove IPA Pixel` | 400 | 42,624 | Available pixel IPA/numeric face for decorative contexts; learning text uses regular sans-serif |
| `lexigrove-unicode-pixel.woff2` | `Lexigrove Unicode Pixel` | 400 | 912,100 | Wide Unicode BMP fallback including Chinese |
| `PixelifySans-Variable.ttf` | `Pixelify Sans` | 400–700, variable | 79,160 | Unmodified upstream source retained for provenance; browsers can use the smaller WOFF2 |

The three WOFF2 files total **977,784 bytes**. `font-sources.json` includes source/download URLs, exact file sizes, SHA-256 hashes, embedded copyright notices and conversion details. `font-coverage.json` contains the actual per-character and per-pronunciation validation results.

The web integration must load the local WOFF2 URLs and include them in the PWA's precache; storing files in `public` alone does not ensure a service worker caches them. The existing per-file 3 MB cache limit is sufficient. Precache the `.txt` notices too if offline viewing of licence text is desired. The application integration is responsible for loading these assets and preserving the chosen readable learning-text typography.

## Pixelify Sans

Copyright 2021 The Pixelify Sans Project Authors. Designer: Stefie Justprince, as identified in the [official Google Fonts metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/pixelifysans/METADATA.pb).

- [Official Google Fonts TTF source](https://raw.githubusercontent.com/google/fonts/main/ofl/pixelifysans/PixelifySans%5Bwght%5D.ttf).
- [Official source licence](https://raw.githubusercontent.com/google/fonts/main/ofl/pixelifysans/OFL.txt).
- [Upstream project](https://github.com/eifetx/Pixelify-Sans).
- Local complete notices: `PixelifySans-OFL.txt` and `PixelifySans-METADATA.pb`.
- The source font reports Version 1.000. Its 400–700 weight axis and all 574 Unicode mappings are preserved in the WOFF2 conversion. No glyphs were redrawn or removed.
- The supplied copyright notice does not declare a Reserved Font Name. The converted face retains the original family name and the embedded copyright/licence notices.

**Verified readability limitation:** uppercase `O` and digit `0` have identical outlines and identical advances in this Pixelify Sans source. It has no alternate zero glyph or OpenType slashed-zero feature. `I`, `l` and `1` have distinct outlines; `rn` and `m` have distinct glyph composition and widths. The current interface uses regular sans-serif for learning and exact input text. Where a specifically pixel-rendered numeric/decorative context needs O/0 distinction, a Unifont-derived face provides distinct outlines. A pixel aesthetic does not itself establish that a face is sufficiently legible for every task.

## GNU Unifont and local derivatives

The [official GNU Unifont release page](https://unifoundry.com/unifont/index.html) identifies **18.0.01**, released 16 September 2026, as the current release on the check date. It states that compiled fonts have offered OFL-1.1 alongside GPL-2.0-or-later with the GNU Font Embedding Exception since version 13.0.04. This project chooses **OFL-1.1** for the bundled fonts.

Copyright © 1998–2026 Roman Czyborra, Paul Hardy, Qianqian Fang, Andrew Miller, Johnnie Weaver, David Corbett, Ælla Chiana Moskopp, Rebecca Bettencourt, Ho-Seok Ee, et al. This contributor attribution is preserved in each font and in `Unifont-COPYRIGHT.txt`.

- [Official source OTF](https://unifoundry.com/pub/unifont/unifont-18.0.01/font-builds/unifont-18.0.01.otf).
- [Official OFL text](https://unifoundry.com/OFL-1.1.txt), bundled as `Unifont-OFL-1.1.txt`.
- [Official complete upstream licensing notice](https://unifoundry.com/LICENSE.txt), preserved as `Unifont-LICENSE.txt`.
- **Lexigrove Unicode Pixel:** all 58,910 source Unicode mappings retained; family and PostScript names changed; converted to WOFF2. The 5.32 MB uncompressed OTF is not shipped.
- **Lexigrove IPA Pixel:** subset to Latin, Greek, Cyrillic, IPA, combining marks, phonetic extensions, punctuation, symbols and mathematics, retaining 3,964 Unicode mappings. Family and PostScript names changed. The subset recalculates OS/2 Unicode coverage metadata and removes reserved coverage bits rejected by the subset tool.
- Both derivatives retain the upstream copyright and licence records and remain OFL-1.1. They are named differently to distinguish project adaptations from the upstream face; no upstream endorsement is claimed.

Subsetting ranges: U+0000–052F, U+1D00–1EFF, U+2000–26FF, U+2C60–2C7F, U+A720–A7FF, U+AB30–AB6F and U+FE00–FE0F. Only characters present in the original font are included. Tools used: FontTools 4.60.2 and Brotli 1.2.0. The full BMP face is the fallback for characters outside this compact subset.

## Coverage and proofing results

The **actual distributed WOFF2 binaries** were reopened with FontTools. All **97 nonempty IPA strings**, containing **47 distinct characters** across the application's 60 starter entries, are covered by both Unifont-derived faces. Pixelify Sans alone is missing 21 of those characters; it must not be the only pronunciation face. If a future optional pixel pronunciation treatment is introduced, using the compact IPA face for each complete pronunciation avoids mixing visibly different glyph designs within a transcription. The current learning interface uses regular sans-serif for IPA and all other learning content.

Both Unifont derivatives have distinct glyph outlines for `I/l/1` and `O/0`; the zero is slashed. `rn` and `m` use distinct glyph sequences and advances. Representative simplified and traditional Chinese characters were checked against the full BMP fallback with no missing cmap mappings. The source fonts were also rendered locally at 16, 20, 24, 32 and 48 px for visual inspection.

This is a cmap, outline and local rendering check, **not** proof of browser shaping or legibility at every size. Browser/mobile QA remains necessary. Unifont's source design uses a 16-pixel grid; 16 or 32 px gives integer scaling, while intermediate sizes can look less crisp. Do not force nearest-neighbour raster scaling on learning text. CJK coverage here is the source's BMP coverage, not every supplementary-plane CJK character. Complex-script shaping is limited in Unifont, as documented upstream.

## Redistribution

Keep the complete OFL and copyright notices with redistributed font files. Font derivatives remain under OFL-1.1 and cannot be relicensed as MIT or CC0. The OFL permits bundling with the application but does not permit selling the font by itself. Font licensing does not relicense the application or documents produced with the fonts. See the bundled complete licence texts for the controlling terms and warranty disclaimer.
