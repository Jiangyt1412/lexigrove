# Lexigrove

Lexigrove is a local-first vocabulary-learning Progressive Web App for personal, general, academic and environmental English. It combines typed recall, FSRS scheduling and two original pixel environments: a Study Garden for acquisition and a Memory Aquarium for accumulated retention milestones. It runs independently of Codex, ChatGPT and OpenAI APIs. No account, application backend, paid dictionary API or cloud database is required.

**Public website:** [Open Lexigrove](https://jiangyt1412.github.io/lexigrove/). The application was deployed and its live resources verified on 2026-10-04; the deployment and browser checks are recorded in [VALIDATION.md](VALIDATION.md).

This is a **60-word starter application**, not a complete NGSL, NAWL, AWL or examination vocabulary course. Its current validation results and remaining checks belong in [VALIDATION.md](VALIDATION.md); the presence of features or tests is not a claim that every browser and device has been verified.

## Run locally

Use Node.js 22 or a newer compatible LTS release, npm, and a modern browser with IndexedDB. The installed `ts-fsrs` package requires Node.js 20 or newer; the project's development/test toolchain is better served by Node.js 22+. Initial dependency installation needs internet access.

Run these commands from the project directory:

```sh
npm ci # Install the exact dependency versions recorded in package-lock.json.
npm run dev # Start the development server on the loopback interface; use its printed URL.
```

For the production PWA and offline behavior:

```sh
npm run build # Type-check and build the static application into dist/.
npm run preview -- --port 4173 # Serve the built application locally for production-mode inspection.
```

Open the printed URL and allow the first online load and service-worker installation to finish before testing offline use. The development server is not the production offline test. Browser installation controls vary; use the browser's install action when offered. A remote host must serve the application over HTTPS for service workers; localhost is suitable for same-device development. A phone opening an ordinary HTTP LAN address does not gain the localhost secure-context exception.

The build produces static files. Serve `dist/` over HTTPS. The default deployment base is `/`; set `VITE_BASE_PATH` to `/repository-name/` when building a GitHub project Pages site. Images, fonts, manifest and offline navigation follow that base. Keep `THIRD_PARTY_NOTICES.txt` and the font licence files with any distribution.

## 中文辅助与词库来源

内置 60 个开发样例词：25 个来自最初的产品要求，另 35 个按通用、学术和环境科学主题补充。这是项目选编的起始集，没有按实测词频排序，也不是完整的 NGSL、AWL、NAWL 或考试大纲。

英文释义和已有音标取自 English Wiktionary，经 Kaikki / Wiktextract 提取；例句和搭配由本项目编写。每个词保留来源链接，精确词性、义项索引和原始响应哈希见 [DATA_SOURCES.md](DATA_SOURCES.md) 与 `data/selection-audit.json`。

60 个中文提示由本项目依据**当前英文主释义**改写，存于 `data/chinese-glosses.json`，遵循 CC BY-SA 4.0。这些不是 Wiktionary 官方中文词条，未经过独立双语审校，也不覆盖每个词的所有义项。首次认识单词、词库、详情与回答后的反馈可以显示中文；释义回忆题优先显示已有中文提示，并辅以当前英文释义；缺少中文时使用英文，听写题隐藏拼写和音标。**Settings & data → 显示中文释义**可以关闭显示。中文支持搜索、手动编辑、导入和备份，文字采用清晰的普通字体。

## GitHub Pages deployment

This public repository is deployed at [jiangyt1412.github.io/lexigrove](https://jiangyt1412.github.io/lexigrove/) using **Settings → Pages → Build and deployment → Source → GitHub Actions**. The checked-in [Pages workflow](.github/workflows/pages.yml) installs locked dependencies with Node 22, checks lint and unit tests, builds with the repository's base path, and deploys the static artifact. Pushing to `main` or running the workflow manually triggers it. For a fork, enable the same Pages source and inspect that fork's successful deployment for its own URL.

GitHub Pages hosts the application; it does not provide an application database or user accounts. Each visitor has their own local browser data. Before switching from localhost to the public site, export a backup on localhost and restore it on the public site. Only application source, starter dictionary and licensed assets belong in the repository; personal backups, browser data and `.openai/` hosting metadata are excluded.

```sh
VITE_BASE_PATH=/lexigrove/ npm run build # Build a project Pages artifact; replace lexigrove if the repository has another name.
```

References: [GitHub Pages creation](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) and [Vite GitHub Pages deployment](https://vite.dev/guide/static-deploy.html#github-pages).

## Learning workflow

1. Finish due reviews before introducing new words. Existing cards, histories and earned worlds are preserved.
2. A new meaning has **three stages: display and copy the word → type from its meaning → listen and type**. The second stage uses the saved Chinese hint when enabled and available, with English as support; otherwise it uses English. Different words alternate when available. A single remaining word can continue directly, without a filler or an obligatory cloze. A wrong acquisition answer restarts the current three-stage cycle without deleting its history. Graduation initializes one FSRS card after the final successful listening answer.
3. A due review initially shows **only the spelling** and **认识 / 不确定 / 不认识**. Selecting an option immediately opens the exact learning meaning's readable dictionary details. Change the selection there, then choose **确认并继续**. Closing the sheet, leaving or reloading does not confirm a draft; a saved draft reopens on resume.
4. Confirmed **认识** finishes with no tests. **不确定** requires meaning-to-spelling and listening-to-spelling. **不认识** repeats copying, meaning-to-spelling and listening-to-spelling. Repair answers remain in history, and any error remains attached to the event. Listening cannot complete without successful playback of an owned pronunciation variant.
5. The **whole due event calls FSRS once**: confirmed known → Good; uncertain with both tests correct → Hard; unknown or any repair error → Again. Successful repair cannot erase the initial forgetting. No Easy grade is inferred from typing speed. The next due date depends on prior stability/difficulty and the confirmed event, rather than a fixed calendar. A confirmed repair must finish before switching to unrelated practice.

Copying is exposure, and “known” is a learner's self-assessment checked against displayed details. Neither is an independent meaning-recall measurement. Repair tasks follow feedback and are not multiple spaced observations. The statistics label positive completed events **Review outcomes**; individual meaning/audio accuracy is reported separately. This grouping and grade mapping are product choices, not a clinically or independently validated optimal protocol. See [LEARNING_DESIGN.md](LEARNING_DESIGN.md) and the [official Anki answer-button meanings](https://docs.ankiweb.net/studying.html#answer-buttons).

Spelling normalizes NFKC Unicode, case and surrounding whitespace. Other differences must match the expected spelling or an explicitly stored alternate. Cloze remains unscheduled practice with an owned grammatical target (for example `recorded` for `record`); it is no longer a compulsory acquisition or review step. A word needs a real definition and usable pronunciation, but no cloze example is required to learn it. Unavailable audio stays pending. UK is primary, US auxiliary; bundled neural clips automatically play on copying/listening arrival and once after a submitted answer, never before hidden meaning recall. Browsers can block autoplay; the visible flag controls permit retry.

## Your vocabulary and dictionary

Search stored words by their available lexical information, decks and tags. Click words inside definitions to navigate one reusable dictionary sheet; its breadcrumbs avoid stacking an unlimited number of dialogs. Lookup is local. An unknown word outside the stored dictionary needs a personal entry rather than a fabricated definition.

A word has one normalized spelling identity across multiple decks. Its lexical entries own their part of speech, pronunciations and dictionary senses; each learning sense group owns an independent acquisition state and FSRS card. Dictionary sense count and learning card count can differ. Adding an existing word to Personal Vocabulary does not duplicate its lemma or cards. Notes remain word-level; editing one learning meaning preserves its siblings' cards and histories.

CSV and JSON list imports require `word`; simple records can include `definition`, `chinese`, `example`, `deck`, `tag` and `note`. Optional lowercase CSV fields include `partofspeech`, `ipaus`, `ipauk`, `clozetarget`, `expectedanswer` and `acceptedforms`. JSON can provide explicit `entries` with owned pronunciations, dictionary senses and learning groups. An existing lemma gains genuinely new entries/groups without duplicating the word or resetting previous cards. Existing nonempty definitions, examples and notes are preserved; compatible records fill gaps and merge deck/tag memberships. Ambiguous heteronyms need an explicit pronunciation or entry mapping rather than a guessed merge. Separate multiple tags with `;` or `|`.

Imports are limited to 10 MB and 10,000 rows, previewed before writing, and are distinct from replacement backups. The Import dialog offers an optional [three-word structured example](public/examples/lexical-import.json), covering calm, record and bow. It does not enter your library until you import it. Its paraphrases, IPA attribution and limitations are documented in [DATA_SOURCES.md](DATA_SOURCES.md#structured-multiple-meaning-examples).

The unchanged starter contains selected English Wiktionary definitions and IPA, extracted through Kaikki/Wiktextract. Its 60 short teaching examples and 120 collocation phrases were authored for this project. Deck labels are editorial groupings, not verified membership in a named published word list. Unlabelled source IPA is not relabelled US or UK; missing accent-specific IPA stays missing. A separate, partial family layer covers 35 starter lemmas with verified source links. Structured family links retain relation, source and optional target identity; clicks look up the related lemma, and the UI only shows a target part of speech when it is actually stored. Sources and data licences are in [DATA_SOURCES.md](DATA_SOURCES.md).

## Local data, backups and offline limits

Vocabulary, decks, notes, acquisition state, FSRS cards, attempt history, settings, the active session and world progress are stored in IndexedDB in the current browser profile. Browser storage belongs to an **origin**: protocol, host and port. `localhost`, `127.0.0.1`, different ports, another browser profile and another deployment domain do not share the same database. Export before moving between them. There is no automatic cloud sync.

Use **Settings & data → Export backup** regularly and keep copies outside browser storage. A backup includes lexical entries and notes, deck memberships, progress and FSRS state, attempt history, settings, the active session and world counters. It is an ordinary unencrypted JSON file; store it accordingly. Requesting persistent storage may reduce eviction risk but the browser can decline, and it does not replace a backup. Clearing site data, private browsing and storage eviction can remove local learning data. See the persistence references in [LEARNING_DESIGN.md](LEARNING_DESIGN.md).

Restore is **replacement**, not a merge. Backup version 5 validates the complete lexical graph, progress ownership, history, counters, settings and FSRS fields before database writes. Supported versions 1, 2, 3 and 4 are migrated in memory first; invalid or unsupported files are rejected without replacing the database. A valid restore replaces included tables in a single transaction after confirmation. The UI initiates a safety-backup download first; ensure the browser actually saves that download before proceeding. Resetting all local data is a separate confirmed operation and removes progress; it also initiates a safety download. Per-word learning reset retains historical attempts and earned world milestones. IndexedDB versions 5–7 retain previous card values and history while assigning lexical identities and migrating partial acquisition to the current three-stage sequence; see [MIGRATION.md](MIGRATION.md).

After the production service worker has successfully cached the application, the local dictionary, reading, typed recall, FSRS calculation, statistics, backups and bundled artwork/fonts can work offline. Cache availability still depends on the browser retaining those resources. No thousands-of-files external image or audio cache is created.

The 60 starter words ship with **120 pre-generated neural audio clips**, using Kokoro v1.0: **🇬🇧 UK bf_emma is primary; 🇺🇸 US af_heart is supplementary**. These are synthesized voices, not human dictionary recordings. Words use their selected entry's dictionary phonemes where available; remaining phones come from the corresponding en-gb/en-us G2P. Short-word synthesis and automatic G2P can still make mistakes; no independent phonetic certification is claimed. [AUDIO_SOURCES.md](AUDIO_SOURCES.md) records source, model hashes, voices, processing and limitations; the public audio manifest has per-clip checksums.

Automatic pronunciation is enabled by default: a new word plays when introduced, a listening task plays its target, and submitting an answer plays it again, including after an incorrect answer. Enter or **Check answer** marks typing as finished; individual keystrokes do not replay audio. Definition and cloze tests do not speak their hidden answer before submission. Leaving or advancing cancels playback, and only a completed owned pronunciation enables a listening answer. Browser autoplay policy may require one manual click; failure remains visible and is never recorded as a pass.

The finite audio set is cached with the production PWA. Offline audio works after that cache has completed and while the browser retains it; it does not require installed system voices. Imported words without attributed audio can use a matching installed voice, subject to device availability. Heteronyms require entry-specific audio and cannot use unconstrained whole-word TTS. Flag-labelled controls never silently substitute the other country's accent. System voice selection remains available as an explicit preference and for imported words.

## Progress, statistics and presentation

Pronunciation controls in word details, introductions and listening tasks offer **🇬🇧 英音** and **🇺🇸 美音** separately. They display only the explicitly US/UK-tagged IPA already present in the source data; missing transcriptions are not copied or invented. Listening tasks hide IPA and spelling. A saved voice from one accent cannot override the other accent's button. These labelled controls use owned UK/US audio or a matching installed fallback voice and report unavailability instead of substituting the other country's voice. Only completed playback can enable a listening answer. UK is the primary button; matching bundled audio works without a system voice. System-voice fallback requires the corresponding installed accent. See [the voice-selection API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/voice).

Current maturity requires **all three** conditions: an FSRS card in Review state, stability of at least **21 days**, and at least **three positive completed scheduled review events**. Acquisition answers and unscheduled practice do not count toward those three scheduled successes. This threshold is a configurable product convention, not proof of permanent mastery. It is centralized with world milestones in `src/world/progression.ts`.

The `everAcquired` and `everMature` flags record earned milestones monotonically. Garden and aquarium counters use their historical high-water marks. Missed days, a later lapse, suspension or per-word learning reset do not remove an earned environment. A current mature count can decrease after a lapse while the already-earned aquarium remains. Explicit full-data reset or replacing data from a backup is different from ordinary learning progression. World visibility and decorative effects can be disabled without changing FSRS scheduling.

Statistics distinguish observed review accuracy from scheduling targets. The dashboard retention percentage is observed correctness over recorded scheduled reviews; acquisition and copy exercises are excluded. Modality accuracy includes acquisition and scheduled attempts, with its attempt count. Forecasts count currently scheduled next-due dates in cumulative future windows; they omit additional reviews created by future answers and new learning, so they are projections rather than a complete workload simulation.

The desktop home is dominated by an original living pixel garden, with a quieter aquarium alongside it, integrated game-like navigation, a direct learning action and compact statistics. Independent creature paths include pauses and turns; trees, grass, clouds, water, leaves, snow and bubbles supply environmental motion. Four seasons change actual scene geometry. **Season → Auto** follows local northern-hemisphere calendar months; manual selection supports other climates. Day/night and Full/Reduced/Static animation are saved preferences. The operating system's reduced-motion setting suppresses animation. World settings never enter FSRS scheduling.

Desktop remains the primary design, with a usable single-column layout checked at 390 px. **All learning content and the entire dictionary—including its buttons, part of speech, IPA and answer fields—use regular readable sans-serif.** Main navigation and world signs retain pixel typography. Pixel font provenance is in [FONT_LICENSES.md](FONT_LICENSES.md); original art scope is in [ASSET_LICENSES.md](ASSET_LICENSES.md). No commercial game artwork, screenshots or proprietary fonts are included.

## Maintenance and validation

The application separates lexical data, IndexedDB persistence, acquisition/FSRS behavior, dictionary UI, speech, import/backup, statistics and world projection under `src/`. Dependency versions are resolved in `package-lock.json`. Use an explicit schema migration when changing saved data or FSRS field semantics; do not assume a major dependency upgrade can safely reinterpret years of history.

```sh
npm run typecheck # Check TypeScript without emitting application files.
npm run lint # Check the configured source and test lint rules.
npm test # Run the unit and integration test suite.
npm run build # Produce the production application and service worker.
npm run test:e2e # Run the configured browser suite when its browser/runtime prerequisites are available.
python3 scripts/generate_notices.py # Refresh full third-party notices after dependency changes.
```

Actual executed checks, device/browser coverage and unresolved limitations should be reported in [VALIDATION.md](VALIDATION.md). These commands are instructions, not assertions that they have all passed. Dictionary rebuild instructions and exact-source reproducibility limits are in [DATA_SOURCES.md](DATA_SOURCES.md#rebuilding-the-starter-data).

## Licensing

The application's original code is [MIT licensed](LICENSE), Copyright 2026 Lexigrove contributors. **That licence does not cover the entire repository indiscriminately.** The following exceptions retain their own terms:

| Material                                                                                                                    | Licence and attribution                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Original application code                                                                                                   | [MIT](LICENSE)                                                                                                                           |
| Third-party software, bundled helpers and runtime code                                                                      | Respective installed licences; [inventory](THIRD_PARTY_LICENSES.md) and [complete distributable notices](public/THIRD_PARTY_NOTICES.txt) |
| Wiktionary-derived definitions/IPA and adapted starter dictionary, including its project-authored examples and collocations | [CC BY-SA 4.0](DATA_SOURCES.md); retain per-entry source, contributor and licence links and indicate changes                             |
| Pre-generated starter audio                                                                                                 | Project CC0 dedication to applicable output rights; Kokoro model Apache-2.0; see [AUDIO_SOURCES.md](AUDIO_SOURCES.md)                    |
| Original project pixel artwork                                                                                              | [CC0-1.0 dedication](ASSET_LICENSES.md), to the extent applicable rights can be waived                                                   |
| Pixelify Sans and GNU Unifont derivatives                                                                                   | [SIL OFL-1.1](FONT_LICENSES.md); complete copyright and licence texts accompany the fonts                                                |
| User imports, personal quotations, optional images and recordings                                                           | Their source-specific terms; not automatically relicensed by importing them                                                              |

Do not replace dictionary or font licences with the application's MIT notice. No proprietary dictionary content, commercial game assets or unknown-source images are included. Bundled audio comes from the documented Apache-licensed Kokoro model; it is neural synthesis, not human dictionary recording. Review any future imported assets and larger datasets before redistribution.

Study opens in its own full-screen `#study` view with the main navigation unmounted. Reload and browser Back/Forward preserve the saved session. Each introduction and post-answer card shows one learning meaning in order: target word → part of speech and IPA → English definition and optional Chinese hint → example → collocations → verified family links → other meanings/full dictionary and optional note. Recognition reveals details only after a choice; meaning/listening/cloze prompts disclose the answer after submission. Entry/group selection in the dictionary updates pronunciation, definitions, examples, collocations and progress together; multi-entry and same-POS heteronym words begin with an explicit overview rather than an arbitrary sense.
