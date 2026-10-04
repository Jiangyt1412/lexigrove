# Third-party software licences

This inventory is generated from the **actual installed packages**, not dependency version ranges. The full licence and attribution texts are in [`public/THIRD_PARTY_NOTICES.txt`](public/THIRD_PARTY_NOTICES.txt), which Vite copies into the static distribution. Regenerate after dependency changes with `python3 scripts/generate_notices.py`.

The inventory covers the installed production dependency graph, including transitive dependencies and optional type peers that are actually installed. It additionally covers the installed Workbox runtime family and runtime dependencies, plus the complete installed notices for Vite, the PWA plugin, Workbox's build package and Babel runtime helpers. This deliberately includes some modules that a particular production build can omit. It does **not** claim that every listed package or every component inside a build tool ships to browsers. The entire development-tool dependency graph is outside this runtime-notice inventory; its licences remain in the installed packages.

Embedded runtime-source notices are also copied from actual installed source maps. These include the Alea/Mash generator attribution (Johannes Baagøe, 2010; MIT) embedded in ts-fsrs, Microsoft’s tslib helper terms embedded in Dexie, and Workbox source copyright headers. This catches attribution that is absent from a top-level npm dependency list.

The application uses React, Dexie/IndexedDB, ts-fsrs, Papa Parse and Zod. Workbox supplies service-worker and update-client code. The installed Lucide package is covered conservatively even where project-original pixel icons replace its imports. Dexie's **Apache-2.0** licence and `NOTICE` are retained in full; do not describe every dependency as MIT. Lucide's supplied **ISC** notice includes attribution to its Feather-derived portions. Workbox and the selected FSRS implementation carry their own MIT notices.

| Installed package | Version | Declared licence | Inventory scope | Full notice files copied |
| --- | --- | --- | --- | --- |
| `@babel/runtime` | 7.29.7 | MIT | build/runtime helper notice; not proof every tool component is shipped | LICENSE |
| `@types/react` | 19.3.0 | MIT | type definitions only | LICENSE |
| `@types/trusted-types` | 2.0.7 | MIT | type definitions only | LICENSE |
| `csstype` | 3.2.3 | MIT | type definitions only | LICENSE |
| `dexie` | 4.4.6 | Apache-2.0 | installed production graph | LICENSE, NOTICE |
| `dexie-react-hooks` | 1.1.7 | Apache-2.0 | installed production graph | LICENSE |
| `idb` | 7.1.1 | ISC | PWA runtime distribution / transitive dependency | LICENSE |
| `lucide-react` | 0.468.0 | ISC | installed production graph | LICENSE |
| `papaparse` | 5.7.0 | MIT | installed production graph | LICENSE |
| `react` | 19.3.0 | MIT | installed production graph | LICENSE |
| `react-dom` | 19.3.0 | MIT | installed production graph | LICENSE |
| `scheduler` | 0.28.0 | MIT | installed production graph | LICENSE |
| `ts-fsrs` | 5.4.2 | MIT | installed production graph | LICENSE |
| `vite` | 6.4.3 | MIT | build/runtime helper notice; not proof every tool component is shipped | LICENSE.md |
| `vite-plugin-pwa` | 1.3.0 | MIT | build/runtime helper notice; not proof every tool component is shipped | LICENSE |
| `workbox-background-sync` | 7.4.1 | MIT | PWA runtime distribution / transitive dependency | LICENSE |
| `workbox-broadcast-update` | 7.4.1 | MIT | PWA runtime distribution / transitive dependency | LICENSE |
| `workbox-build` | 7.4.1 | MIT | build/runtime helper notice; not proof every tool component is shipped | LICENSE |
| `workbox-cacheable-response` | 7.4.1 | MIT | PWA runtime distribution / transitive dependency | LICENSE |
| `workbox-core` | 7.4.1 | MIT | PWA runtime distribution / transitive dependency | LICENSE |
| `workbox-expiration` | 7.4.1 | MIT | PWA runtime distribution / transitive dependency | LICENSE |
| `workbox-google-analytics` | 7.4.1 | MIT | PWA runtime distribution / transitive dependency | LICENSE |
| `workbox-navigation-preload` | 7.4.1 | MIT | PWA runtime distribution / transitive dependency | LICENSE |
| `workbox-precaching` | 7.4.1 | MIT | PWA runtime distribution / transitive dependency | LICENSE |
| `workbox-range-requests` | 7.4.1 | MIT | PWA runtime distribution / transitive dependency | LICENSE |
| `workbox-recipes` | 7.4.1 | MIT | PWA runtime distribution / transitive dependency | LICENSE |
| `workbox-routing` | 7.4.1 | MIT | PWA runtime distribution / transitive dependency | LICENSE |
| `workbox-strategies` | 7.4.1 | MIT | PWA runtime distribution / transitive dependency | LICENSE |
| `workbox-streams` | 7.4.1 | MIT | PWA runtime distribution / transitive dependency | LICENSE |
| `workbox-sw` | 7.4.1 | MIT | PWA runtime distribution / transitive dependency | LICENSE |
| `workbox-window` | 7.4.1 | MIT | PWA runtime distribution / transitive dependency | LICENSE |
| `zod` | 4.6.5 | MIT | installed production graph | LICENSE |

## Separate non-code licences

- Application code: [MIT](LICENSE), Copyright 2026 Lexigrove contributors.
- Selected Wiktionary definitions and IPA, plus the adapted starter dataset: [CC BY-SA 4.0](DATA_SOURCES.md). The MIT application licence does not replace the dataset licence.
- Original project pixel artwork: [CC0-1.0 dedication and scope](ASSET_LICENSES.md).
- Pixelify Sans and GNU Unifont derivatives: [OFL-1.1 with bundled complete notices](FONT_LICENSES.md). Fonts are not MIT or CC0.
- User-added words, quotations, images, audio and imports retain their own rights and require source-specific review before redistribution. No licensed human recordings or external word images are bundled in the starter.

Full package terms and warranty disclaimers, rather than this summary table, govern redistribution. Package installation and licence inspection do not establish patent clearance or verify every upstream contribution's history. Keep the supplied attribution notices and repeat this audit after dependency changes.
