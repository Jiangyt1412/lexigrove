import { useState } from "react"; // # Inspect real earned environments without changing progress or scheduling.
import { CoastalWorld } from "./CoastalWorld";
import type { World as WorldState, Settings, Progress } from "../types/model";
import { gardenStages } from "./environment";
export default function World({
  world,
  settings,
  progress,
}: {
  progress: Progress[];
  world: WorldState;
  settings: Settings;
  notify: (s: string) => void;
}) {
  const [focus, setFocus] = useState<"garden" | "aquarium">(
    settings.world === "farm" ? "garden" : "aquarium",
  );
  const stages = gardenStages(progress);
  return (
    <CoastalWorld
      settings={settings}
      world={world}
      progress={progress}
      aquariumFocus={focus === "aquarium"}
    >
      <div className="village-title">
        <span>YOUR LITTLE WORLD</span>
        <h1>Every word leaves something growing.</h1>
      </div>
      <section className="world-journal" aria-label="World journal">
        <h2>Field journal</h2>
        <button
          aria-pressed={focus === "garden"}
          onClick={() => setFocus("garden")}
        >
          Study Garden
        </button>
        <button
          aria-pressed={focus === "aquarium"}
          onClick={() => setFocus("aquarium")}
        >
          Memory Aquarium
        </button>
        <b className="world-count">{world[focus]}</b>
        <p>
          {focus === "garden"
            ? "Words cultivated through completed learning."
            : "Words that have earned a lasting memory."}
        </p>
        <p>
          {focus === "garden"
            ? `${stages.seeds} seeds · ${stages.sprouts} sprouts · ${stages.young + stages.growing} growing · ${stages.mature} flowering`
            : "A resident arrives after 21 days of FSRS stability and 3 successful scheduled reviews."}
        </p>
        <p>
          {world[focus]
            ? "Earned plants and residents stay after a difficult review."
            : focus === "garden"
              ? "Your first plot is waiting for a word."
              : "Quiet water. Your first resident will arrive with a mature memory."}
        </p>
      </section>
    </CoastalWorld>
  );
} // # Bounded plants and fish represent canonical-word progress; they are not one sprite per dictionary sense.
