import type { Progress, World } from "../types/model"; // # Pure projection; this module cannot access or change the scheduler.
export const WORLD_CONFIG = {
  matureStabilityDays: 21,
  matureReps: 3,
  garden: [
    { at: 0, name: "A new beginning" },
    { at: 1, name: "First sprouts" },
    { at: 20, name: "Vegetable patch" },
    { at: 50, name: "Flowers in bloom" },
    { at: 100, name: "A flourishing grove" },
  ],
  aquarium: [
    { at: 0, name: "Quiet waters" },
    { at: 1, name: "First resident" },
    { at: 100, name: "Little lagoon" },
    { at: 250, name: "Coral garden" },
    { at: 500, name: "Living reef" },
    { at: 1000, name: "Open ecosystem" },
  ],
};
export function isMature(p: Progress) {
  return (
    !!p.card &&
    p.card.state === 2 &&
    p.card.stability >= WORLD_CONFIG.matureStabilityDays &&
    p.reviewSuccesses >= WORLD_CONFIG.matureReps
  );
}
export function projectWorld(
  progress: Progress[],
  previous: World = { id: "world", garden: 0, aquarium: 0 },
): World {
  return {
    id: "world",
    garden: Math.max(
      previous.garden,
      new Set(
        progress.filter((p) => p.everAcquired).map((p) => p.wordId || p.id),
      ).size,
    ),
    aquarium: Math.max(
      previous.aquarium,
      new Set(progress.filter((p) => p.everMature).map((p) => p.wordId || p.id))
        .size,
    ),
  };
}
export function milestone(kind: "garden" | "aquarium", count: number) {
  const levels = WORLD_CONFIG[kind];
  const current = [...levels].reverse().find((m) => m.at <= count)!;
  const next = levels.find((m) => m.at > count);
  return {
    current,
    next,
    ratio: next
      ? Math.min(1, (count - current.at) / (next.at - current.at))
      : 1,
  };
}
