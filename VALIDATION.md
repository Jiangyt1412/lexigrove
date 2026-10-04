# Validation record

Executed locally on 2026-10-04 on macOS with the checked-in dependency lockfile. This record covers the final living-world and lexical-graph implementation.

| Check                                   | Observed result                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| ESLint                                  | Passed                                                                                                       |
| Unit/integration                        | 65 passed across 4 files                                                                                     |
| TypeScript and production build         | Passed at `/` and `/lexigrove/` base paths                                                                   |
| Chromium browser suite at `/`           | All 17 passed; final run 13.6 seconds                                                                        |
| Chromium browser suite at `/lexigrove/` | All 17 passed; final report 13.5 seconds, no skipped, flaky or unexpected tests                              |
| Original SVG audit                      | 6 existing files parsed; 35 symbol IDs inventoried with exact file hashes                                    |
| Upload inventory                        | 88 text files and 6 licensed font/icon binaries; dependencies, private backups and hosting metadata excluded |

Browser checks run on a separate 4173 origin in fresh contexts. They do not write test achievements into the user's 5173 database. Desktop views use 1440×1000 and 1280×900; a 390×844 viewport checks home, full-screen study and dictionary without horizontal overflow.

The 17 cases cover saved sessions and Back/Forward, readable learning/dictionary typography, flagged accent ownership, Chinese visibility, unfinished answer preservation, real acquisition/FSRS graduation, import/edit, backup validation and atomic restore, offline cached dictionary/fonts, day/night, all four seasonal geometries, independent earned residents, Full/Reduced/Static preferences, the operating system's reduced-motion setting, and mobile controls. Night metric foreground/background contrast is checked from rendered styles. Two acquired words produce two occupied representative beds, rather than all eight; larger gardens remain bounded aggregates.

Lexical checks cover the generic A–E cases: ordinary single entry, same-pronunciation multiple POS, different-pronunciation multiple POS, same-POS heteronyms, and fewer teaching groups than dictionary senses. Dictionary switching updates pronunciation, definitions, examples, collocations and progress together. Editing/importing another meaning preserves existing cards and notes. A cloze about record correctly requires recorded and saves that expected answer with word/entry/group identities. Unavailable or unowned audio cannot earn listening credit. The 90-character typing check completes within its 2.5-second bound on this test machine; that is not a universal performance guarantee.

The version-4-to-5 IndexedDB fixture and old backup fixtures compare cards, dates, lifetime counters, notes, histories, session queues and world values after migration. Older audio histories retain unknown pronunciation IDs instead of inventing which variant played. See [MIGRATION.md](MIGRATION.md). The user's pre-update backup was saved outside the source repository; an attempted later download did not produce a separately confirmed file. Actual installed-browser migration is not claimed solely from passing fixtures.

Speech browser checks use deterministic mocked completion/error events and establish ownership and refusal behavior, not subjective sound quality or accent authenticity. No human recordings are bundled. Different lexical pronunciations of a heteronym require attributed recordings rather than uncontrolled TTS. Independent bilingual proofreading, Safari/Firefox coverage, years-long storage reliability and learning outcomes have not been established. The 60-word starter and optional three-word structured example are editorial development data, not a validated or frequency-ranked course.

Nonfatal build notices remain for upstream Zod comment annotations, the model module being imported both statically and dynamically, and the roughly 666 kB main JavaScript chunk (about 195 kB gzip). Compilation succeeds; further code splitting remains a possible improvement. The 28-entry bounded precache is about 2037 KiB, including bundled artwork/fonts and the optional structured import example.

The public GitHub repository [Jiangyt1412/lexigrove](https://github.com/Jiangyt1412/lexigrove) and upload permissions were verified. The workflow's action SHAs and Pages base-path setup were checked against [Vite's official guide](https://vite.dev/guide/static-deploy.html#github-pages). Source upload, Pages enablement and live URL must be confirmed separately; a prepared or uploaded workflow alone is not evidence of a public deployment.
