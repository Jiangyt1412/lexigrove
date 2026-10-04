import { type Attempt, type Progress, type Lexical } from "../types/model"; // # All dashboard counts are derived from saved events.
import { dueWords, learningState } from "../learning/engine"; // # Scheduling is the sole source for due counts.
import { isMature } from "../world/progression"; // # Maturity is a documented product threshold.
import { learningUnits, wordProgress } from "../vocabulary/lexicon"; // # Headline vocabulary counts remain lemma-based.
export function statistics(
  words: Lexical[],
  progress: Progress[],
  attempts: Attempt[],
  now = Date.now(),
) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const start = today.getTime();
  const reviewed = attempts.filter((a) => a.mode === "review");
  const due = dueWords(progress, now);
  return {
    words: words.length,
    learned: new Set(
      progress.filter((p) => p.everAcquired).map((p) => p.wordId || p.id),
    ).size,
    senses: learningUnits(words).length,
    learnedSenses: progress.filter((p) => p.everAcquired).length,
    matureSenses: progress.filter(isMature).length,
    mature: new Set(progress.filter(isMature).map((p) => p.wordId || p.id))
      .size,
    learning: progress.filter((p) => p.introduced && !p.card && !p.suspended)
      .length,
    due: due.length,
    overdue: due.filter((p) => p.card!.due.getTime() < start).length,
    reviewsToday: reviewed.filter((a) => a.at >= start).length,
    newToday: new Set(
      progress
        .filter((p) => p.acquiredAt !== null && p.acquiredAt >= start)
        .map((p) => p.wordId || p.id),
    ).size,
    retention: reviewed.length
      ? Math.round(
          (reviewed.filter((a) => a.correct).length / reviewed.length) * 100,
        )
      : null,
    attemptsToday: attempts.filter(
      (a) => a.at >= start && a.mode !== "practice",
    ).length,
    recentLapses: reviewed.filter(
      (a) => !a.correct && a.at >= now - 7 * 86400000,
    ).length,
    modalities: ["definition", "audio", "cloze"].map((m) => {
      const list = attempts.filter(
        (a) => a.modality === m && ["review", "acquisition"].includes(a.mode),
      );
      return {
        modality: m,
        total: list.length,
        correct: list.filter((a) => a.correct).length,
        accuracy: list.length
          ? Math.round(
              (list.filter((a) => a.correct).length / list.length) * 100,
            )
          : null,
      };
    }),
    forecast: [1, 3, 7, 30].map((days) => ({
      days,
      count: progress.filter(
        (p) =>
          !p.suspended &&
          !p.known &&
          p.card &&
          p.card.due.getTime() > now &&
          p.card.due.getTime() <= now + days * 86400000,
      ).length,
    })),
    decks: [...new Set(words.flatMap((w) => w.decks))].map((name) => ({
      name,
      total: words.filter((w) => w.decks.includes(name)).length,
      learned: words.filter(
        (w) => w.decks.includes(name) && wordProgress(w, progress).acquired > 0,
      ).length,
    })),
    history: Array.from({ length: 14 }, (_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() - (13 - i));
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      return {
        date: date.toLocaleDateString("en", { month: "short", day: "numeric" }),
        count: attempts.filter(
          (a) =>
            a.at >= date.getTime() &&
            a.at < end.getTime() &&
            a.mode !== "practice",
        ).length,
      };
    }),
  };
}
export function difficult(p: Progress) {
  return (
    !p.known &&
    (p.failures >= 2 ||
      (p.card?.lapses ?? 0) > 0 ||
      (p.attempts >= 5 && p.correct / p.attempts < 0.7) ||
      (p.card !== null && p.card.reps >= 3 && p.card.stability < 3))
  );
}
export const statusLabel = learningState;
