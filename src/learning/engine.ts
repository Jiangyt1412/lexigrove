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
  recognitionSteps,
  type RecognitionChoice,
  recognitionChoiceSchema,
} from "../types/model"; // # Typed study state.
import { isMature, projectWorld } from "../world/progression"; // # Milestones are consumers of learning data.
import { learningUnits, type LearningUnit } from "../vocabulary/lexicon"; // # Queue IDs are learning groups, not bare spellings.
export const TESTS: Modality[] = ["copy", "definition", "audio"];
const PRACTICE_TESTS: Modality[] = ["definition", "audio", "cloze"]; // # Context exercises remain unscheduled practice, never a mandatory fourth acquisition step.
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
  const available = PRACTICE_TESTS.filter(
    (m) => m !== "audio" || audioAvailable,
  ).filter((m) => m !== "cloze" || hasCloze(word));
  return (
    [...available].sort((a, b) => {
      const score = (m: Modality) =>
        (p.accuracy[m].correct + 1) / (p.accuracy[m].total + 2) +
        ((p.attempts + PRACTICE_TESTS.indexOf(m)) % 3) * 0.025;
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
  reviewStep?: number;
  reviewTotal?: number;
  reviewChoice?: RecognitionChoice;
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
      ({ word, progress: p }) =>
        p.card &&
        p.card.due.getTime() <= now &&
        session.recall?.groups[word.id]?.phase !== "complete",
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
  pair ??= pending[0];
  const { word, progress: p } = pair;
  const mode: Attempt["mode"] =
    session.mode === "practice"
      ? "practice"
      : session.mode === "review"
        ? "review"
        : p.stage === 0
          ? "intro"
          : "acquisition";
  const group = session.recall?.groups[word.id];
  const reviewStep = group?.completed ?? 0;
  const reviewPlan = group ? recognitionSteps(group.choice) : [];
  const modality: Modality =
    mode === "intro"
      ? "copy"
      : mode === "acquisition"
        ? TESTS[p.stage]
        : mode === "review"
          ? group?.phase === "testing"
            ? reviewPlan[reviewStep]
            : "recognition"
          : chooseModality(p, word, audioAvailable);
  return {
    word,
    expectedAnswer:
      modality === "cloze"
        ? word.clozeSpec?.expectedAnswer || word.lemma
        : word.lemma,
    acceptedForms:
      modality === "cloze" ? word.clozeSpec?.acceptedForms || [] : [],
    progress: p,
    mode,
    modality,
    revision: p.revision,
    sessionToken: session.token,
    sequence: session.completed,
    audioAvailable,
    ...(mode === "review"
      ? {
          reviewStep,
          reviewTotal: reviewPlan.length,
          reviewChoice: group?.choice,
        }
      : {}),
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
      const active = await db.sessions.get("active");
      if (
        mode !== "review" &&
        active?.mode === "review" &&
        Object.values(active.recall?.groups ?? {}).some(
          (g) => g.phase === "testing",
        )
      )
        throw Error(
          "Finish the confirmed review before starting another session.",
        ); // # Switching to practice cannot discard an acknowledged forgetting event.
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
      if (mode === "review") {
        const saved = await db.sessions.get("active");
        if (
          saved?.mode === "review" &&
          saved.wordIds.some((id) => {
            const unit = words.find((w) => w.id === id);
            return (
              unit &&
              wordIds.includes(id) &&
              saved.recall?.groups[id]?.phase !== "complete"
            );
          })
        ) {
          const resumed = {
            ...saved,
            wordIds: [...new Set([...saved.wordIds, ...wordIds])],
          };
          await db.sessions.put(resumed);
          return resumed;
        } // # Starting review again resumes an unfinished group rather than discarding its first answer.
      }
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
            words.some((w) => w.id === p.id && w.easyDefinition),
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
        ...(mode === "review"
          ? {
              recall: { groups: {} },
            }
          : {}),
      };
      await db.sessions.put(session);
      return session;
    },
  );
}
export async function selectReviewChoice(
  task: Task,
  choice: RecognitionChoice,
) {
  recognitionChoiceSchema.parse(choice); // # Runtime callers cannot save an unrecognized option.
  return db.transaction(
    "rw",
    [db.words, db.progress, db.sessions],
    async () => {
      const current = await db.sessions.get("active"),
        p = await db.progress.get(task.word.id);
      if (
        !current ||
        current.token !== task.sessionToken ||
        current.completed !== task.sequence ||
        !p ||
        p.revision !== task.revision
      )
        throw Error(
          "This review changed in another tab. Reload the study session.",
        );
      const expected = nextTask(
        current,
        await db.words.toArray(),
        await db.progress.toArray(),
        task.audioAvailable,
      );
      if (
        task.modality !== "recognition" ||
        expected?.modality !== "recognition" ||
        expected.word.id !== task.word.id
      )
        throw Error("This self-assessment is no longer current.");
      const recall = structuredClone(current.recall ?? { groups: {} });
      recall.groups[task.word.id] = {
        choice,
        phase: "draft",
        completed: 0,
        failed: false,
      };
      await db.sessions.put({ ...current, recall });
    },
  );
} // # Selecting or changing an option only saves a draft; it cannot award a review, change a card or grow the world.
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
      const savedGroup = current.recall?.groups[task.word.id];
      if (
        task.modality === "recognition" &&
        (!savedGroup ||
          savedGroup.phase !== "draft" ||
          answer !== savedGroup.choice)
      )
        throw Error(
          "Choose and confirm the current option in the word details first.",
        );
      const correct =
        task.modality === "recognition"
          ? answer === "known"
          : [expected.expectedAnswer, ...expected.acceptedForms].some(
              (a) => normalize(a) === normalize(answer),
            ); // # Recognition correctness means a confirmed 'known' self-report, not an objectively verified meaning test.
      const before = p.card ? structuredClone(p.card) : null;
      let rating: number | null = null;
      const settings = (await db.settings.get("settings")) ?? defaultSettings;
      const updated = structuredClone(p);
      const recall =
        task.mode === "review"
          ? structuredClone(current.recall ?? { groups: {} })
          : undefined;
      if (task.mode !== "practice") {
        updated.attempts++;
        updated[correct ? "correct" : "incorrect"]++;
        updated.accuracy[task.modality].total++;
        updated.accuracy[task.modality].correct += Number(correct);
        updated.lastReviewedAt = now;
        if (task.mode === "intro" || task.mode === "acquisition") {
          if (correct) updated.introduced = true;
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
          const group = recall!.groups[task.word.id];
          if (!group)
            throw Error(
              "Confirm a familiarity choice before continuing this review.",
            );
          if (task.modality === "recognition") group.phase = "testing";
          else {
            if (
              group.phase !== "testing" ||
              recognitionSteps(group.choice)[group.completed] !== task.modality
            )
              throw Error("This repair step is no longer current.");
            group.completed++;
            group.failed ||= !correct;
          }
          if (group.completed === recognitionSteps(group.choice).length) {
            rating =
              group.choice === "unknown" || group.failed
                ? Rating.Again
                : group.choice === "unsure"
                  ? Rating.Hard
                  : Rating.Good;
            group.phase = "complete";
            updated.reviewSuccesses += Number(rating >= Rating.Hard);
            if (rating === Rating.Again) updated.failures++;
            updated.card = schedule(settings.retention).next(
              updated.card as Card,
              new Date(now),
              rating,
            ).card;
          } // # Preserve initial forgetting even after successful repair; schedule the complete event exactly once.
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
        ...(task.mode === "review"
          ? {
              reviewGroupId: `${current.token}:${task.word.id}`,
              reviewChoice: recall!.groups[task.word.id].choice,
              reviewStep:
                task.modality === "recognition"
                  ? 0
                  : (task.reviewStep ?? 0) + 1,
            }
          : {}),
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
        ...(recall ? { recall } : {}),
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
