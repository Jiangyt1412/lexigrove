import type { CSSProperties, ReactNode, ButtonHTMLAttributes } from "react"; // # Scene objects are real accessible controls; scenery never owns learning data.
import type { Progress, Settings, World } from "../types/model";
import { assetUrl } from "../utils/assets";
import { gardenBeds, gardenStages, resolveSeason } from "./environment";
import {
  BookOpen,
  Sprout,
  ChartNoAxesCombined,
  ArrowRight,
  Download,
} from "../components/PixelIcons";
import { PixelResident } from "../components/PixelResident"; // # Detailed transparent frame atlases replace low-detail resident symbols.

export function WorldSprite({
  name,
  className = "",
  style,
}: {
  name: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={`coastal-sprite ${className}`}
      style={style}
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <use
        href={assetUrl(
          `assets/original/${["flower", "sprout", "fish-blue", "fish-orange"].includes(name) ? "sprites" : "world-life"}.svg#${name}`,
        )}
      />
    </svg>
  );
} // # Existing original sprites share the same independent behavioral animation vocabulary.

function WorldObject({
  className,
  icon,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode }) {
  return (
    <button {...props} className={`world-object ${className ?? ""}`}>
      <span className="object-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="object-label">{children}</span>
    </button>
  );
}

export function CoastalWorld({
  settings,
  world,
  progress,
  children,
  aquariumFocus = false,
}: {
  settings: Settings;
  world: World;
  progress: Progress[];
  children?: ReactNode;
  aquariumFocus?: boolean;
}) {
  const season = resolveSeason(settings.season),
    stages = gardenStages(progress),
    beds = gardenBeds(stages, world.garden);
  const night =
    settings.theme === "night" ||
    (settings.theme === "system" &&
      matchMedia("(prefers-color-scheme: dark)").matches);
  const motion = settings.reduceEffects
    ? "reduced"
    : settings.environmentAnimation;
  const population = Math.min(
    10,
    world.aquarium ? Math.ceil(Math.sqrt(world.aquarium)) : 0,
  );
  return (
    <section
      className={`coastal-world living-garden ${aquariumFocus ? "aquarium-focus" : ""} ${settings.world === "off" ? "world-hidden" : ""}`}
      data-season={season}
      data-night={night}
      data-animation={motion}
      data-world-type={settings.world}
      aria-label="Your living coastal vocabulary world"
    >
      {settings.world !== "off" && (
        <>
          <img
            className="coast-backdrop"
            src={assetUrl(`assets/coastal/coast-${season}.webp`)}
            alt=""
          />
          <div className="coast-evening" aria-hidden="true" />
          <svg
            className="coast-atmosphere"
            viewBox="0 0 1000 680"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            shapeRendering="crispEdges"
          >
            {night && (
              <g fill="#fff1c5">
                <path d="M843 62h20v20h-20zM847 58h12v28h-12zM839 66h28v12h-28z" />
                {Array.from({ length: 22 }, (_, i) => (
                  <rect
                    key={i}
                    x={80 + ((i * 139) % 850)}
                    y={20 + ((i * 37) % 165)}
                    width="2"
                    height="2"
                  />
                ))}
              </g>
            )}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <path
                key={i}
                className="world-motion motion-ripple"
                d={`M${605 + i * 46} ${260 + i * 24}h35v2h-35zm12 5h25v1h-25z`}
                fill="#d8f4f2"
                opacity=".5"
                style={{ animationDelay: `-${i * 2.3}s` }}
              />
            ))}
            {season === "spring" && (
              <g data-detail="blossoms" fill="#ffc5d4">
                {Array.from({ length: 24 }, (_, i) => (
                  <path
                    key={i}
                    d={`M${114 + ((i * 29) % 230)} ${340 + ((i * 17) % 172)}h4v-3h4v3h4v4h-4v4h-4v-4h-4z`}
                    className={i % 4 === 0 ? "world-motion motion-sway" : ""}
                  />
                ))}
              </g>
            )}
            {season === "autumn" && (
              <g fill="#e59c47" data-detail="falling-leaf">
                {Array.from({ length: 12 }, (_, i) => (
                  <rect
                    key={i}
                    x={100 + i * 65}
                    y={170 + ((i * 43) % 290)}
                    width="5"
                    height="3"
                    className="world-motion motion-fall"
                    style={{
                      animationDuration: `${12 + i * 1.7}s`,
                      animationDelay: `-${i * 3}s`,
                    }}
                  />
                ))}
                <path
                  data-detail="pumpkins"
                  d="M336 569h5v-4h8v4h6v16h-19zM359 575h5v-4h8v4h6v13h-19z"
                />
              </g>
            )}
            {season === "winter" && (
              <g fill="#eef8ff">
                <path
                  data-detail="roof-snow"
                  d="M167 339h120v6H167zM724 490h143v5H724z"
                />
                {Array.from({ length: 24 }, (_, i) => (
                  <rect
                    key={i}
                    x={70 + ((i * 67) % 890)}
                    y={(i * 39) % 610}
                    width="2"
                    height="3"
                    className="world-motion motion-fall"
                    style={{
                      animationDuration: `${13 + (i % 7)}s`,
                      animationDelay: `-${i * 2}s`,
                    }}
                  />
                ))}
              </g>
            )}
          </svg>
          <div className="coast-garden" aria-label="Learning garden">
            <svg
              viewBox="0 0 240 90"
              shapeRendering="crispEdges"
              aria-hidden="true"
            >
              <g fill="#775347">
                {beds.map((stage, i) => (
                  <g
                    key={i}
                    transform={`translate(${(i % 4) * 58} ${Math.floor(i / 4) * 43})`}
                  >
                    <path
                      d="M7 15h6v-3h23v3h7v4h5v6h-7v3H10v-3H4v-6h3z"
                      fill="#654b37"
                      fillOpacity=".72"
                    />
                    <path
                      d="M11 16h25v3h7v4H9v-4h2z"
                      fill={season === "winter" ? "#cbdce0" : "#98704b"}
                    />
                    <path
                      d="M13 19h7v2h-7zm18 2h7v2h-7zM22 24h5v2h-5z"
                      fill="#bb9564"
                      fillOpacity=".6"
                    />
                    <path
                      d="M8 25h4v3H8zm30-10h5v3h-5z"
                      fill="#b1aa75"
                      fillOpacity=".65"
                    />
                    {stage && (
                      <g data-plant-stage={stage}>
                        <use
                          href={assetUrl(
                            `assets/original/sprites.svg#${stage === "mature" ? (season === "autumn" ? "pumpkin" : "flower") : stage === "growing" ? "carrot" : stage === "young" ? "radish" : stage}`,
                          )}
                          x="10"
                          y="-5"
                          width="32"
                          height="32"
                          className="world-motion motion-sway"
                        />
                      </g>
                    )}
                  </g>
                ))}
              </g>
            </svg>
          </div>
          <div
            className="harbor-aquarium living-aquarium"
            aria-label={`${world.aquarium} earned aquarium residents`}
          >
            <svg
              className="greenhouse-shell"
              viewBox="0 0 240 210"
              shapeRendering="crispEdges"
              aria-hidden="true"
            >
              <path d="M5 59 116 4l119 55v7H5z" fill="#375a59" />
              <path d="m20 55 96-43 101 43z" fill="#a6d8d2" opacity=".85" />
              <path d="M17 68h204v127H17z" fill="#395c60" />
              <path d="M24 72h190v106H24z" fill="#b7e3d9" />
              <path d="M28 100h182v74H28z" fill="#39839b" />
              <path d="M28 105h182v7H28z" fill="#70bed0" />
              <path d="M28 168h182v13H28z" fill="#d0b690" />
              <path
                d="M26 81h190v6H26zM112 17h8v159h-8zM19 182h202v10H19z"
                fill="#7a7961"
              />
              {world.aquarium > 0 && (
                <g fill="#6ba585">
                  <path
                    d="M39 166v-27h5v27zm6-3v-42h5v42zm145 3v-39h5v39zm7-4v-22h5v22z"
                    className="world-motion motion-weed"
                  />
                  {world.aquarium >= 5 && (
                    <path
                      d="M160 164v-20h5v20zm-8-10h21v6h-21z"
                      fill="#e0a090"
                    />
                  )}
                </g>
              )}
              <path d="M10 196h222v10H10z" fill="#5d6557" />
            </svg>
            <svg
              className="aquarium-water"
              viewBox="0 0 240 120"
              preserveAspectRatio="none"
              shapeRendering="crispEdges"
              aria-hidden="true"
            >
              <path
                d="M0 14 190 0l50 14v100L0 99z"
                fill="#3f96b0"
                fillOpacity=".15"
              />
              <path
                d="m0 14 190-14 50 14-190 14z"
                fill="#b3e2e0"
                fillOpacity=".2"
              />
              <path
                d="M4 18v78m2-76 180-13m6 1v104m43-93v90"
                stroke="#a7e0dc"
                strokeWidth="2"
                fill="none"
              />
              {world.aquarium > 0 && (
                <g fill="#579781">
                  <path
                    d="M25 96V64h4v32zm6 0V53h4v43zm147 9V77h4v28z"
                    className="world-motion motion-weed"
                  />
                  {world.aquarium >= 5 && (
                    <path
                      d="M145 103V86h4v17zm-6-11h17v4h-17z"
                      fill="#e9a091"
                    />
                  )}
                </g>
              )}
            </svg>
            <div className="tank-life" aria-hidden="true">
              {Array.from({ length: population }, (_, i) => (
                <WorldSprite
                  key={i}
                  name={i % 2 ? "reef-fish" : "fish"}
                  className="world-motion motion-fish"
                  style={
                    {
                      left: `${12 + ((i * 17) % 63)}%`,
                      top: `${20 + ((i * 23) % 48)}%`,
                      width: 24,
                      animationDuration: `${17 + i * 2.8}s`,
                      animationDelay: `-${i * 3.1}s`,
                      "--travel": `${25 + i * 4}px`,
                      "--lift": `${-5 - i * 2}px`,
                    } as CSSProperties
                  }
                />
              ))}
              {[0, 1, 2].map((i) => (
                <i
                  key={i}
                  className="world-motion tank-bubble"
                  style={{
                    left: `${18 + i * 27}%`,
                    animationDelay: `-${i * 2.7}s`,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="coast-creatures" aria-hidden="true">
            <PixelResident
              kind="cat"
              className="world-motion motion-walk harbor-cat"
            />
            <PixelResident
              kind="duck"
              className="world-motion motion-swim harbor-duck"
            />
            <PixelResident kind="bird" className="world-motion harbor-bird" />
            {season !== "winter" && (
              <PixelResident
                kind="butterfly"
                className="world-motion motion-flutter harbor-butterfly"
              />
            )}
            <WorldSprite
              name="flower"
              className="world-motion motion-sway harbor-flowers"
            />
            <PixelResident
              kind="gardener"
              action="walk"
              className="world-motion harbor-gardener"
            />
          </div>
          <div className="coast-foreground" aria-hidden="true">
            <WorldSprite
              name={season === "winter" ? "sprout" : "flower"}
              className="world-motion motion-sway"
            />
            <WorldSprite name="sprout" className="world-motion motion-grass" />
          </div>
        </>
      )}
      {children}
    </section>
  );
}

export function CoastalToday({
  settings,
  world,
  progress,
  stats,
  activeNew,
  sessionActive,
  onStudy,
  onResume,
  onLibrary,
  onWorld,
  onStatistics,
  onData,
}: {
  settings: Settings;
  world: World;
  progress: Progress[];
  stats: {
    due: number;
    learned: number;
    learning: number;
    words: number;
    retention: number | null;
  };
  activeNew: number;
  sessionActive: boolean;
  onStudy: () => void;
  onResume: () => void;
  onLibrary: () => void;
  onWorld: () => void;
  onStatistics: () => void;
  onData: () => void;
}) {
  const stages = gardenStages(progress),
    action = stats.due
      ? "Start review"
      : stats.learning
        ? "Continue learning"
        : "Start learning";
  return (
    <CoastalWorld
      settings={settings}
      world={world}
      progress={progress}
      aquariumFocus={settings.world === "ocean"}
    >
      <h1 className="screen-reader-title">
        Lexigrove · your coastal vocabulary world
      </h1>
      <WorldObject
        className="mailbox-object"
        onClick={onStudy}
        disabled={!stats.due && !activeNew && !stats.learning}
        aria-label={action}
        icon={<BookOpen size={25} />}
      >
        <small>
          {stats.due
            ? `${stats.due} reviews waiting`
            : `${activeNew} new discoveries`}
        </small>
        <b>
          {action} <ArrowRight size={15} />
        </b>
      </WorldObject>
      <WorldObject
        className="seed-object"
        onClick={onLibrary}
        aria-label={`Explore ${stats.words} words`}
        icon={<Sprout size={25} />}
      >
        <small>THE SEED LIBRARY</small>
        <b>Explore {stats.words} words</b>
      </WorldObject>
      <WorldObject
        className="aquarium-object"
        onClick={onWorld}
        aria-label="Open Memory Aquarium"
        icon={
          <svg viewBox="0 0 32 32">
            <use href={assetUrl("assets/original/sprites.svg#fish-blue")} />
          </svg>
        }
      >
        <small>MEMORY AQUARIUM</small>
        <b>{world.aquarium} lasting memories</b>
      </WorldObject>
      <WorldObject
        className="ledger-object"
        onClick={onStatistics}
        aria-label="Open learning statistics"
        icon={<ChartNoAxesCombined size={25} />}
      >
        <small>GARDEN LEDGER</small>
        <b className="field-marker">{world.garden} words cultivated</b>
        <span className="field-note">
          {stages.seeds} seeds · {stages.sprouts} sprouts ·{" "}
          {stages.young + stages.growing} growing · {stages.mature} flowering
        </span>
      </WorldObject>
      {sessionActive && (
        <button className="resume-book" onClick={onResume}>
          <BookOpen size={16} /> Resume session
        </button>
      )}
      <footer className="coastal-status">
        <span>
          <b>{stats.due}</b> Reviews due
        </span>
        <span>
          <b>{stats.due ? 0 : activeNew}</b> New words
        </span>
        <span>
          <b>{stats.learned}</b> Words learned
        </span>
        <span>
          <b>{stats.retention === null ? "—" : `${stats.retention}%`}</b> Review
          outcomes
        </span>
        <button onClick={onData}>
          <Download size={14} /> Save a backup
        </button>
      </footer>
    </CoastalWorld>
  );
} // # Compact ledger values are projections of persisted events, never decorative fabricated achievements.
