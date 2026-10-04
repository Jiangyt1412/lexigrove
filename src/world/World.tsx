import { LivingScene } from "./LivingScene"; // # Functional controls remain distinct from pixel scenes.
import type { World as WorldState, Settings, Progress } from "../types/model";
import { milestone, WORLD_CONFIG } from "./progression";
export default function World({
  world,
  settings,
  notify,
  progress,
}: {
  progress: Progress[];
  world: WorldState;
  settings: Settings;
  notify: (s: string) => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Your growing world</h1>
        </div>
        <span className="subtle">Earned progress stays. Always.</span>
      </div>
      {(["garden", "aquarium"] as const).map((kind) => {
        const count = world[kind];
        const m = milestone(kind, count);
        return (
          <section className="world-section" key={kind}>
            {settings.world !== "off" && (
              <LivingScene
                kind={kind}
                count={count}
                settings={settings}
                progress={progress}
                onInspect={() =>
                  notify(
                    `${count} ${kind === "garden" ? "words acquired" : "words have reached maturity"}. ${m.next ? `Next: ${m.next.name} at ${m.next.at}.` : "All milestones reached."}`,
                  )
                }
              />
            )}
            <div className="world-caption">
              <h2>{kind === "garden" ? "Study Garden" : "Memory Aquarium"}</h2>
              <span>
                {count} · {m.current.name}
              </span>
            </div>
            <div className="milestone-track">
              {WORLD_CONFIG[kind].map(({ at: n }) => (
                <div key={n} className={count >= n ? "reached" : ""}>
                  <span>{count >= n ? "✓" : "◇"}</span>
                  <b>{n}</b>
                </div>
              ))}
            </div>
            <p className="subtle">
              {kind === "garden"
                ? "Grows from completed acquisition."
                : "Maturity: at least 21 days of FSRS stability and 3 successful scheduled reviews. Earned residents remain after lapses."}
              {m.next ? ` Next milestone: ${m.next.at - count} more.` : ""}
            </p>
          </section>
        );
      })}
    </>
  );
}
