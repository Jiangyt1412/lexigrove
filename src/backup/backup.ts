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
  recognitionSteps,
  migrateAcquisitionStage,
} from "../types/model"; // # Explicit versioned format; unsupported future versions cannot erase data.
import {
  hydrateWord,
  learningUnits,
  senseIdentity,
} from "../vocabulary/lexicon"; // # Backup v3 preserves the lexical graph and independent group histories.
export const backupSchema = z
  .object({
    format: z.literal("lexigrove-backup"),
    version: z.literal(5),
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
      b.sessions.some(
        (s) =>
          s.wordIds.some((id) => !groupIds.has(id)) ||
          Object.keys(s.review?.groups ?? {}).some(
            (id) => !s.wordIds.includes(id),
          ) ||
          Object.keys(s.recall?.groups ?? {}).some(
            (id) => !s.wordIds.includes(id),
          ),
      )
    )
      fail("Broken word references.");
    const recognitionEvents = new Map<string, typeof b.attempts>();
    for (const a of b.attempts) {
      if (a.modality === "recognition" && !a.reviewChoice)
        fail("Recognition history lacks a confirmed choice.");
      if (!a.reviewChoice) continue;
      if (
        a.mode !== "review" ||
        !a.reviewGroupId ||
        a.reviewStep === undefined
      ) {
        fail("Recognition history lacks its scheduled event identity.");
        continue;
      }
      const events = recognitionEvents.get(a.reviewGroupId) ?? [];
      events.push(a);
      recognitionEvents.set(a.reviewGroupId, events);
    }
    for (const events of recognitionEvents.values()) {
      events.sort((a, b) => a.reviewStep! - b.reviewStep!);
      const choice = events[0].reviewChoice!,
        plan = ["recognition", ...recognitionSteps(choice)],
        finished = events.length === plan.length;
      const rating =
        choice === "unknown" || events.slice(1).some((a) => !a.correct)
          ? 1
          : choice === "unsure"
            ? 2
            : 3;
      if (
        events.length > plan.length ||
        events.some(
          (a, i) =>
            a.learningSenseId !== events[0].learningSenseId ||
            a.reviewChoice !== choice ||
            a.reviewStep !== i ||
            a.modality !== plan[i] ||
            (i === 0 &&
              (a.answer !== choice || a.correct !== (choice === "known"))) ||
            (a.modality === "audio" && !a.pronunciationId) ||
            a.rating !==
              (finished && i === events.length - 1 ? rating : null) ||
            !a.before ||
            !a.after ||
            (a.rating === null &&
              JSON.stringify(a.before) !== JSON.stringify(a.after)) ||
            (a.rating !== null &&
              (a.after.reps !== a.before.reps + 1 ||
                a.after.last_review?.getTime() !== a.at)),
        )
      )
        fail(
          "Recognition history cannot represent a single coherent review event.",
        );
    } // # Validate finished events even after another session replaces the active cursor; a repaired spelling cannot forge a Good rating for initial forgetting.
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
      h.reviewSuccesses += Number(
        attempt.mode === "review" &&
          attempt.rating !== null &&
          attempt.rating >= 2,
      ); // # Only a successful completed group earns one scheduled-review milestone.
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
      for (const m of [
        "copy",
        "definition",
        "audio",
        "cloze",
        "recognition",
      ] as const) {
        if (
          p.accuracy[m].total !== (h?.modalities[m]?.total ?? 0) ||
          p.accuracy[m].correct !== (h?.modalities[m]?.correct ?? 0)
        )
          fail("Modality history is inconsistent.");
      }
    }
    for (const session of b.sessions) {
      if (session.review && session.mode !== "review")
        fail("Grouped review cursor belongs to a non-review session.");
      for (const [id, group] of Object.entries(session.review?.groups ?? {})) {
        const events = b.attempts.filter(
          (a) => a.reviewGroupId === `${session.token}:${id}`,
        );
        if (
          events.length !== group.completed ||
          events.some((a) => a.mode !== "review" || a.learningSenseId !== id) ||
          group.failed !== events.some((a) => !a.correct)
        )
          fail("Grouped review cursor does not match saved answers.");
      }
      if (session.recall && (session.mode !== "review" || session.review))
        fail("Recognition cursor belongs to an incompatible session.");
      for (const [id, group] of Object.entries(session.recall?.groups ?? {})) {
        const events = b.attempts
          .filter((a) => a.reviewGroupId === `${session.token}:${id}`)
          .sort((a, b) => (a.reviewStep ?? -1) - (b.reviewStep ?? -1));
        const plan = recognitionSteps(group.choice),
          confirmed = group.phase !== "draft";
        if (
          group.completed > plan.length ||
          (group.phase === "complete") !==
            (confirmed && group.completed === plan.length) ||
          (!confirmed && (group.completed !== 0 || group.failed)) ||
          events.length !== (confirmed ? group.completed + 1 : 0) ||
          events.some(
            (a, index) =>
              a.mode !== "review" ||
              a.learningSenseId !== id ||
              a.reviewChoice !== group.choice ||
              a.reviewStep !== index ||
              a.modality !== (index === 0 ? "recognition" : plan[index - 1]) ||
              (a.rating !== null) !==
                (group.phase === "complete" && index === events.length - 1),
          ) ||
          group.failed !== events.slice(1).some((a) => !a.correct)
        )
          fail(
            "Recognition choices and repair cursor do not match saved history.",
          );
        const last = events.at(-1),
          expectedRating =
            group.choice === "unknown" || group.failed
              ? 1
              : group.choice === "unsure"
                ? 2
                : 3;
        if (group.phase === "complete" && last?.rating !== expectedRating)
          fail("Completed familiarity rating is inconsistent.");
      } // # A restored draft cannot fabricate confirmation or an unheard listening answer.
    } // # Restoring a half-finished group cannot invent a passed listening step or discard an earlier failed answer.
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
        version: 5,
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
    return migrateBackup(b);
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    value.version === 3
  ) {
    return migrateBackup({ ...structuredClone(value), version: 4 }); // # Old history has one scheduled event per review attempt; new groups mark only their final attempt with a rating.
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    value.version === 4
  ) {
    const b = structuredClone(value) as Record<string, any>;
    if (!Array.isArray(b.progress) || !Array.isArray(b.sessions)) return value;
    for (const p of b.progress) {
      if (p && p.accuracy) p.accuracy.recognition ??= { correct: 0, total: 0 };
      if (p && typeof p.introduced === "boolean" && typeof p.stage === "number")
        migrateAcquisitionStage(p);
    }
    for (const session of b.sessions)
      if (session?.mode === "review") {
        delete session.review;
        session.recall = { groups: {} };
        session.token = crypto.randomUUID();
      }
    b.version = 5;
    return b; // # Preserve all histories and FSRS cards; old unfinished groups restart recognition without grading their earlier answers again.
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
