# Validation record

Checked locally on 2026-10-04 with the locked dependencies, for the current three-stage learning, editable recognition review and UK-first neural audio release.

| Check                                         | Observed result                                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Unit/integration                              | 82 passed across 6 checked-in files                                                                                                   |
| TypeScript, ESLint and production compilation | Passed                                                                                                                                |
| Root-path Chromium behavior                   | Earlier flow: 23 distinct cases verified; latest audio/review follow-up: all 6 targeted cases passed in 17.2 seconds                                 |
| Final `/lexigrove/` Chromium suite            | All 23 passed in 34.2 seconds; no skipped or flaky cases                                                                              |
| Private legacy-backup migration               | Separate local-only check passed: version 2 to version 5, 60 words / 7 attempts, original cards/history/counters/notes/world retained |
| Original asset audit                          | 6 SVG files parsed, 35 symbol IDs inventoried                                                                                         |
| Audio integrity                               | All 120 files verified against SHA-256, PCM16 mono / 24 kHz, bounded duration and finite non-clipped samples                          |
| Offline audio                                 | All 120 clips cached; actual UK and US playback completed with the network disabled and no system voices                              |

Browser tests use fresh profiles at port 4173, separate from the user's development and public-site storage. The Pages suite uses the actual project subpath. Desktop is primary (1440×1000 / 1280×900); an existing 390×844 check also passes without horizontal overflow. Testing does not write achievements into the user's profile.

The workflow cases prove exactly Copy → Definition → Audio for new acquisition, one-word progression without filler/cloze, confirmed known without further tests, uncertain Definition+Audio with one Hard scheduler update, and known changed to unknown in details followed by all three steps with one Again update. Draft choices and partial repair survive reload/backup. Wrong repair cannot be erased by a later correct spelling; successful repair cannot erase initial unknown. Stale tabs, duplicate confirmation, unplayed/unowned audio and forged backup cursor/history are rejected. A confirmed repair cannot be abandoned by switching to unrelated practice.

Additional cases cover existing dictionary POS/pronunciation/sense ownership, same-POS heteronyms, readable learning/dictionary fonts, English/Chinese visibility, import/edit, grammatical cloze as unscheduled practice, original seasonal environments, earned residents, world-off, reduced motion, night contrast, Back/Forward and offline dictionary/fonts. The 90-character typing fixture remains within 2.5 seconds on this machine; this is not a universal device claim.

Migration tests lift an actual old version-4 IndexedDB fixture through version 7 and validate earlier backup versions. Original card fields, attempt timestamps/grades and world high-water values stay intact; the old pending acquisition stage is deliberately mapped to the new three-stage interpretation. An old active review uses a fresh token and restarts recognition without inventing a choice or grading past partial answers. The user's original backup and the temporary audit test remain outside public source; no notes, backup content or browser data are uploaded. Tests do not establish whether an already-installed user PWA has received the new update.

Audio browser tests exercise actual bundled WAV decode/play/end events as well as deterministic policy-failure/system-fallback cases. They do not establish subjective naturalness or independent phonetic accuracy. These are Kokoro-generated neural clips, not human recordings; model/generator provenance and limitations are in [AUDIO_SOURCES.md](AUDIO_SOURCES.md). Independent bilingual proofreading, Safari/Firefox coverage, long-term storage reliability and this exact custom protocol's learning outcomes have not been validated. The default dictionary remains 60 editorial starter words.

The current Pages artifact has a 30-entry app-shell precache of approximately 2.09 MiB. Its 9,822,480 bytes of finite word audio warm separately in a versioned cache, with two full-body downloads and foreground playback priority. Cached audio serves proper 206 byte-range responses in CORS mode. Main JS is approximately 695 kB (203 kB gzip). Compilation succeeds with the known upstream Zod annotation notices, mixed static/dynamic model import notice and large-chunk warning. No synthesis model is downloaded or run in the PWA.

## Public release verification

The first public implementation of this learning flow was published from commit [`1de6d7c62770778c7609fac24a256d1916585cd3`](https://github.com/Jiangyt1412/lexigrove/commit/1de6d7c62770778c7609fac24a256d1916585cd3). Both build and deployment jobs in [GitHub Actions run 37208921363](https://github.com/Jiangyt1412/lexigrove/actions/runs/37208921363) completed successfully. This supersedes the historical release `22d4da12a3900e0221888806a894881387a49082`.

For that first implementation, actual HTTPS fetches from [the public website](https://jiangyt1412.github.io/lexigrove/) verified that its main JavaScript, CSS, web manifest, audio provenance manifest and sampled UK/US `mitigate.wav` bytes match the tested Pages artifact. All 150 precache URLs match; application and audio revisions match. Two font-licence revision hashes differ because public source normalizes CRLF to LF; their text matches after that normalization. This is not an application or audio mismatch.

Fresh-profile public checks also observed that first-download network delays can exceed the bounded audio deadline. A direct public UK clip completed real playback when service-worker installation was excluded. This separates successful public media decoding from cold-cache/network behavior; retry remains visible and an unfinished clip never earns listening credit. Local Pages behavior and installed/offline browser checks do not guarantee uninterrupted first-load playback on every connection.


The follow-up caching change removes the full audio set from service-worker installation, uses the official Workbox cached-media recipe with CORS and range support, and warms complete audio responses with at most two background downloads. Unit checks verify bounded concurrency, reuse of completed clips, foreground cancellation/pause and subsequent retry. This fixes the install/playback coupling without changing the learning engine, card history, audio bytes or voices. Public first-load timings remain connection-dependent.
