import { z } from "zod"; // # Reject malformed or inconsistent backups before opening a write transaction.
import { db, type GroveDB } from "../db/database"; // # All tables are restored atomically.
import {
  lexicalSchema,
  progressSchema,
  attemptSchema,
  settingsSchema,
  sessionSchema,
  worldSchema,
  normalize,
} from "../types/model"; // # Explicit versioned format; unsupported future versions cannot erase data.
import {
  hydrateWord,
  learningUnits,
  senseIdentity,
} from "../vocabulary/lexicon"; // # Backup v3 preserves the lexical graph and independent group histories.
export const backupSchema = z
  .object({
    format: z.literal("lexigrove-backup"),
    version: z.literal(3),
    exportedAt: z.string().datetime(),
    words: z.array(lexicalSchema).max(100000),
    progress: z.array(progressSchema).max(100000),
    attempts: z.array(attemptSchema).max(1000000),
    settings: settingsSchema,
    sessions: z.array(sessionSchema).max(1),
    world: worldSchema,
  })
  .strict()
  .superRefine((b, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    const unique = (v: string[]) => new Set(v).size === v.length;
    if (
      !unique(b.words.map((w) => w.id)) ||
      !unique(b.words.map((w) => w.normalizedWord)) ||
      !unique(b.progress.map((p) => p.id)) ||
      !unique(b.attempts.map((a) => a.id))
    )
      fail("Duplicate identifiers or lemmas.");
    const lexicalIds = b.words.flatMap((w) =>
      w.entries.flatMap((e) => [
        e.entryId,
        ...e.pronunciations.map((p) => p.pronunciationId),
        ...e.senses.map((s) => s.senseId),
        ...e.learningGroups.map((g) => g.learningSenseId),
      ]),
    );
    if (!unique(lexicalIds)) fail("Duplicate lexical graph identifiers.");
    if (
      b.attempts.some(
        (a) =>
          a.pronunciationId &&
          !b.words
            .find((w) => w.id === a.wordId)
            ?.entries.find((e) => e.entryId === a.lexicalEntryId)
            ?.pronunciations.some(
              (p) => p.pronunciationId === a.pronunciationId,
            ),
      )
    )
      fail("Audio history references another entry or pronunciation."); // # An edited group can use a new variant; its earlier played variant still belongs to the same entry.
    if (b.words.some((w) => normalize(w.lemma) !== w.normalizedWord))
      fail("Inconsistent normalized lemma.");
    const ids = new Set(b.words.map((w) => w.id));
    const units = learningUnits(b.words),
      groupIds = new Set(units.map((u) => u.id));
    if (
      b.progress.length !== units.length ||
      b.progress.some(
        (p) =>
          !groupIds.has(p.id) ||
          !ids.has(p.wordId) ||
          !units.some(
            (u) =>
              u.id === p.id &&
              u.wordId === p.wordId &&
              u.lexicalEntryId === p.lexicalEntryId &&
              p.learningSenseId === p.id,
          ),
      ) ||
      b.attempts.some(
        (a) =>
          !ids.has(a.wordId) ||
          !units.some(
            (u) =>
              u.id === a.learningSenseId &&
              u.wordId === a.wordId &&
              u.lexicalEntryId === a.lexicalEntryId,
          ),
      ) ||
      b.sessions.some((s) => s.wordIds.some((id) => !groupIds.has(id)))
    )
      fail("Broken word references.");
    const history = new Map<
      string,
      {
        total: number;
        correct: number;
        reviewSuccesses: number;
        modalities: Record<string, { total: number; correct: number }>;
      }
    >();
    for (const attempt of b.attempts) {
      if (attempt.mode === "practice") continue;
      let h = history.get(attempt.learningSenseId);
      if (!h) {
        h = { total: 0, correct: 0, reviewSuccesses: 0, modalities: {} };
        history.set(attempt.learningSenseId, h);
      }
      h.total++;
      h.correct += Number(attempt.correct);
      h.reviewSuccesses += Number(attempt.mode === "review" && attempt.correct);
      h.modalities[attempt.modality] ??= { total: 0, correct: 0 };
      h.modalities[attempt.modality].total++;
      h.modalities[attempt.modality].correct += Number(attempt.correct);
    }
    for (const p of b.progress) {
      const h = history.get(p.id);
      if (
        p.attempts !== (h?.total ?? 0) ||
        p.correct !== (h?.correct ?? 0) ||
        p.reviewSuccesses !== (h?.reviewSuccesses ?? 0)
      )
        fail("History counters do not match attempts.");
      for (const m of ["copy", "definition", "audio", "cloze"] as const) {
        if (
          p.accuracy[m].total !== (h?.modalities[m]?.total ?? 0) ||
          p.accuracy[m].correct !== (h?.modalities[m]?.correct ?? 0)
        )
          fail("Modality history is inconsistent.");
      }
    }
  });
export type Backup = z.infer<typeof backupSchema>;
export async function createBackup(database: GroveDB = db) {
  return database.transaction(
    "r",
    [
      database.words,
      database.progress,
      database.attempts,
      database.settings,
      database.sessions,
      database.world,
    ],
    async () =>
      backupSchema.parse({
        format: "lexigrove-backup",
        version: 3,
        exportedAt: new Date().toISOString(),
        words: await database.words.toArray(),
        progress: await database.progress.toArray(),
        attempts: await database.attempts.toArray(),
        settings: await database.settings.get("settings"),
        sessions: await database.sessions.toArray(),
        world: await database.world.get("world"),
      }),
  );
}
export function migrateBackup(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    value.version === 1 &&
    "attempts" in value &&
    Array.isArray(value.attempts) &&
    "progress" in value &&
    Array.isArray(value.progress) &&
    "sessions" in value &&
    Array.isArray(value.sessions)
  ) {
    const b = structuredClone(value) as Record<string, any>;
    const counts = new Map<string, number>();
    for (const a of b.attempts)
      if (a?.mode === "review" && a.correct === true)
        counts.set(a.wordId, (counts.get(a.wordId) ?? 0) + 1);
    b.version = 2;
    b.progress = b.progress.map((p: Record<string, unknown>) => ({
      ...p,
      reviewSuccesses: counts.get(String(p.id)) ?? 0,
    }));
    b.sessions = b.sessions.map((s: Record<string, unknown>) => ({
      ...s,
      token: typeof s.token === "string" ? s.token : crypto.randomUUID(),
    }));
    return migrateBackup(b);
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    value.version === 2
  ) {
    const b = structuredClone(value) as Record<string, any>;
    if (
      !Array.isArray(b.words) ||
      !Array.isArray(b.progress) ||
      !Array.isArray(b.attempts) ||
      !Array.isArray(b.sessions)
    )
      return value;
    b.words = b.words.map(hydrateWord);
    const units = learningUnits(b.words);
    b.progress = b.progress.map((p: Record<string, any>) => {
      const u = units.find((u) => u.id === p.id);
      return u ? { ...p, ...senseIdentity(u) } : p;
    });
    b.attempts = b.attempts.map((a: Record<string, any>) => {
      const u = units.find((u) => u.id === a.wordId);
      return u
        ? {
            ...a,
            lexicalEntryId: u.lexicalEntryId,
            learningSenseId: u.id,
            pronunciationId: null,
            expectedAnswer:
              a.modality === "cloze"
                ? u.clozeSpec?.expectedAnswer || u.lemma
                : u.lemma,
          }
        : a;
    });
    b.version = 3;
    return b;
  }
  return value;
}
export function parseBackup(content: string) {
  if (content.length > 100000000)
    throw Error("Backup exceeds the 100 MB safety limit.");
  return backupSchema.parse(migrateBackup(JSON.parse(content)));
}
export async function restoreBackup(value: unknown, database: GroveDB = db) {
  const b = backupSchema.parse(migrateBackup(value));
  await database.transaction(
    "rw",
    [
      database.words,
      database.progress,
      database.attempts,
      database.settings,
      database.sessions,
      database.world,
    ],
    async () => {
      await Promise.all(database.tables.map((t) => t.clear()));
      await database.words.bulkAdd(b.words);
      await database.progress.bulkAdd(b.progress);
      await database.attempts.bulkAdd(b.attempts);
      await database.settings.put(b.settings);
      await database.sessions.bulkAdd(b.sessions);
      await database.world.put(b.world);
    },
  );
}
export function downloadFile(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportBackup() {
  const backup = await createBackup();
  downloadFile(
    `lexigrove-backup-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(backup, null, 2),
  );
  await db.settings.update("settings", { lastBackup: Date.now() });
}
