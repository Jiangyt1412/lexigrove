import { createEmptyCard, fsrs, Rating, State, type Card } from "ts-fsrs"; // # Use the maintained FSRS implementation, never a hand-written interval ladder.
import { db } from "../db/database"; // # Commit history, progress and session together.
import {
  type Progress,
  type Lexical,
  type Modality,
  type Session,
  type Attempt,
  normalize,
  defaultSettings,
  freshProgress,
} from "../types/model"; // # Typed study state.
import { isMature, projectWorld } from "../world/progression"; // # Milestones are consumers of learning data.
import { learningUnits, type LearningUnit } from "../vocabulary/lexicon"; // # Queue IDs are learning groups, not bare spellings.
export const TESTS: Modality[] = ["definition", "audio", "cloze"];
export const schedule = (retention: number) =>
  fsrs({
    request_retention: retention,
    enable_fuzz: false,
    enable_short_term: true,
    learning_steps: [],
    relearning_steps: ["10m"],
  });
export function dueWords(progress: Progress[], now = Date.now()) {
  return progress
    .filter(
      (p) => !p.suspended && !p.known && p.card && p.card.due.getTime() <= now,
    )
    .sort((a, b) => a.card!.due.getTime() - b.card!.due.getTime());
}
export function suggestedNew(
  progress: Progress[],
  target: number,
  now = Date.now(),
) {
  return dueWords(progress, now).length ? 0 : target;
}
export function learningState(p?: Progress, now = Date.now()) {
  if (!p) return "New";
  if (p.suspended) return "Suspended";
  if (p.known) return "Known";
  if (p.card?.state === State.Relearning) return "Relearning";
  if (isMature(p)) return "Mature";
  if (p.card) return p.card.due.getTime() <= now ? "Review" : "Learned";
  return p.introduced ? "Learning" : "New";
}
export function hasCloze(word: Lexical) {
  return word.clozeSpec
    ? !!word.clozeSpec.sentence &&
        cloze(word.clozeSpec.sentence, word.clozeSpec.target) !==
          word.clozeSpec.sentence
    : word.examples.some((e) => cloze(e, word.lemma) !== e);
}
export function cloze(sentence: string, word: string) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return sentence.replace(
    new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, "giu"),
    "________",
  );
}
export function chooseModality(
  p: Progress,
  word: Lexical,
  audioAvailable: boolean,
): Modality {
  const available = TESTS.filter((m) => m !== "audio" || audioAvailable).filter(
    (m) => m !== "cloze" || hasCloze(word),
  );
  return (
    [...available].sort((a, b) => {
      const score = (m: Modality) =>
        (p.accuracy[m].correct + 1) / (p.accuracy[m].total + 2) +
        ((p.attempts + TESTS.indexOf(m)) % 3) * 0.025;
      return score(a) - score(b);
    })[0] ?? "definition"
  );
}
export type Task = {
  word: LearningUnit;
  expectedAnswer: string;
  acceptedForms: string[];
  progress: Progress;
  mode: Attempt["mode"];
  modality: Modality;
  revision: number;
  sessionToken: string;
  sequence: number;
  audioAvailable: boolean;
};
export function nextTask(
  session: Session,
  words: Lexical[],
  progress: Progress[],
  audioAvailable: boolean,
  now = Date.now(),
): Task | null {
  if (session.mode === "acquire" && dueWords(progress, now).length) return null;
  const units = learningUnits(words);
  const map = new Map(progress.map((p) => [p.id, p]));
  const ordered = session.wordIds
    .map((id) => ({
      word: units.find((w) => w.id === id)!,
      progress: map.get(id)!,
    }))
    .filter(({ word, progress: p }) => word && p && !p.suspended && !p.known);
  let pending = ordered;
  if (session.mode === "review")
    pending = ordered.filter(
      ({ progress: p }) => p.card && p.card.due.getTime() <= now,
    );
  if (session.mode === "acquire")
    pending = ordered.filter(({ progress: p }) => !p.card);
  if (!pending.length) return null;
  const previousLemma = units.find((w) => w.id === session.lastWord)?.wordId; // # Different senses of the same spelling do not count as interleaved words.
  let pair = pending.find((p) =>
    previousLemma
      ? p.word.wordId !== previousLemma
      : p.word.id !== session.lastWord,
  );
  let filler = false;
  if (!pair && session.mode === "acquire" && pending[0].progress.introduced) {
    const companion = units.find(
      (w) =>
        (previousLemma
          ? w.wordId !== previousLemma
          : w.id !== session.lastWord) && w.easyDefinition,
    );
    if (!companion) return null;
    pair = {
      word: companion,
      progress: map.get(companion.id) ?? freshProgress(companion.id),
    };
    filler = true;
  }
  pair ??= pending[0];
  const { word, progress: p } = pair;
  const mode: Attempt["mode"] =
    filler || session.mode === "practice"
      ? "practice"
      : session.mode === "review"
        ? "review"
        : !p.introduced
          ? "intro"
          : "acquisition";
  return {
    word,
    expectedAnswer:
      mode !== "intro" &&
      !filler &&
      (mode === "acquisition"
        ? TESTS[p.stage]
        : chooseModality(p, word, audioAvailable)) === "cloze"
        ? word.clozeSpec?.expectedAnswer || word.lemma
        : word.lemma,
    acceptedForms:
      mode !== "intro" &&
      !filler &&
      (mode === "acquisition"
        ? TESTS[p.stage]
        : chooseModality(p, word, audioAvailable)) === "cloze"
        ? word.clozeSpec?.acceptedForms || []
        : [],
    progress: p,
    mode,
    modality:
      filler || mode === "intro"
        ? "copy"
        : mode === "acquisition"
          ? TESTS[p.stage]
          : chooseModality(p, word, audioAvailable),
    revision: p.revision,
    sessionToken: session.token,
    sequence: session.completed,
    audioAvailable,
  };
}
export async function startSession(mode: Session["mode"], ids?: string[]) {
  return db.transaction(
    "rw",
    db.words,
    db.progress,
    db.settings,
    db.sessions,
    async () => {
      const progress = await db.progress.toArray();
      const words = learningUnits(await db.words.toArray());
      const settings = (await db.settings.get("settings")) ?? defaultSettings;
      const due = dueWords(progress);
      if (mode === "acquire" && due.length)
        throw Error("Finish your due reviews before learning new words.");
      let wordIds = [
        ...new Set(
          (ids ?? []).flatMap((id) =>
            words
              .filter((w) => w.id === id || w.wordId === id)
              .map((w) => w.id),
          ),
        ),
      ]; // # A vocabulary-list action expands lemma IDs to their independent learning groups.
      if (mode === "review") wordIds = due.map((p) => p.id);
      if (mode === "acquire") {
        const day = new Date();
        day.setHours(0, 0, 0, 0);
        const acquiredToday = new Set(
          progress
            .filter(
              (p) => p.acquiredAt !== null && p.acquiredAt >= day.getTime(),
            )
            .map((p) => p.wordId || p.id),
        ).size;
        const continuing = progress.filter(
          (p) => p.introduced && !p.card && !p.suspended && !p.known,
        );
        const remaining = Math.max(
          0,
          settings.dailyTarget -
            acquiredToday -
            new Set(continuing.map((p) => p.wordId || p.id)).size,
        );
        const eligible = progress.filter(
          (p) =>
            !p.introduced &&
            !p.card &&
            !p.suspended &&
            !p.known &&
            words.some((w) => w.id === p.id && w.easyDefinition && hasCloze(w)),
        );
        const chosen = new Set(
          eligible
            .map((p) => p.wordId || p.id)
            .filter((id, i, list) => list.indexOf(id) === i)
            .slice(0, remaining),
        );
        wordIds = [
          ...continuing.map((p) => p.id),
          ...eligible
            .filter((p) => chosen.has(p.wordId || p.id))
            .map((p) => p.id),
        ];
      }
      const session: Session = {
        id: "active",
        token: crypto.randomUUID(),
        mode,
        wordIds,
        lastWord: null,
        completed: 0,
        startedAt: Date.now(),
      };
      await db.sessions.put(session);
      return session;
    },
  );
}
export async function deferAudioTask(task: Task) {
  // # Deferral must not let an obsolete tab change the active study queue.
  return db.transaction(
    "rw",
    [db.words, db.progress, db.sessions],
    async () => {
      const current = await db.sessions.get("active");
      if (
        !current ||
        current.token !== task.sessionToken ||
        current.completed !== task.sequence
      )
        throw Error(
          "This session changed in another tab. The current task will reload.",
        );
      const expected = nextTask(
        current,
        await db.words.toArray(),
        await db.progress.toArray(),
        task.audioAvailable,
      );
      if (
        !expected ||
        task.modality !== "audio" ||
        expected.modality !== "audio" ||
        expected.word.id !== task.word.id ||
        expected.mode !== task.mode ||
        expected.revision !== task.revision
      )
        throw Error(
          "This audio prompt is no longer current. The current task will reload.",
        );
      // # Keep the attempt count and learning history unchanged for a skipped test.
      await db.sessions.put({ ...current, lastWord: task.word.id });
    },
  );
}
export async function submitTask(
  task: Task,
  answer: string,
  attemptId: string,
  audioHeard = false,
  now = Date.now(),
  pronunciationId: string | null = null,
) {
  return db.transaction(
    "rw",
    [db.words, db.progress, db.attempts, db.settings, db.sessions, db.world],
    async () => {
      const old = await db.attempts.get(attemptId);
      if (old) return old;
      const p = await db.progress.get(task.word.id);
      if (!p || p.revision !== task.revision)
        throw Error(
          "This word changed in another tab. Reload the study session.",
        );
      if (task.modality === "audio" && !audioHeard)
        throw Error(
          "Play the pronunciation successfully before submitting an audio test.",
        );
      const current = await db.sessions.get("active");
      if (
        !current ||
        current.token !== task.sessionToken ||
        current.completed !== task.sequence
      )
        throw Error(
          "This session changed in another tab. Reload the study session.",
        );
      const allProgress = await db.progress.toArray();
      if (current.mode === "acquire" && dueWords(allProgress, now).length)
        throw Error(
          "Reviews are now due. Finish them before continuing new words.",
        );
      const currentWords = await db.words.toArray();
      const expected = nextTask(
        current,
        currentWords,
        allProgress,
        task.audioAvailable,
        now,
      );
      if (
        !expected ||
        expected.word.id !== task.word.id ||
        expected.mode !== task.mode ||
        expected.modality !== task.modality ||
        JSON.stringify([
          expected.word.lemma,
          expected.word.easyDefinition,
          expected.word.examples,
          expected.word.alternatives,
          expected.word.partOfSpeech,
          expected.word.ipa,
          expected.word.lexicalEntryId,
          expected.word.pronunciationIds,
          expected.word.ipaUS,
          expected.word.ipaUK,
          expected.word.audioUS,
          expected.word.audioUK,
          expected.word.clozeSpec,
          expected.word.lexicalAudioRequired,
        ]) !==
          JSON.stringify([
            task.word.lemma,
            task.word.easyDefinition,
            task.word.examples,
            task.word.alternatives,
            task.word.partOfSpeech,
            task.word.ipa,
            task.word.lexicalEntryId,
            task.word.pronunciationIds,
            task.word.ipaUS,
            task.word.ipaUK,
            task.word.audioUS,
            task.word.audioUK,
            task.word.clozeSpec,
            task.word.lexicalAudioRequired,
          ])
      )
        throw Error(
          "This prompt is no longer current. Reload the study session.",
        );
      if (
        task.mode === "acquisition" &&
        (p.card || TESTS[p.stage] !== task.modality)
      )
        throw Error("This acquisition step is no longer current.");
      if (
        task.modality === "audio" &&
        pronunciationId &&
        !task.word.pronunciationIds.includes(pronunciationId)
      )
        throw Error("Audio does not belong to the current learning sense.");
      if (task.modality === "audio" && !pronunciationId)
        throw Error(
          "A completed pronunciation variant is required for listening credit.",
        ); // # New listening attempts always identify what was played; migrated history remains explicitly unknown.
      const correct = [expected.expectedAnswer, ...expected.acceptedForms].some(
        (a) => normalize(a) === normalize(answer),
      );
      const before = p.card ? structuredClone(p.card) : null;
      let rating: number | null = null;
      const settings = (await db.settings.get("settings")) ?? defaultSettings;
      const updated = structuredClone(p);
      if (task.mode !== "practice") {
        updated.attempts++;
        updated[correct ? "correct" : "incorrect"]++;
        updated.accuracy[task.modality].total++;
        updated.accuracy[task.modality].correct += Number(correct);
        updated.lastReviewedAt = now;
        if (task.mode === "intro" && correct) updated.introduced = true;
        if (task.mode === "acquisition") {
          updated.stage = correct ? updated.stage + 1 : 0;
          updated.streak = updated.stage;
          if (!correct) updated.failures++;
          if (updated.stage === 3) {
            updated.card = schedule(settings.retention).next(
              createEmptyCard(new Date(now)),
              new Date(now),
              Rating.Good,
            ).card;
            updated.everAcquired = true;
            updated.acquiredAt = now;
            rating = Rating.Good;
          }
        }
        if (task.mode === "review") {
          if (!updated.card || updated.card.due.getTime() > now)
            throw Error("This review is not due.");
          rating = correct ? Rating.Good : Rating.Again;
          updated.reviewSuccesses += Number(correct);
          updated.card = schedule(settings.retention).next(
            updated.card as Card,
            new Date(now),
            rating,
          ).card;
        }
        updated.everMature ||= isMature(updated);
        updated.revision++;
        await db.progress.put(updated);
      }
      const attempt: Attempt = {
        lexicalEntryId: task.word.lexicalEntryId,
        learningSenseId: task.word.learningSenseId,
        pronunciationId: task.modality === "audio" ? pronunciationId : null,
        expectedAnswer: expected.expectedAnswer,
        id: attemptId,
        wordId: task.word.wordId,
        at: now,
        mode: task.mode,
        modality: task.modality,
        answer,
        correct,
        rating,
        before,
        after: updated.card,
      };
      await db.attempts.add(attempt);
      const ids = [
        ...current.wordIds.filter((id) => id !== task.word.id),
        ...(current.wordIds.includes(task.word.id) ? [task.word.id] : []),
      ];
      if (current.mode === "practice") {
        const position = ids.indexOf(task.word.id);
        if (position >= 0) ids.splice(position, 1);
      }
      await db.sessions.put({
        ...current,
        wordIds: ids,
        lastWord: task.word.id,
        completed: current.completed + 1,
      });
      await db.world.put(
        projectWorld(await db.progress.toArray(), await db.world.get("world")),
      );
      return attempt;
    },
  );
}
export async function resetProgress(id: string) {
  await db.transaction("rw", db.progress, db.sessions, async () => {
    const previous = await db.progress.get(id);
    if (!previous) return;
    const fresh = freshProgress(id);
    await db.progress.put({
      ...previous,
      introduced: false,
      stage: 0,
      streak: 0,
      card: null,
      known: false,
      suspended: false,
      acquiredAt: null,
      revision: previous.revision + 1,
      accuracy: previous.accuracy,
      attempts: previous.attempts,
      correct: previous.correct,
      incorrect: previous.incorrect,
      failures: previous.failures,
      favorite: previous.favorite,
      everAcquired: previous.everAcquired,
      everMature: previous.everMature,
      lastReviewedAt: fresh.lastReviewedAt,
    });
    await db.sessions.clear();
  });
}
