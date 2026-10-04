import Dexie, { type EntityTable } from "dexie"; // # Versioned IndexedDB tables and atomic writes.
import {
  type Lexical,
  type Progress,
  type Attempt,
  type Settings,
  type Session,
  type World,
  defaultSettings,
  freshProgress,
  normalize,
} from "../types/model"; // # Lexical and learning data stay separate.
import {
  hydrateWord,
  learningUnits,
  senseIdentity,
  mergeLexicon,
  syncPrimary,
  assertLexicalOwnership,
} from "../vocabulary/lexicon"; // # Each learning group owns an independent scheduler record.
export class GroveDB extends Dexie {
  words!: EntityTable<Lexical, "id">;
  progress!: EntityTable<Progress, "id">;
  attempts!: EntityTable<Attempt, "id">;
  settings!: EntityTable<Settings, "id">;
  sessions!: EntityTable<Session, "id">;
  world!: EntityTable<World, "id">;
  constructor(name = "lexigrove-v1") {
    super(name);
    this.version(1).stores({
      words: "id,&normalizedWord,*decks,*tags",
      progress: "id,acquiredAt,lastReviewedAt",
      attempts: "id,wordId,at,mode",
      settings: "id",
      sessions: "id",
      world: "id",
    });
    this.version(2)
      .stores({})
      .upgrade(async (tx) => {
        const attempts = await tx.table("attempts").toArray();
        const counts = new Map<string, number>();
        for (const a of attempts)
          if (a.mode === "review" && a.correct)
            counts.set(a.wordId, (counts.get(a.wordId) ?? 0) + 1);
        await tx
          .table("progress")
          .toCollection()
          .modify((p) => {
            p.reviewSuccesses = counts.get(p.id) ?? 0;
          });
        await tx
          .table("sessions")
          .toCollection()
          .modify((s) => {
            s.token = crypto.randomUUID();
          });
      });
    this.version(3)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table("words")
          .toCollection()
          .modify((w) => {
            w.chineseDefinition ??= ""; // # Migrate lexical fields without modifying learning history.
            w.chineseSource ??= "";
          });
        await tx
          .table("settings")
          .toCollection()
          .modify((s) => {
            s.showChinese ??= true;
            s.voiceURI ??= "";
          });
      });
    this.version(4)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table("words")
          .toCollection()
          .modify((w) => {
            w.ipa ??= "";
            w.wordFamilySource ??= "";
          });
      }); // # New lexical metadata has no effect on existing acquisition stages or FSRS cards.
    this.version(5)
      .stores({
        progress: "id,wordId,learningSenseId,acquiredAt,lastReviewedAt",
        attempts: "id,wordId,learningSenseId,at,mode",
      })
      .upgrade(async (tx) => {
        const words = (await tx.table("words").toArray()).map(hydrateWord);
        await tx.table("words").bulkPut(words);
        const units = learningUnits(words);
        await tx
          .table("progress")
          .toCollection()
          .modify((p) => {
            const unit = units.find((u) => u.id === p.id);
            if (unit) Object.assign(p, senseIdentity(unit));
          });
        const savedIds = new Set(
          (await tx.table("progress").toArray()).map((p) => p.id),
        );
        for (const unit of units)
          if (!savedIds.has(unit.id))
            await tx
              .table("progress")
              .add({ ...freshProgress(unit.id), ...senseIdentity(unit) });
        await tx
          .table("attempts")
          .toCollection()
          .modify((a) => {
            const unit = units.find((u) => u.id === a.wordId);
            if (unit) {
              a.lexicalEntryId = unit.lexicalEntryId;
              a.learningSenseId = unit.id;
              a.pronunciationId = null;
              a.expectedAnswer =
                a.modality === "cloze"
                  ? unit.clozeSpec?.expectedAnswer || unit.lemma
                  : unit.lemma;
            }
          });
        await tx
          .table("settings")
          .toCollection()
          .modify((s) => {
            s.season ??= "auto";
            s.environmentAnimation ??= s.reduceEffects ? "reduced" : "full";
          });
      }); // # Primary group IDs are the legacy word IDs; card values, history, sessions and earned worlds survive unchanged.
  }
}
export const db = new GroveDB();
export async function initialize(words: Lexical[] = []) {
  await db.transaction(
    "rw",
    db.words,
    db.progress,
    db.settings,
    db.world,
    async () => {
      if (!(await db.settings.get("settings"))) {
        await db.settings.put(defaultSettings);
        await db.world.put({ id: "world", garden: 0, aquarium: 0 });
      }
      for (const word of words) {
        const existing = await db.words
          .where("normalizedWord")
          .equals(word.normalizedWord)
          .first();
        if (!existing) {
          const hydrated = hydrateWord(word);
          await db.words.add(hydrated);
          for (const unit of learningUnits([hydrated]))
            await db.progress.add({
              ...freshProgress(unit.id),
              ...senseIdentity(unit),
            });
        } else if (
          existing.id === word.id &&
          !existing.sourceTags.includes("User edited") &&
          existing.easyDefinition === word.easyDefinition
        ) {
          const next = hydrateWord(existing),
            source = hydrateWord(word),
            primary = next.entries[0].learningGroups[0];
          if (
            existing.chineseDefinition &&
            primary.preferredLearningDefinition === existing.easyDefinition
          ) {
            primary.chineseDefinition = existing.chineseDefinition;
            primary.chineseSource = existing.chineseSource;
          }
          if (
            !existing.chineseDefinition &&
            primary.preferredLearningDefinition === word.easyDefinition
          ) {
            primary.chineseDefinition = word.chineseDefinition;
            primary.chineseSource = word.chineseSource;
          }
          if (!existing.ipa) {
            const neutral = source.entries[0].pronunciations.find(
              (p) => p.locale === "neutral" && p.ipa,
            );
            if (neutral) {
              const present = next.entries[0].pronunciations.find(
                (p) => p.locale === "neutral",
              );
              if (present) present.ipa = neutral.ipa;
              else {
                next.entries[0].pronunciations.push(neutral);
                primary.pronunciationIds.push(neutral.pronunciationId);
              }
            }
          }
          if (!existing.wordFamily.length) {
            next.familyLinks = source.familyLinks;
            next.wordFamilySource = source.wordFamilySource;
          }
          await db.words.put(syncPrimary(next)); // # Enrich matching starter senses while preserving edits, notes and all progress.
        }
      }
    },
  );
}
export async function addWord(entry: Lexical) {
  return db.transaction("rw", db.words, db.progress, async () => {
    const existing = await db.words
      .where("normalizedWord")
      .equals(normalize(entry.lemma))
      .first();
    const word = existing ? mergeLexicon(existing, entry) : hydrateWord(entry);
    assertLexicalOwnership(word, await db.words.toArray()); // # A conflicting imported identifier cannot inherit an unrelated word's progress.
    await db.words.put(word);
    for (const unit of learningUnits([word]))
      if (!(await db.progress.get(unit.id)))
        await db.progress.add({
          ...freshProgress(unit.id),
          ...senseIdentity(unit),
        });
    return word.id;
  });
}
export async function saveSettings(patch: Partial<Settings>) {
  const { settingsSchema } = await import("../types/model");
  await db.transaction("rw", db.settings, async () => {
    const current = (await db.settings.get("settings")) ?? defaultSettings;
    await db.settings.put(settingsSchema.parse({ ...current, ...patch }));
  });
}
