import type { Settings, Progress } from "../types/model"; // # Environmental preferences never enter the scheduler.
export type Season = "spring" | "summer" | "autumn" | "winter";
export function resolveSeason(
  setting: Settings["season"],
  date = new Date(),
): Season {
  if (setting !== "auto") return setting;
  const month = date.getMonth();
  return month >= 2 && month <= 4
    ? "spring"
    : month >= 5 && month <= 7
      ? "summer"
      : month >= 8 && month <= 10
        ? "autumn"
        : "winter";
} // # Auto follows local northern-hemisphere calendar months; manual choice supports other climates.
export function gardenStages(progress: Progress[]) {
  const ranks = new Map<string, number>(); // # One canonical word occupies one representative stage, even when it has several learning groups.
  for (const p of progress) {
    const rank = p.everMature
      ? 5
      : p.everAcquired && p.card && p.card.stability >= 10
        ? 4
        : p.everAcquired && p.reviewSuccesses > 0
          ? 3
          : p.everAcquired
            ? 2
            : p.introduced && !p.known
              ? 1
              : 0;
    const wordId = p.wordId || p.id;
    ranks.set(wordId, Math.max(ranks.get(wordId) || 0, rank));
  }
  const counts = [0, 0, 0, 0, 0, 0];
  for (const rank of ranks.values()) counts[rank]++;
  return {
    seeds: counts[1],
    sprouts: counts[2],
    young: counts[3],
    growing: counts[4],
    mature: counts[5],
  };
}
export function gardenBeds(
  stages: ReturnType<typeof gardenStages>,
  earned: number,
) {
  const learned =
    stages.sprouts + stages.young + stages.growing + stages.mature;
  const categories = [
    ["seed", stages.seeds],
    ["sprout", stages.sprouts + Math.max(0, earned - learned)],
    ["young", stages.young],
    ["growing", stages.growing],
    ["mature", stages.mature],
  ] as const; // # Preserve historical awards if an older world count exceeds currently visible progress records.
  const total = categories.reduce((sum, [, count]) => sum + count, 0);
  const occupied = Math.min(8, total);
  return Array.from({ length: 8 }, (_, i) => {
    if (i >= occupied) return null;
    const position = ((i + 0.5) / occupied) * total;
    let cumulative = 0;
    for (const [stage, count] of categories) {
      cumulative += count;
      if (position < cumulative) return stage;
    }
    return null;
  });
} // # Eight bounded representative patches scale to large vocabularies without creating thousands of SVG objects.
export const palettes = {
  spring: {
    sky: "#8abfe0",
    hill: "#8db991",
    ground: "#79a45c",
    shade: "#51805b",
    leaf: "#89be77",
    leafDark: "#46745a",
    flower: "#f3abc4",
  },
  summer: {
    sky: "#68abc8",
    hill: "#5e927d",
    ground: "#588d55",
    shade: "#3c6b54",
    leaf: "#69a65a",
    leafDark: "#315d4d",
    flower: "#f2cb79",
  },
  autumn: {
    sky: "#9ab9ca",
    hill: "#ad9b72",
    ground: "#969361",
    shade: "#716e53",
    leaf: "#d79760",
    leafDark: "#a65f51",
    flower: "#df9c83",
  },
  winter: {
    sky: "#a1bdcf",
    hill: "#8ba8b0",
    ground: "#d8e7e9",
    shade: "#afcbd1",
    leaf: "#d4e4e7",
    leafDark: "#739399",
    flower: "#a9bdcd",
  },
}; // # Original project palette, chosen independently of commercial game artwork.
