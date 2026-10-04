# Lexical migration and backup compatibility

The living-world update uses IndexedDB version 7 and backup version 5. Earlier database definitions remain in `src/db/database.ts`; version 5 lifts the existing flat records in one upgrade transaction. This migration does not recalculate FSRS intervals or manufacture past learning events.

## Identity and ownership

| Record           | Owner and stable identity                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Word             | One canonical ID per normalized lemma; decks, tags and personal notes stay here.                                                       |
| Lexical entry    | Belongs to a word and owns its part of speech, pronunciations and dictionary senses.                                                   |
| Pronunciation    | Belongs to one entry, with neutral/US/UK locale and optional attributed recording.                                                     |
| Dictionary sense | Belongs to one entry; multiple full definitions can map to fewer teaching groups.                                                      |
| Learning group   | References only its entry's pronunciations/senses; has its own acquisition and FSRS progress.                                          |
| Attempt          | Stores word, entry and group IDs; audio records the played pronunciation ID, and cloze records the actual grammatical expected answer. |

Each old word becomes one entry with one primary learning group. The primary group reuses the old word ID, preserving old progress and session queue references. Additional old full definitions become dictionary senses rather than automatically acquiring duplicate cards. Existing card fields, ISO timestamps, counters, revision numbers, attempts, notes, memberships and world high-water counts remain unchanged. New group fields merely establish ownership. New settings default to Auto season and Full animation while retaining earlier preferences, including the legacy reduced-effects setting.

Old attempt pronunciation IDs remain null: the old format did not record which voice variant actually played. The migrator does not infer that history from today's preference. Old expected answers use the old lemma. New cloze questions can store an inflected expected answer explicitly. Editing a pronunciation retains the previous variant for valid historical references; changing one group does not reset sibling cards.

## Import and edit behavior

Import is a merge: matching normalized lemmas reuse the existing word. Compatible entry/group metadata fills missing fields; genuine new entries and learning groups receive fresh IDs and new progress. Conflicting IDs, cross-entry references and ambiguous heteronym mappings are rejected before writing. An entry ID cannot silently change part of speech. Structured JSON can state pronunciation-to-meaning relationships explicitly. New incomplete words can remain in the library but are ineligible for acquisition until their required lexical material is available.

The editor changes only the selected teaching meaning. Shared dictionary senses are copied before a group-specific edit, so sibling content remains intact. Changed English definitions clear an old Chinese hint when retaining it would misalign the translation. Family part-of-speech labels are shown only when a stored target entry provides them.

## Backup restore

Exports use version 5. Version 1, 2, 3 and 4 backups are lifted in memory, then fully validated with the same graph and scheduler checks as version 5. All referenced records, counters, settings, session queues and history must be coherent before any table is replaced. Unsupported newer versions and malformed files fail without replacing current data. Restore remains replacement rather than import, and the existing confirmation and safety-download flow remain in place.

Export a backup before moving between localhost and a public site: browser databases are origin-specific and GitHub Pages does not synchronize them. A backup contains personal notes and learning history, so it is excluded from the source repository and public deployment. Keep a saved copy before updating an installed PWA; the application upgrade transaction protects consistency but does not substitute for an external backup.

## Verified scope

`tests/lexicon.test.ts` upgrades a real version-4 test database and compares saved cards, dates, counters, notes, attempts, queue and world values. It also lifts older backups and rejects foreign IDs and invalid cloze targets. The browser suite checks independent groups, entry/pronunciation switching, same-POS heteronyms, editing and inflected cloze history. These checks establish the specified migration invariants; they do not establish years of uninterrupted storage or cross-device synchronization.

The transactional upgrade API is documented by [Dexie](<https://dexie.org/docs/Version/Version.upgrade()>). Source validation and retained previous database versions are essential; blindly changing the schema version is insufficient.

## UK audio update: database 6

Version 6 applies UK accent, bundled audio first, automatic pronunciation enabled and automatic fallback voice selection once. Later manual choices remain in effect. Starter enrichment fills missing audio while preserving existing pronunciation IDs, custom recordings, user edits and all cards. The obsolete `reviewCloze` setting remains readable for backup compatibility; current reviews do not use it.

## Three-stage acquisition and recognition review: database 7 / backup 5

Existing FSRS card fields, history, lifetime counters, notes and earned worlds remain unchanged. The new recognition counter starts at zero. Unacquired legacy stages move as follows:

| Legacy state                 | Current stage | Next task              |
| ---------------------------- | ------------- | ---------------------- |
| Not introduced               | 0             | Copy                   |
| Introduced, old stage 0      | 1             | Definition             |
| Introduced, old stage 1 or 2 | 2             | Audio                  |
| Existing card, stage 3       | 3             | Keep existing due date |

Old copying was outside the acquisition tests. The mapping preserves completed exposure/meaning. An old stage-2 word repeats listening instead of fabricating an acquisition event or silently creating a card. Past cloze attempts remain in history, with their original grammatical expected answers.

An unfinished legacy review retains its queue, answers and cards, but restarts its remaining due words at recognition under a fresh session token. It does not infer a familiarity choice or silently grade previous partial answers. New recognition sessions persist editable drafts, confirmed choices, repair step counts and failure flags. Selecting or changing a draft modifies no card/history; confirmation begins the chosen branch. The final event uses Good for known, Hard for passed unsure, Again for unknown or any repair error. `reviewSuccesses` counts one positive rated event, not separate exercises. Old one-task and version-4 grouped histories keep their original grades.

Version-5 backups validate current cursor against confirmed history and validate complete recognition event sequences even when the active session later changes. Intermediate cards must remain unchanged; a terminal event must add exactly one scheduler repetition. Listening needs an owned completed pronunciation ID. Versions 1–4 migrate in memory before validation; invalid files are rejected before a replacement transaction. A version-5 export needs an updated app to restore. Tests cover original version-4 database lift, older backup lift, all partial acquisition mappings, draft restore, heard-audio requirements, modified choices and one scheduler update.
