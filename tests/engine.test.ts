import "fake-indexeddb/auto"; // # Real Dexie transactions in an isolated in-memory database.
import { beforeEach, afterAll, describe, it, expect } from "vitest";
import { db, initialize, addWord, saveSettings } from "../src/db/database";
import { manualEntry, freshProgress } from "../src/types/model";
import {
  startSession,
  nextTask,
  submitTask as commitTask,
  deferAudioTask,
  dueWords,
  suggestedNew,
  cloze,
  resetProgress,
  selectReviewChoice,
} from "../src/learning/engine";
import { createBackup, restoreBackup, parseBackup } from "../src/backup/backup";
import { isMature, projectWorld } from "../src/world/progression";
import { parseImport, commitImport, previewImport } from "../src/import/import";
import { characterDiff } from "../src/utils/diff";
import { statistics } from "../src/statistics/statistics"; // # Completed due groups count once even when their final answer is correct after an earlier error.
const submitTask: typeof commitTask = (
  task,
  answer,
  attemptId,
  heard,
  now,
  pronunciationId = task.word.pronunciationIds?.[0] ?? null,
) => commitTask(task, answer, attemptId, heard, now, pronunciationId); // # Unit fixtures simulate completed playback and identify the associated variant.
const word = manualEntry(
  "mitigate",
  "To make less severe.",
  "We mitigate the risk.",
);
let testClock = Date.now();
const companion = manualEntry(
  "severe",
  "Very serious.",
  "The severe storm ended.",
);
beforeEach(async () => {
  testClock = Date.now();
  await db.delete();
  await db.open();
  await initialize([word, companion]);
});
afterAll(async () => {
  await db.delete();
});
async function current(now = Date.now()) {
  return nextTask(
    (await db.sessions.get("active"))!,
    await db.words.toArray(),
    await db.progress.toArray(),
    true,
    now,
  )!;
}
async function step(id: string, answer: string, heard = true) {
  for (let i = 0; i < 20; i++) {
    const task = await current();
    if (!task) throw Error("No task");
    if (task.word.id === id)
      return submitTask(task, answer, crypto.randomUUID(), heard, ++testClock);
    await submitTask(
      task,
      task.word.lemma,
      crypto.randomUUID(),
      true,
      ++testClock,
    );
  }
  throw Error("Target not reachable");
}
async function graduate() {
  await startSession("acquire");
  await step(word.id, "mitigate");
  await step(word.id, "mitigate");
  await step(word.id, "mitigate");
  return (await db.progress.get(word.id))!;
}
async function audioTask() {
  await startSession("acquire"); // # Reach a real interleaved audio prompt.
  for (let i = 0; i < 10; i++) {
    const task = await current();
    if (task.modality === "audio") return task;
    await submitTask(
      task,
      task.word.lemma,
      crypto.randomUUID(),
      true,
      ++testClock,
    );
  }
  throw Error("No audio task reached");
}
describe("acquisition and FSRS", () => {
  it("requires exactly copying, meaning and listening before FSRS", async () => {
    await startSession("acquire");
    await step(word.id, "mitigate");
    await step(word.id, "mitigate");
    expect((await db.progress.get(word.id))!.card).toBeNull();
    await step(word.id, "mitigate");
    const p = (await db.progress.get(word.id))!;
    expect(p.stage).toBe(3);
    expect(p.card!.state).toBe(2);
    expect(p.card!.due.getTime()).toBeGreaterThan(Date.now());
    const attempts = (await db.attempts.toArray()).sort((a, b) => a.at - b.at);
    expect(
      attempts.filter((a) => a.wordId === word.id).map((a) => a.modality),
    ).toEqual(["copy", "definition", "audio"]);
    for (let i = 1; i < attempts.length; i++)
      expect(attempts[i].wordId).not.toBe(attempts[i - 1].wordId);
  });
  it("a failure resets the sequence while preserving all historical attempts", async () => {
    await startSession("acquire");
    await step(word.id, "mitigate");
    await step(word.id, "mitigate");
    await step(word.id, "wrong");
    const p = (await db.progress.get(word.id))!;
    expect(p.stage).toBe(0);
    expect(p.streak).toBe(0);
    expect(p.attempts).toBe(3);
    expect(p.correct).toBe(2);
    expect(p.incorrect).toBe(1);
    expect(p.accuracy.audio.total).toBe(1);
    expect(await db.attempts.where("wordId").equals(word.id).count()).toBe(3);
  });
  it("never records an unheard audio test", async () => {
    await startSession("acquire");
    await step(word.id, "mitigate");
    await step(word.id, "mitigate");
    await expect(step(word.id, "mitigate", false)).rejects.toThrow("Play");
    expect((await db.progress.get(word.id))!.stage).toBe(2);
  });
  it("continues a single pending word without inserting a fourth filler task", async () => {
    await startSession("acquire");
    await step(word.id, "mitigate");
    const s = {
      ...(await db.sessions.get("active"))!,
      wordIds: [word.id],
      lastWord: word.id,
    };
    const task = nextTask(
      s,
      await db.words.toArray(),
      await db.progress.toArray(),
      true,
    )!;
    expect(task.word.id).toBe(word.id);
    expect(task.mode).toBe("acquisition");
    expect(task.modality).toBe("definition");
  });
  it("allows a one-word library with no example to learn all three stages", async () => {
    await db.delete();
    await db.open();
    const solo = manualEntry("retain", "To keep something.");
    await initialize([solo]);
    await startSession("acquire");
    for (const modality of ["copy", "definition", "audio"]) {
      const task = await current();
      expect(task.modality).toBe(modality);
      await submitTask(
        task,
        solo.lemma,
        crypto.randomUUID(),
        true,
        ++testClock,
      );
    }
    expect(await current()).toBeNull();
    expect((await db.progress.get(solo.id))!.card!.reps).toBe(1);
  });
  it("due words block new sessions and recommend zero new words", async () => {
    const p = await graduate();
    p.card!.due = new Date(Date.now() - 1000);
    await db.progress.put(p);
    expect(dueWords([p])).toHaveLength(1);
    expect(suggestedNew([p], 20)).toBe(0);
    await expect(startSession("acquire")).rejects.toThrow("due reviews");
  });
  it("reviews becoming due also block an already saved acquisition session", async () => {
    const p = await graduate();
    await addWord(manualEntry("retain", "To keep.", "We retain the notes."));
    await startSession("acquire");
    const task = await current();
    p.card!.due = new Date(Date.now() - 1000);
    await db.progress.put(p);
    expect(await current()).toBeNull();
    await expect(
      submitTask(task, task.word.lemma, crypto.randomUUID(), true),
    ).rejects.toThrow("Reviews are now due");
  });
  it("a draft can change from known to unknown without changing cards, counters or history", async () => {
    const p = await graduate();
    p.card!.due = new Date(Date.now() - 1000);
    await db.progress.put(p);
    await startSession("review");
    const task = await current();
    expect(task.modality).toBe("recognition");
    const before = await createBackup();
    await selectReviewChoice(task, "known");
    await selectReviewChoice(task, "unknown");
    const draft = await createBackup();
    expect(draft.progress).toEqual(before.progress);
    expect(draft.attempts).toEqual(before.attempts);
    expect(draft.world).toEqual(before.world);
    expect(draft.sessions[0].recall!.groups[word.id].choice).toBe("unknown");
    await expect(
      submitTask(task, "known", crypto.randomUUID()),
    ).rejects.toThrow("current option");
    const confirmed = await submitTask(task, "unknown", crypto.randomUUID());
    expect(confirmed.rating).toBeNull();
    expect(confirmed.after).toEqual(p.card);
    expect((await current()).modality).toBe("copy");
  });
  it("confirmed known schedules once with no repair tests, including duplicate confirmation", async () => {
    const p = await graduate();
    p.card!.due = new Date(Date.now() - 1000);
    await db.progress.put(p);
    await startSession("review");
    const task = await current(),
      id = crypto.randomUUID();
    await expect(submitTask(task, "known", id)).rejects.toThrow(
      "details first",
    );
    await selectReviewChoice(task, "unknown");
    await selectReviewChoice(task, "known");
    const done = await submitTask(task, "known", id);
    await submitTask(task, "known", id);
    expect(done.rating).toBe(3);
    expect(done.after!.reps).toBe(p.card!.reps + 1);
    expect((await db.progress.get(word.id))!.reviewSuccesses).toBe(1);
    expect(await current()).toBeNull();
    expect(
      (await createBackup()).attempts.filter((a) => a.mode === "review"),
    ).toHaveLength(1);
  });
  it("uncertain needs meaning and heard spelling, survives reload/backup, and schedules Hard only once", async () => {
    const p = await graduate();
    p.card!.due = new Date(Date.now() - 1000);
    await db.progress.put(p);
    const session = await startSession("review"),
      task = await current();
    await selectReviewChoice(task, "unsure");
    const draft = parseBackup(JSON.stringify(await createBackup()));
    expect(draft.version).toBe(5);
    await restoreBackup(draft);
    expect((await startSession("review")).token).toBe(session.token);
    expect((await current()).modality).toBe("recognition");
    await submitTask(await current(), "unsure", crypto.randomUUID());
    const definition = await current();
    expect(definition.modality).toBe("definition");
    await submitTask(definition, definition.word.lemma, crypto.randomUUID());
    expect((await db.progress.get(word.id))!.card).toEqual(p.card);
    const backup = await createBackup(),
      forged = structuredClone(backup);
    forged.sessions[0].recall!.groups[word.id].completed = 2;
    expect(() => parseBackup(JSON.stringify(forged))).toThrow("cursor");
    await restoreBackup(backup);
    const audio = await current();
    expect(audio.modality).toBe("audio");
    await expect(
      submitTask(audio, audio.word.lemma, crypto.randomUUID(), false),
    ).rejects.toThrow("Play");
    const done = await submitTask(
      audio,
      audio.word.lemma,
      crypto.randomUUID(),
      true,
    );
    expect(done.rating).toBe(2);
    expect(done.after!.reps).toBe(p.card!.reps + 1);
    expect((await db.progress.get(word.id))!.reviewSuccesses).toBe(1);
    expect(await current()).toBeNull();
    expect(
      (await createBackup()).attempts
        .filter((a) => a.mode === "review")
        .sort((a, b) => a.reviewStep! - b.reviewStep!)
        .map((a) => [a.modality, a.rating]),
    ).toEqual([
      ["recognition", null],
      ["definition", null],
      ["audio", 2],
    ]);
  });
  it("unknown repeats all three steps and successful repair cannot erase the initial forgetting", async () => {
    const p = await graduate();
    p.card!.due = new Date(Date.now() - 1000);
    await db.progress.put(p);
    await startSession("review");
    const task = await current();
    await selectReviewChoice(task, "unknown");
    await submitTask(task, "unknown", crypto.randomUUID());
    for (const modality of ["copy", "definition", "audio"]) {
      const repair = await current();
      expect(repair.modality).toBe(modality);
      const a = await submitTask(
        repair,
        repair.word.lemma,
        crypto.randomUUID(),
        true,
      );
      expect(a.rating).toBe(modality === "audio" ? 1 : null);
      if (modality !== "audio") expect(a.after).toEqual(p.card);
    }
    const updated = (await db.progress.get(word.id))!;
    expect(updated.card!.reps).toBe(p.card!.reps + 1);
    expect(updated.card!.lapses).toBe(p.card!.lapses + 1);
    expect(updated.card!.state).toBe(3);
    expect(updated.reviewSuccesses).toBe(0);
    expect(await current()).toBeNull();
    const stats = statistics(
      await db.words.toArray(),
      await db.progress.toArray(),
      await db.attempts.toArray(),
    );
    expect(stats.reviewsToday).toBe(1);
    expect(stats.retention).toBe(0);
    expect(stats.recentLapses).toBe(1);
    expect((await createBackup()).sessions[0].recall!.groups[word.id]).toEqual({
      choice: "unknown",
      phase: "complete",
      completed: 3,
      failed: false,
    });
  });
  it("failed uncertain meaning remains a lapse even after correct listening", async () => {
    const p = await graduate();
    p.card!.due = new Date(Date.now() - 1000);
    await db.progress.put(p);
    await startSession("review");
    const task = await current();
    await selectReviewChoice(task, "unsure");
    await submitTask(task, "unsure", crypto.randomUUID());
    await submitTask(await current(), "wrong", crypto.randomUUID());
    const done = await submitTask(
      await current(),
      word.lemma,
      crypto.randomUUID(),
      true,
    );
    expect(done.rating).toBe(1);
    expect(done.after!.reps).toBe(p.card!.reps + 1);
    expect((await db.progress.get(word.id))!.reviewSuccesses).toBe(0);
    parseBackup(JSON.stringify(await createBackup()));
  });
  it("rejects a stale draft after another tab confirms or replaces the session", async () => {
    const p = await graduate();
    p.card!.due = new Date(Date.now() - 1000);
    await db.progress.put(p);
    await startSession("review");
    const task = await current();
    await selectReviewChoice(task, "known");
    await submitTask(task, "known", crypto.randomUUID());
    await expect(selectReviewChoice(task, "unknown")).rejects.toThrow(
      "changed",
    );
    expect((await db.progress.get(word.id))!.card!.reps).toBe(p.card!.reps + 1);
  });
  it("a confirmed repair cannot be discarded by starting unrelated practice", async () => {
    const p = await graduate();
    p.card!.due = new Date(Date.now() - 1000);
    await db.progress.put(p);
    const session = await startSession("review"),
      task = await current();
    await selectReviewChoice(task, "unknown");
    await submitTask(task, "unknown", crypto.randomUUID());
    await expect(startSession("practice", [companion.id])).rejects.toThrow(
      "confirmed review",
    );
    expect((await startSession("review")).token).toBe(session.token);
    expect((await current()).modality).toBe("copy");
  });
  it("completed choice history remains validated after the active session is replaced", async () => {
    const p = await graduate();
    p.card!.due = new Date(Date.now() - 1000);
    await db.progress.put(p);
    await startSession("review");
    const task = await current();
    await selectReviewChoice(task, "known");
    await submitTask(task, "known", crypto.randomUUID());
    await startSession("practice", [companion.id]);
    const saved = await createBackup();
    for (const patch of [
      { reviewChoice: "unknown" },
      { reviewStep: 1 },
      { rating: 4 },
    ]) {
      const bad = structuredClone(saved),
        event = bad.attempts.find((a) => a.modality === "recognition")!;
      Object.assign(event, patch);
      await expect(restoreBackup(bad)).rejects.toThrow("Recognition history");
      expect((await db.progress.get(word.id))!.card!.reps).toBe(
        p.card!.reps + 1,
      );
    }
  });
  it("legacy partial acquisition keeps completed copying and meaning without inventing a card", async () => {
    await graduate();
    const original = await createBackup();
    for (const completed of [1, 2, 3]) {
      const legacy = { ...structuredClone(original), version: 4 };
      const p = legacy.progress.find((p) => p.id === word.id)!;
      const kept = legacy.attempts
        .filter((a) => a.wordId === word.id)
        .sort((a, b) => a.at - b.at)
        .slice(0, completed);
      for (const a of kept) {
        a.rating = null;
        a.before = null;
        a.after = null;
      }
      legacy.attempts = [
        ...legacy.attempts.filter((a) => a.wordId !== word.id),
        ...kept,
      ];
      p.stage = p.streak = completed - 1;
      p.card = null;
      p.acquiredAt = null;
      p.attempts = p.correct = completed;
      p.incorrect = 0;
      for (const m of [
        "copy",
        "definition",
        "audio",
        "cloze",
        "recognition",
      ] as const)
        p.accuracy[m] = {
          total: kept.filter((a) => a.modality === m).length,
          correct: kept.filter((a) => a.modality === m).length,
        };
      const migrated = parseBackup(JSON.stringify(legacy)),
        saved = migrated.progress.find((p) => p.id === word.id)!;
      expect(saved.stage).toBe(completed === 1 ? 1 : 2);
      expect(saved.card).toBeNull();
      expect(migrated.attempts).toEqual(legacy.attempts);
      expect(migrated.world).toEqual(legacy.world);
    }
  });
  it("legacy migration refuses invalid stages instead of silently repairing a malformed backup", async () => {
    await graduate();
    const baseline = await createBackup();
    for (const patch of [
      { stage: 3, streak: 3, card: null },
      { stage: 99, streak: 99, card: null },
      { stage: 1, streak: 2, card: null },
      { stage: 1, streak: 1, card: null, introduced: false },
    ]) {
      const legacy = { ...structuredClone(baseline), version: 4 };
      Object.assign(
        legacy.progress.find((p) => p.id === word.id)!,
        patch,
      );
      await expect(restoreBackup(legacy)).rejects.toThrow();
      expect((await db.progress.get(word.id))!.card).toEqual(
        baseline.progress.find((p) => p.id === word.id)!.card,
      );
    }
  });
  it("duplicate attempt IDs do not produce duplicate writes", async () => {
    await startSession("acquire");
    const task = await current();
    const id = crypto.randomUUID();
    await submitTask(task, task.word.lemma, id, true);
    await submitTask(task, task.word.lemma, id, true);
    expect(await db.attempts.count()).toBe(1);
  });
  it("rejects stale tasks after a different session starts", async () => {
    await startSession("acquire");
    const stale = await current();
    const replacement = await startSession("practice", [companion.id]);
    await expect(
      submitTask(stale, stale.word.lemma, crypto.randomUUID(), true),
    ).rejects.toThrow("session changed");
    expect((await db.sessions.get("active"))!.wordIds).toEqual(
      replacement.wordIds,
    );
    expect(await db.attempts.count()).toBe(0);
  });
  it("defers current audio without changing progress or recording an attempt", async () => {
    const task = await audioTask();
    const before = await createBackup();
    await deferAudioTask(task);
    const after = await createBackup();
    expect(after.progress).toEqual(before.progress);
    expect(after.attempts).toEqual(before.attempts);
    expect(after.sessions).toEqual([
      { ...before.sessions[0], lastWord: task.word.id },
    ]);
    expect((await current()).word.id).not.toBe(task.word.id);
  });
  it("rejects audio deferral after another tab replaces the session", async () => {
    const task = await audioTask();
    const replacement = await startSession("practice", [companion.id]);
    const before = await createBackup();
    await expect(deferAudioTask(task)).rejects.toThrow("session changed");
    expect(await db.sessions.get("active")).toEqual(replacement);
    expect((await createBackup()).attempts).toEqual(before.attempts);
  });
  it("rejects audio deferral after the same session advances", async () => {
    const task = await audioTask();
    await submitTask(
      task,
      task.word.lemma,
      crypto.randomUUID(),
      true,
      ++testClock,
    );
    const before = await createBackup();
    await expect(deferAudioTask(task)).rejects.toThrow("session changed");
    const after = await createBackup();
    expect(after.sessions).toEqual(before.sessions);
    expect(after.progress).toEqual(before.progress);
    expect(after.attempts).toEqual(before.attempts);
  });
  it("rejects fabricated consecutive prompts at commit time", async () => {
    await startSession("acquire");
    await step(word.id, "mitigate");
    const s = (await db.sessions.get("active"))!;
    const p = (await db.progress.get(word.id))!;
    const fake = {
      word,
      progress: p,
      revision: p.revision,
      sessionToken: s.token,
      sequence: s.completed,
      audioAvailable: true,
      mode: "acquisition" as const,
      modality: "definition" as const,
    };
    await expect(
      submitTask(fake, "mitigate", crypto.randomUUID(), true),
    ).rejects.toThrow("prompt is no longer current");
  });
  it("normalizes Unicode/case/edge spaces but requires exact spelling", async () => {
    await startSession("acquire");
    expect((await step(word.id, "  MITIGATE ")).correct).toBe(true);
    expect((await step(word.id, "mitigat")).correct).toBe(false);
    expect(cloze("We mitigate the risk.", "mitigate")).toBe(
      "We ________ the risk.",
    );
    expect(
      characterDiff("mitigate", "mitgat")
        .expected.filter((c) => c.different)
        .map((c) => c.char)
        .join(""),
    ).toBe("ie");
  });
});
describe("data integrity", () => {
  it("one word across multiple decks retains one progress object", async () => {
    await graduate();
    const prior = await db.progress.get(word.id);
    const id = await addWord(
      manualEntry(" MITIGATE ", "other definition", "", "", [
        "Academic English",
      ]),
    );
    expect(id).toBe(word.id);
    expect(await db.words.count()).toBe(2);
    expect(await db.progress.get(word.id)).toEqual(prior);
    expect((await db.words.get(word.id))!.decks).toContain("Academic English");
  });
  it("fills missing lexical data without replacing established definitions", async () => {
    const entry = manualEntry("newword");
    await addWord(entry);
    await addWord(manualEntry("newword", "A new term.", "A newword appeared."));
    expect((await db.words.get(entry.id))!.examples).toEqual([
      "A newword appeared.",
    ]);
    await addWord(manualEntry("mitigate", "wrong"));
    expect((await db.words.get(word.id))!.easyDefinition).toBe(
      word.easyDefinition,
    );
  });
  it("backup roundtrip rehydrates FSRS dates and every attempt", async () => {
    await graduate();
    const backup = await createBackup();
    await db.attempts.clear();
    await restoreBackup(parseBackup(JSON.stringify(backup)));
    expect(await db.attempts.count()).toBe(backup.attempts.length);
    expect((await db.progress.get(word.id))!.card!.due).toBeInstanceOf(Date);
    expect((await createBackup()).words).toEqual(backup.words);
  });
  it("malformed, unsupported and inconsistent backups preserve current data", async () => {
    await graduate();
    const before = await createBackup();
    for (const patch of [
      { version: 999 },
      { progress: [] },
      { words: [] },
      { settings: {} },
      { attempts: [] },
    ]) {
      await expect(restoreBackup({ ...before, ...patch })).rejects.toThrow();
      expect(await db.attempts.count()).toBe(before.attempts.length);
      expect(await db.words.count()).toBe(2);
    }
  });
  it("rejects null dates and impossible studied cards", async () => {
    await graduate();
    const b = await createBackup();
    for (const patch of [
      { due: null },
      { stability: 0 },
      { last_review: undefined },
    ]) {
      const bad = structuredClone(b);
      const p = bad.progress.find((p) => p.id === word.id)!;
      Object.assign(p.card!, patch);
      await expect(restoreBackup(bad)).rejects.toThrow();
      expect(await db.words.count()).toBe(2);
    }
  });
  it("CSV quoting, duplicate preview and field merge work atomically", async () => {
    const rows = parseImport(
      'word,definition,example,deck\nmitigate,"a, b",,New deck\nnewword,,,Custom',
      "words.csv",
    );
    expect(previewImport(rows, await db.words.toArray())).toEqual({
      added: 1,
      existing: 1,
      unknown: 1,
      conflicts: 1,
    });
    await commitImport(rows);
    expect(await db.words.count()).toBe(3);
    expect((await db.words.get(word.id))!.easyDefinition).toBe(
      word.easyDefinition,
    );
  });
  it("learning reset preserves historical totals and earned milestones", async () => {
    await graduate();
    const before = await db.progress.get(word.id);
    await resetProgress(word.id);
    const after = (await db.progress.get(word.id))!;
    expect(after.card).toBeNull();
    expect(after.attempts).toBe(before!.attempts);
    expect(after.everAcquired).toBe(true);
    expect((await createBackup()).attempts.length).toBeGreaterThan(0);
  });
  it("concurrent settings writes preserve independent changes", async () => {
    await Promise.all([
      saveSettings({ dailyTarget: 30 }),
      saveSettings({ accent: "UK" }),
    ]);
    expect((await db.settings.get("settings"))!.dailyTarget).toBe(30);
    expect((await db.settings.get("settings"))!.accent).toBe("UK");
  });
});
describe("world isolation", () => {
  it("actual graduation grows only the garden", async () => {
    await graduate();
    expect((await db.world.get("world"))!.garden).toBe(
      (await db.progress.toArray()).filter((p) => p.everAcquired).length,
    );
    expect((await db.world.get("world"))!.garden).toBeGreaterThan(0);
    expect((await db.world.get("world"))!.aquarium).toBe(0);
  });
  it("maturity requires three genuine successful scheduled reviews", () => {
    const p = freshProgress(word.id);
    p.card = {
      due: new Date(),
      last_review: new Date(),
      stability: 30,
      difficulty: 5,
      elapsed_days: 5,
      scheduled_days: 20,
      reps: 4,
      lapses: 0,
      state: 2,
      learning_steps: 0,
    };
    p.reviewSuccesses = 2;
    expect(isMature(p)).toBe(false);
    p.reviewSuccesses = 3;
    p.everAcquired = true;
    p.everMature = isMature(p);
    const before = structuredClone(p);
    expect(projectWorld([p]).aquarium).toBe(1);
    expect(p).toEqual(before);
  });
  it("missed days and lapses cannot remove earned world milestones", () => {
    const p = freshProgress(word.id);
    p.everAcquired = true;
    p.everMature = true;
    expect(
      projectWorld([p], { id: "world", garden: 50, aquarium: 20 }),
    ).toEqual({ id: "world", garden: 50, aquarium: 20 });
  });
});
