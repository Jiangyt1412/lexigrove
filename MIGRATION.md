# Lexical migration and backup compatibility

The living-world update uses IndexedDB version 5 and backup version 3. Earlier database definitions remain in `src/db/database.ts`; version 5 lifts the existing flat records in one upgrade transaction. This migration does not recalculate FSRS intervals or manufacture past learning events.

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

Exports use version 3. Version 1 and 2 backups are lifted in memory, then fully validated with the same graph and scheduler checks as version 3. All referenced records, counters, settings, session queues and history must be coherent before any table is replaced. Unsupported newer versions and malformed files fail without replacing current data. Restore remains replacement rather than import, and the existing confirmation and safety-download flow remain in place.

Export a backup before moving between localhost and a public site: browser databases are origin-specific and GitHub Pages does not synchronize them. A backup contains personal notes and learning history, so it is excluded from the source repository and public deployment. Keep a saved copy before updating an installed PWA; the application upgrade transaction protects consistency but does not substitute for an external backup.

## Verified scope

`tests/lexicon.test.ts` upgrades a real version-4 test database and compares saved cards, dates, counters, notes, attempts, queue and world values. It also lifts older backups and rejects foreign IDs and invalid cloze targets. The browser suite checks independent groups, entry/pronunciation switching, same-POS heteronyms, editing and inflected cloze history. These checks establish the specified migration invariants; they do not establish years of uninterrupted storage or cross-device synchronization.

The transactional upgrade API is documented by [Dexie](<https://dexie.org/docs/Version/Version.upgrade()>). Source validation and retained previous database versions are essential; blindly changing the schema version is insufficient.
