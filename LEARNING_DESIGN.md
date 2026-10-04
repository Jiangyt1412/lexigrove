# Learning engine research and design audit

Research initially checked 2026-09-27; implementation policy updated 2026-10-04. This document separates verified upstream behavior from proposed application rules. The application-specific acquisition protocol and world maturity thresholds are product choices, not independently validated scientific optima.

Implementation update, 2026-10-04: the lexical graph now separates canonical words, entries, owned pronunciations, dictionary senses and learning groups. FSRS and acquisition state belong to a learning group; deck membership and word notes belong to the canonical word. The FSRS parameters remain unchanged; the current familiarity-based grade mapping below replaces earlier binary spelling grading. World awards count distinct canonical words, while due queues and cards operate on independent groups. Database version 7 and backup version 5 are described in [MIGRATION.md](MIGRATION.md).

## Evidence boundaries for product copy

**Retrieval practice:** Roediger and Karpicke (2006), “Test-Enhanced Learning: Taking Memory Tests Improves Long-Term Retention,” _Psychological Science_, 17(3), 249–255, DOI [10.1111/j.1467-9280.2006.01693.x](https://doi.org/10.1111/j.1467-9280.2006.01693.x). The [publisher's original research abstract](https://www.psychologicalscience.org/journals/psychological-science/j.1467-9280.2006.01693.x/) reports two experiments with prose passages: retrieval practice improved delayed retention relative to repeated study, whereas immediate performance favored repeated study. This supports offering recall practice; it does not validate this app's three-modality sequence, academic vocabulary coverage, or a specific acquisition reset rule.

**Spacing:** Cepeda, Pashler, Vul, Wixted, and Rohrer (2006), “Distributed Practice in Verbal Recall Tasks: A Review and Quantitative Synthesis,” _Psychological Bulletin_, 132(3), 354–380, DOI [10.1037/0033-2909.132.3.354](https://doi.org/10.1037/0033-2909.132.3.354). This is a meta-analysis, not a single primary experiment. The [authors' university repository manuscript](https://www.escholarship.org/content/qt3rr6q10c/qt3rr6q10c.pdf) synthesizes distributed verbal practice and reports that the useful spacing interval depends jointly on the intended retention interval. It supports spacing as a general principle, not a universal fixed calendar or a guarantee of FSRS performance for every learner.

**Important qualification on interleaving:** Brunmair and Richter (2019), “Similarity matters: A meta-analysis of interleaved learning and its moderators,” _Psychological Bulletin_, 145(11), 1029–1052, DOI [10.1037/bul0000209](https://doi.org/10.1037/bul0000209). The [authors' university-hosted manuscript](https://www.psychologie.uni-wuerzburg.de/fileadmin/06020400/2019/Brunmair_Richter_in_press__2019_META-ANALYSIS_OF_INTERLEAVED_LEARNING.pdf) finds benefits depend on material and task; its limited word-based studies favored blocking, with cautions about generalization. Those category-learning comparisons are not the exact same manipulation as spacing repeated retrieval of individual vocabulary words. Therefore the requested queue is a reasonable implementation choice to prevent immediately repeated answers, but saying “interleaving is always best for vocabulary” would overstate the evidence.

Safe README wording: “The app uses retrieval practice and spaced review, informed by learning-science research. Its three-modality acquisition sequence, reset rule, and world milestones are product choices rather than independently validated optimal protocols.” No primary study validating this exact combined protocol was identified in this targeted search. No claim of clinical validation is warranted.

## Algorithm licensing scope and remaining risks

The actual installed `ts-fsrs@5.4.2` package includes MIT with Copyright (c) 2026 Open Spaced Repetition; this was read locally as well as checked against the [upstream package license](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/LICENSE). The [OSI license text](https://opensource.org/license/mit) permits use/modification/distribution subject to retaining its notices, and supplies the software without warranties. Preserve the full notice for bundled/minified distributions, not only the word “MIT” in a table.

This verification covers the selected TypeScript implementation. It is not evidence that every repository implementing an FSRS-like algorithm, every training dataset, every optimizer, or every imported dictionary shares that license. Keep optional optimizer/data additions outside the MVP until their own licenses and dependencies have been checked. Do not copy Anki source code or unrelated FSRS implementations on the assumption that the shared algorithm name makes all source code MIT. MIT metadata is also not a comprehensive patent/trademark/legal clearance; no such clearance was performed here. There is no identified license blocker for using the verified package with its notices preserved.

## Verified FSRS API and licensing

- The npm registry reports `ts-fsrs@5.4.2`; the official package metadata requires Node >=20 and declares MIT. The runtime identifies itself as `v5.4.2 using FSRS-6.0`. Pin the resolved dependency in the lockfile; do not claim automatic optimizer training.
- Upstream API: `fsrs(partialParameters)`, `createEmptyCard(now)`, `scheduler.next(card, now, Rating.Good)`, and `scheduler.repeat(card, now)` returning possible grade outcomes. Save both the returned `card` and returned `log`.
- The setting is **`request_retention`**, not `desired_retention`. Default 0.9 is a scheduling target, not a measured success rate. Keep app inputs safely bounded (proposed 0.8–0.97); never accept NaN, Infinity, zero, or one.
- Library states are only New=0, Learning=1, Review=2, Relearning=3. Learned, Mature, Suspended, and app acquisition stages belong to the app model, not the FSRS numeric enum. Being due is a timestamp predicate, not a new FSRS enum transition.
- Current Card fields include `due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `learning_steps`, `reps`, `lapses`, `state`, optional `last_review`. Preserve them all. `elapsed_days` and log `last_elapsed_days` are deprecated for a future major release, so introduce a schema migration before any major upgrade.
- `get_retrievability(card, now, false)` returns a numeric model estimate. The default returns a formatted percentage string. Derive it at view time because it changes with time; do not present it as observed accuracy.

Official sources: [package metadata](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/package.json), [API methods](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/src/fsrs.ts), [model types](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/src/models.ts), [defaults](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/src/constant.ts), [MIT license](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/LICENSE).

The installed package LICENSE must accompany distributed notices. Upstream main currently names Copyright (c) 2026 Open Spaced Repetition; preserve the actual installed notice instead of substituting a guessed author/date.

## Recommended acquisition-to-FSRS handoff

Copying is **exposure**, not successful retrieval, but now counts as stage 1 of the requested workflow. Graduation requires correct Copy, Definition and Audio in that order since the last acquisition failure. Failure resets the current cycle while retaining all historical answers. Cloze is unscheduled practice. This three-stage protocol is a product preference, not a research-established acquisition criterion.

Recommended adapter (syntax-valid TypeScript with requested `#` annotations inside comments):

```ts
import { createEmptyCard, fsrs, Rating } from "ts-fsrs"; // # Use the maintained library.
const now = new Date(); // # Demonstration initialization time.
const scheduler = fsrs({
  // # Configuration is unrelated to decorative worlds.
  request_retention: 0.9, // # Desired recall probability, not measured accuracy.
  enable_fuzz: false, // # Reproducible MVP scheduling and tests.
  enable_short_term: true, // # Keep normal lapse/relearning behavior.
  learning_steps: [], // # Application acquisition already handles initial practice.
  relearning_steps: ["10m"], // # Established library learning-step mechanism.
}); // # No custom memory formula.
const graduated = scheduler.next(createEmptyCard(now), now, Rating.Good); // # One graduation scheduling event.
```

Do not call `next` three times at graduation to represent the acquisition modalities as spaced reviews. Append one scheduler initialization event associated with the third successful acquisition attempt. Exclude that initialization from statistics labelled “scheduled reviews”. Prior acquisition attempts remain their own history type.

Source analysis confirms empty learning steps delegate the first interval to FSRS. Keeping short-term enabled allows a later Again in Review to enter Relearning. In contrast, `enable_short_term:false` selects a long-term scheduler that leaves **all** outcomes, including Again, in Review. Either configuration can be intentional, but their state semantics differ. Do not manually overwrite card state, stability, or due date to produce a preferred UI.

Official sources: [basic scheduler](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/src/impl/basic_scheduler.ts), [learning-step strategy](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/src/strategies/learning_steps.ts), [long-term scheduler](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/src/impl/long_term_scheduler.ts).

Observed runtime probe, using 5.4.2 and 2026-09-27T08:00:00Z: graduation Good -> Review, stability 2.3065, due 2026-09-29T08:00:00Z; Again at that due date -> Relearning, lapses 1, due +10 minutes; Good then -> Review, due +1 day. These are regression examples for this version/configuration, not a fixed schedule to reimplement.

In the current UI, confirmed unknown or any failed repair maps to Again, confirmed known to Good, and uncertain with both repair tests passed to Hard. Hard is for a successful but difficult recall, not forgetting. Fast typing alone does not justify Easy. The [official Anki manual](https://docs.ankiweb.net/deck-options#fsrs) explicitly warns that using Hard instead of Again for forgetting distorts FSRS. Retention-setting changes should apply to future reviews unless a distinct rescheduling operation is deliberately implemented.

## Proposed invariants

1. **Single word identity, independent learning meanings:** normalize with Unicode NFKC, trim, and English case folding. A unique normalized lemma plus set-like deck membership prevents duplicate words. Every learning group has an independent acquisition state and FSRS card. Pronunciation accent variants do not become semantic groups. Changing decks does not create another card.
2. **Atomic answers:** in one Dexie read/write transaction re-read current progress, verify a prompt/attempt ID has not already committed, append attempt, update modality counts, update acquisition or FSRS, save session cursor, and award newly earned world milestones. Advance UI only after commit. A double Enter or stale tab must not grade twice.
3. **Historical conservation:** acquisition failure, suspension, deck changes, manual known status and learning reset retain attempts and lifetime counters. The implementation increments the affected progress revision when resetting; it does not append a separate reset-history event. A confirmed full data reset is different.
4. **Queue order:** prefer a different canonical spelling when another selected word is pending. A single word may continue through all three steps; no extra filler is needed. Persist the session and current stage across reload. Another sense of the same lemma is not a different word.
5. **Eligibility:** a prompt requires its real data: definition, functioning audio, or a cloze sentence that actually contains the target/accepted variant. A missing-data skip is not success or failure. It leaves acquisition pending. Never count an on-screen definition replacement as an Audio success.
6. **Daily gate:** recompute active due cards (`due <= now`, not suspended) at study start and before introducing new words. Remaining due cards block new introductions. A practice queue or review quota must not hide them. Overdue is a clearly documented local-calendar subset. Backlog recommendation may return zero new words but cannot reschedule anything.
7. **Honest statistics:** positive confirmed review outcomes include self-reported known and passed uncertain events; they are not empirical unaided meaning accuracy. Typed meaning/audio accuracy stays separate. Show an em dash with no results. Copying and dictionary browsing do not prove recall.
8. **Forecast honesty:** count current next-due dates into future buckets and label them a projection of already scheduled cards. Such counts omit subsequent future reviews and new learning; do not call them a full workload simulation.
9. **World separation:** read-only world projection receives statistics and central thresholds. It must never import the scheduling adapter or write learning tables. Hide-world settings only control rendering.
10. **Nonpunitive accumulated world:** define current maturity from explicit criteria (proposed Review, stability >=21 days, and >=3 successful spaced reviews), and separately persist an `everMaturedAt` milestone the first time met. Current maturity may decrease after a lapse; an earned aquarium does not. Likewise save `firstAcquiredAt` once. Derive the world from distinct lifetime milestone counts; store a small tier/high-water mark only if needed for future migrations. No day change, loss of streak, lapse, suspension, or per-word reset removes earned scenery.

The maturity threshold is a product convention, not a scientific claim that a word is permanently mastered. Do not award maturity from three same-session acquisition successes. The implementation retains `everAcquired`/`everMature` flags and high-water world counts; it does not invent historical milestone timestamps. Each group retains its own current maturity, and a word can still have other new or weak meanings.

Definition and cloze tasks project only the active learning group. Cloze validates a complete target token and grades against `expectedAnswer` plus explicit accepted forms; a substring of another word is insufficient. Audio attempt commits require completed playback and an owned current pronunciation ID. Whole-word TTS is disabled when active groups have different lexical pronunciations, because a successful utterance event cannot verify heteronym identity. Even a correct recording checks phonological spelling, not semantic understanding.

## Backup and persistence design

Parse and validate the **entire** JSON before any writes: app identifier, supported schemaVersion, export timestamp, arrays and size limits, exact enums, unique IDs, unique normalized lexical keys, known referenced word/deck IDs, finite numeric ranges, valid ISO timestamps, FSRS card/log shapes, allowed settings values, and progress consistency. Reject unknown newer versions with a useful message. Reject conflicting repeated identifiers rather than allowing last-write-wins data loss.

In particular validate: nonnegative integer counters; `correct + incorrect = total`; modality counter sums where applicable; acquisition stage in 0–3 and distinct completed modalities; Review/Relearning cards have a valid `last_review`, positive stability, and bounded difficulty; all learned/acquired states have coherent scheduler cards; no dangling histories; no duplicate prompt IDs. Do not apply overly strict derived equality to mixed historical schema versions without migrations.

Use a single read transaction for export to get one consistent snapshot. Restore all included tables in one write transaction only after full validation; throw and let Dexie abort on any write error. Never `.catch()` and ignore individual bulk failures inside the transaction. Do not await network calls/audio/prompts inside IndexedDB transaction scope. Keep a pre-restore local snapshot/export route; replace semantics must be explicit to the user.

The [official Dexie transaction documentation](<https://dexie.org/docs/Dexie/Dexie.transaction()>) confirms commit/reject semantics and warns that unrelated async waits can prematurely close a transaction. IndexedDB is local persistence, not a permanent backup guarantee: [browser storage eviction behavior](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) varies. Offer `navigator.storage.persist()` with truthful granted/declined status and routine manual JSON exports; [persistent storage can be declined](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist).

## Offline speech limitations

The [Web Speech API specification](https://webaudio.github.io/web-speech-api/#dom-speechsynthesisvoice-localservice) distinguishes local synthesizer voices from remote voices. SpeechSynthesis availability does not establish offline audio availability. Voice lists may arrive after `voiceschanged`; prefer matching en-US/en-GB with `localService === true` while offline and handle `onerror`/timeouts visibly. Initiate playback from a user gesture where required, cancel a previous utterance, and never rely solely on `navigator.onLine` to certify playback.

Bundled starter neural audio precedes system speech and is cached as a finite asset set. Imported attributed human recordings may also be used. A bounded optional audio cache and local voice are suitable; a remote URL alone is not offline support. Audio playback unavailable -> retain progress and offer another eligible question/retry, not a fake audio pass. Core reading, spelling, review, and export can work offline while audio-dependent acquisition remains pending. No universal iPhone/offline audio guarantee can be substantiated merely from browser API support; test the target device and disclose this precise limitation.

## Meaningful automated tests

1. Copy+Definition cannot graduate; the third successful Audio creates one card. Cloze never becomes an obligatory fourth step.
2. Definition success then Audio failure resets streak/stage but preserves both attempts and per-modality totals. Continue to three new distinct successes and check previous failure still exists.
3. Multiple words alternate when available; one word finishes Copy, Definition and Audio directly. Reload preserves the saved step.
4. Graduation creates exactly one FSRS log and positive scheduled interval; no duplicate graduation on re-render/double submit. Review correct/incorrect results equal the installed library's own `next` result for fixed dates/settings.
5. Due Review card becomes eligible; failed review enters Relearning with library time; Relearning remains in due-gate calculation. A future card is not reviewed early just because the world needs growth.
6. Remaining due card blocks new introductions even across reload/direct page entry; backlog recommendation zero does not change card JSON.
7. Add the same Unicode/case-normalized lemma from three decks/import routes -> one word and one learning object. Remove membership -> progress/history unchanged.
8. Export after personal notes, acquisition failures, scheduled reviews, settings, and earned milestones; restore into fresh DB; compare all semantic values including card dates and attempts.
9. Truncated JSON, unsupported version, invalid date, NaN-like string, unknown state, duplicate IDs, dangling foreign keys, incorrect counter sums, and invalid nested FSRS fields all reject before writes; byte-equivalent pre-existing records survive.
10. Deliberately throw during restore after an earlier write; all tables roll back. Deliberately throw during an answer after attempt insert; attempt/progress/cursor all roll back together.
11. Concurrent/double submission of one prompt ID commits one attempt and one FSRS log. A persistence failure leaves the question retryable and displays an error.
12. A real scheduled successful review crossing maturity threshold awards aquarium once; a subsequent Again reduces current memory status but cannot remove earned fish; 365 days of inactivity, changed theme, world off/on, and deck moves leave due/stability/difficulty unchanged.
13. Click nested definition words, back through breadcrumb, close: question ID, typed answer, queue order, and feedback remain unchanged; add-to-personal reuses the canonical lexical object.
14. Production PWA (not Vite dev server): visit online, wait for service worker activation, go offline, reload, search, study, and export; install assets and offline routes return 200. Ensure no network dependency for seed dictionary or script fonts.
15. Simulated absent voices/audio failure never records an Audio correct attempt. Offline local voice test checks actual audio start/error handling; device audio remains a manual acceptance check.
16. Browser tests at 320 and 390 px assert `scrollWidth <= innerWidth`; keyboard Enter does not double submit; autofocus and modal focus restoration work; reduced motion suppresses animation and world-off still permits all study controls.

No claim here that a completed 21-test checklist proves all years-long reliability. Tests validate defined invariants; honest release documentation still distinguishes tested MVP behavior, device-dependent speech behavior, and future optimizer/large-dataset work.

## Implemented familiarity review (2026-10-04)

The review prompt displays only the word. Selecting known/unsure/unknown saves a draft and opens the exact scheduled learning group in the dictionary. Until **确认并继续**, changing the option modifies no progress revision, attempt counter, card or world reward. Closing the sheet leaves the draft pending. Confirmation records one recognition event and freezes its branch: known has no repair, unsure has Definition+Audio, unknown has Copy+Definition+Audio. Each repair result is saved. The group stays due until its branch completes; completed groups are graded once per batch. A due-again word can enter a new review batch afterward.

| Final confirmed option | Repair result                | FSRS grade |
| ---------------------- | ---------------------------- | ---------- |
| Known                  | No further tests             | Good       |
| Unsure                 | Both tests correct           | Hard       |
| Unsure                 | Any error                    | Again      |
| Unknown                | Any subsequent repair result | Again      |

The [Anki manual](https://docs.ankiweb.net/studying.html#answer-buttons) defines Again for failed recall and Hard for successful but difficult/doubtful recall. Initial forgetting is therefore never changed to Good by feedback-assisted spelling. The application mapping for unsure is an approximation: seeing details and then passing repair does not demonstrate what the learner could recall unaided initially. No validation of the complete custom protocol or guaranteed retention rate was found in the targeted research. FSRS receives one aggregate observation, not three same-session artificial repetitions. A known answer is a self-report, not an automatic objective semantic test; fast typing never maps to Easy.

Recognition choice, draft status, repair cursor, prior error and event identity survive reload and validated backup. Each event's final attempt records the only scheduler result; earlier attempts keep null ratings and unchanged cards. Mature-world counts use positive completed due events, not their intermediate tasks. Switching to unrelated practice cannot abandon an already confirmed repair. Duplicate confirmation and stale tabs cannot award additional reviews.

Starter pronunciation consists of 120 finite pre-generated neural clips, UK primary and US auxiliary. No model runs on the visitor's device. Automatic playback occurs on copying/listening arrival and once after each submitted typed answer. Meaning and cloze prompts do not play the target before an answer; recognition initially shows just spelling. Completed owned variant IDs are required for listening credit. Autoplay rejection is visible and manually retryable; see [MDN autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) and [AUDIO_SOURCES.md](AUDIO_SOURCES.md).
