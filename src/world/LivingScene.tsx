import type { CSSProperties } from "react"; // # Geometry is static; transforms animate on the browser compositor without React frame updates.
import type { Settings, Progress } from "../types/model";
import { assetUrl } from "../utils/assets";
import {
  palettes,
  resolveSeason,
  gardenStages,
  gardenBeds,
} from "./environment";
import { milestone } from "./progression";
const locations = [
  [48, 112],
  [128, 132],
  [496, 112],
  [570, 144],
];
const hash = (i: number) => ((i * 73 + 29) % 97) / 97; // # Repeatable varied paths affect decorations only, never rewards.
function Life({
  name,
  x,
  y,
  index = 0,
  kind = "sway",
  size = 32,
}: {
  name: string;
  x: number;
  y: number;
  index?: number;
  kind?: string;
  size?: number;
}) {
  const style = {
    "--travel": `${48 + Math.round(hash(index) * 90)}px`,
    "--lift": `${-12 - Math.round(hash(index + 4) * 32)}px`,
    animationDuration: `${kind === "sway" ? 3 + hash(index) * 4 : 12 + hash(index) * 15}s`,
    animationDelay: `${-hash(index + 9) * 27}s`,
  } as CSSProperties;
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={`world-motion motion-${kind}`} style={style}>
        <use
          href={assetUrl(`assets/original/world-life.svg#${name}`)}
          width={size}
          height={size}
        />
      </g>
    </g>
  );
}
export function LivingScene({
  kind,
  count,
  settings,
  progress = [],
  hero = false,
  onInspect,
}: {
  kind: "garden" | "aquarium";
  count: number;
  settings: Settings;
  progress?: Progress[];
  hero?: boolean;
  onInspect: () => void;
}) {
  const season = resolveSeason(settings.season),
    p = palettes[season],
    night =
      settings.theme === "night" ||
      (settings.theme === "system" &&
        matchMedia("(prefers-color-scheme: dark)").matches);
  const stages = gardenStages(progress),
    beds = gardenBeds(stages, kind === "garden" ? count : 0),
    level = milestone(kind, count),
    population = Math.min(10, count ? Math.ceil(Math.sqrt(count)) : 0);
  const motion =
    settings.reduceEffects && settings.environmentAnimation === "full"
      ? "reduced"
      : settings.environmentAnimation;
  return (
    <section
      className={`living-world living-${kind} ${hero ? "world-hero" : ""}`}
      data-season={season}
      data-night={night}
      data-animation={motion}
      aria-label={
        kind === "garden" ? "Living study garden" : "Living memory aquarium"
      }
    >
      <div className="world-sign">
        <span>{kind === "garden" ? "STUDY GARDEN" : "MEMORY AQUARIUM"}</span>
        <b>{level.current.name}</b>
        <small>
          {season} · {night ? "night" : "day"}
        </small>
      </div>
      <div className="landscape-window">
        <svg
          className="living-landscape"
          viewBox="0 0 640 320"
          role="img"
          aria-label={`${season} ${night ? "night" : "day"} ${kind}; ${count} earned vocabulary milestones`}
          shapeRendering="crispEdges"
        >
          {kind === "garden" ? (
            <>
              <rect width="640" height="320" fill={night ? "#253651" : p.sky} />
              {night ? (
                <g fill="#e8dfb7">
                  <path d="M542 24h20v20h-20zM546 20h16v4h-16zM558 24h8v16h-8z" />
                  {Array.from({ length: 20 }, (_, i) => (
                    <rect
                      key={i}
                      x={8 + Math.floor(hash(i) * 620)}
                      y={8 + Math.floor(hash(i + 6) * 96)}
                      width="2"
                      height="2"
                    />
                  ))}
                </g>
              ) : (
                <g fill="#f4d89a">
                  <path d="M546 24h20v20h-20zM550 20h12v28h-12zM542 28h28v12h-28z" />
                </g>
              )}
              {[0, 1, 2].map((i) => (
                <g
                  key={i}
                  transform={`translate(${52 + i * 208} ${34 + (i % 2) * 24})`}
                >
                  <g
                    className="world-motion motion-cloud"
                    style={{
                      animationDuration: `${64 + i * 17}s`,
                      animationDelay: `${i * -18}s`,
                    }}
                    fill={night ? "#435775" : "#d8e9e6"}
                  >
                    <path d="M0 8h12V4h20V0h16v4h16v4h12v12H0z" />
                  </g>
                </g>
              ))}
              <path
                d="M0 132h32v-8h48v8h36v-20h60v-12h52v20h44v8h52v-12h36v-12h48v20h48v-8h44v-8h40v20h44v8h56v184H0z"
                fill={night ? "#3c5860" : p.hill}
              />
              <path
                d="M0 154h40v-8h60v12h72v-12h56v8h56v-8h72v12h80v-16h68v12h72v-8h64v174H0z"
                fill={night ? "#365b53" : p.ground}
              />
              {Array.from({ length: 65 }, (_, i) => (
                <g
                  key={i}
                  transform={`translate(${Math.floor(hash(i + 13) * 158) * 4} ${160 + Math.floor(hash(i + 7) * 38) * 4})`}
                  fill={
                    i % 3
                      ? night
                        ? "#426855"
                        : p.shade
                      : night
                        ? "#567854"
                        : "#b4bf81"
                  }
                >
                  <path
                    d={
                      i % 3
                        ? "M0 6h12v2H0zM2 2h2v4H2zm6-2h2v6H8z"
                        : "M0 0h4v2H0zm4 2h4v2H4z"
                    }
                    className={i % 5 === 0 ? "world-motion motion-grass" : ""}
                    style={{
                      animationDuration: `${4 + hash(i) * 6}s`,
                      animationDelay: `${hash(i) * -9}s`,
                    }}
                  />
                </g>
              ))}
              <path
                d="M416 176h40v64h-16v20h-40v20h-96v12H192v-16h100v-12h92v-20h32z"
                fill={night ? "#7c8377" : "#c2c0a3"}
              />
              {Array.from({ length: 24 }, (_, i) => (
                <rect
                  key={i}
                  x={200 + (i % 12) * 16}
                  y={276 + Math.floor(i / 12) * 12}
                  width="10"
                  height="4"
                  fill={night ? "#5c6a64" : "#a5a790"}
                />
              ))}
              <path
                d="M34 218h28v-8h64v8h28v12h12v28h-16v12H58v-8H30v-12H18v-24h16z"
                fill="#386a73"
              />
              <path
                d="M38 226h28v-8h56v8h28v28h-12v8H62v-8H34v-20h4z"
                fill={night ? "#3f8491" : "#57aab0"}
              />
              {[0, 1, 2].map((i) => (
                <path
                  key={i}
                  className="world-motion motion-ripple"
                  style={{
                    animationDuration: `${5 + i * 1.7}s`,
                    animationDelay: `${i * -2.3}s`,
                  }}
                  d={`M${52 + i * 28} ${230 + (i % 2) * 16}h24v2h-24z`}
                  fill="#b2ddd4"
                />
              ))}
              <g transform="translate(418 106)">
                <path d="M0 30h100v72H0z" fill="#3b5854" />
                <path d="M4 34h92v64H4z" fill={night ? "#52756c" : "#84a798"} />
                <path
                  d="M-8 32h116V20h-12V8H80V0H20v8H4v12H-8z"
                  fill="#9e5460"
                />
                <path d="M0 20h100v4H0zM12 8h76v4H12z" fill="#d1847b" />
                <path d="M60 52h20v46H60z" fill="#415252" />
                <path d="M14 48h28v24H14z" fill="#334b56" />
                <path
                  d="M18 52h20v16H18z"
                  fill={night ? "#ffd391" : "#a9d7d7"}
                />
                <path d="M28 52h2v16h-2zM18 60h20v2H18z" fill="#718c83" />
                {season === "winter" && (
                  <path
                    d="M-8 28h116v8H-8zM8 12h20v4H8zm20-8h52v8H28z"
                    fill="#eef2ea"
                    data-detail="roof-snow"
                  />
                )}
                <rect x="86" y="-10" width="8" height="24" fill="#64716b" />
              </g>
              {locations.map(([x, y], i) => (
                <g transform={`translate(${x} ${y})`} key={i}>
                  <rect x="20" y="32" width="12" height="44" fill="#62554c" />
                  <rect x="24" y="32" width="4" height="44" fill="#a48664" />
                  <g
                    className="world-motion motion-tree"
                    style={{
                      animationDuration: `${5 + i * 1.3}s`,
                      animationDelay: `${i * -1.8}s`,
                    }}
                  >
                    <path
                      d="M4 12h8V4h32v8h12v12h8v24h-8v8H12v-8H0V24h4z"
                      fill={night ? "#3c6055" : p.leafDark}
                    />
                    <path
                      d="M12 16h8V8h20v8h12v12h8v12H44v8H20v-8H8V24h4z"
                      fill={night ? "#658360" : p.leaf}
                    />
                    <path
                      d="M16 16h20v4H16zM36 24h16v4H36z"
                      fill={
                        season === "winter"
                          ? "#eff4ef"
                          : night
                            ? "#8a996b"
                            : "#b4ce93"
                      }
                    />
                    {season === "spring" && (
                      <g fill="#edb1c2" data-detail="blossoms">
                        <rect x="16" y="20" width="8" height="8" />
                        <rect x="36" y="12" width="8" height="8" />
                        <rect x="40" y="32" width="8" height="8" />
                      </g>
                    )}
                  </g>
                </g>
              ))}
              <g fill="#8a7b61">
                {Array.from({ length: 14 }, (_, i) => (
                  <path key={i} d={`M${180 + i * 28} 188h4v24h-4z`} />
                ))}
                <rect x="180" y="194" width="368" height="4" />
                <rect x="180" y="206" width="368" height="4" />
              </g>
              {Array.from({ length: 8 }, (_, i) => (
                <g
                  transform={`translate(${220 + (i % 4) * 44} ${224 + Math.floor(i / 4) * 28})`}
                  key={i}
                >
                  <path d="M0 4h36v20H0z" fill="#594d48" />
                  <path d="M4 8h28v12H4z" fill="#8b6754" />
                  <path d="M4 12h28v2H4zM4 18h28v2H4z" fill="#b38965" />
                  {beds[i] && (
                    <g
                      className="world-motion motion-sway"
                      data-plant-stage={beds[i]}
                      style={{
                        animationDelay: `${i * -0.8}s`,
                        animationDuration: `${3 + (i % 3)}s`,
                      }}
                    >
                      <use
                        href={assetUrl(
                          `assets/original/sprites.svg#${beds[i] === "mature" ? (season === "autumn" ? "pumpkin" : "flower") : beds[i] === "growing" ? "carrot" : beds[i] === "young" ? "radish" : beds[i]}`,
                        )}
                        width="24"
                        height="24"
                        x="6"
                        y="-8"
                      />
                    </g>
                  )}
                  {season === "winter" && (
                    <rect
                      x="0"
                      y="4"
                      width="36"
                      height="4"
                      fill="#e9efea"
                      data-detail="bed-snow"
                    />
                  )}
                </g>
              ))}
              {Array.from({ length: 12 }, (_, i) => (
                <g
                  transform={`translate(${22 + Math.floor(hash(i + 4) * 146) * 4} ${270 + Math.floor(hash(i + 11) * 9) * 4})`}
                  key={i}
                >
                  <path
                    d="M4 0h4v8H4zM0 4h12v4H0z"
                    fill={season === "winter" ? "#afcbd1" : p.flower}
                  />
                  <rect x="4" y="2" width="4" height="4" fill="#e8dca6" />
                  <rect x="5" y="8" width="2" height="6" fill={p.shade} />
                </g>
              ))}
              <Life name="watering" x={404} y={232} kind="none" size={24} />
              <Life name="book" x={450} y={194} kind="none" size={24} />
              <Life
                name="duck"
                x={58}
                y={226}
                index={1}
                kind="swim"
                size={24}
              />
              <Life
                name="duck"
                x={96}
                y={240}
                index={6}
                kind="swim"
                size={20}
              />
              <Life
                name="frog"
                x={142}
                y={258}
                index={7}
                kind="hop"
                size={20}
              />
              <Life
                name="cat"
                x={324}
                y={268}
                index={9}
                kind="walk"
                size={28}
              />
              {!night && (
                <>
                  <Life
                    name="bird"
                    x={64}
                    y={60}
                    index={2}
                    kind="fly"
                    size={24}
                  />
                  <Life
                    name="bird"
                    x={384}
                    y={76}
                    index={8}
                    kind="fly"
                    size={20}
                  />
                </>
              )}
              {season !== "winter" && !night && (
                <>
                  <Life
                    name="butterfly"
                    x={180}
                    y={246}
                    index={3}
                    kind="flutter"
                    size={20}
                  />
                  <Life
                    name="butterfly"
                    x={544}
                    y={262}
                    index={10}
                    kind="flutter"
                    size={16}
                  />
                  <Life
                    name="bee"
                    x={274}
                    y={208}
                    index={5}
                    kind="hover"
                    size={16}
                  />
                </>
              )}
              {night && (
                <>
                  <Life
                    name="lantern"
                    x={424}
                    y={198}
                    kind="glow"
                    index={3}
                    size={20}
                  />
                  {Array.from({ length: 8 }, (_, i) => (
                    <rect
                      className="world-motion motion-firefly"
                      key={i}
                      x={60 + i * 70}
                      y={200 + (i % 3) * 24}
                      width="2"
                      height="2"
                      fill="#e0e79d"
                      style={{
                        animationDuration: `${4 + hash(i) * 7}s`,
                        animationDelay: `${hash(i) * -9}s`,
                      }}
                    />
                  ))}
                </>
              )}
              {(season === "autumn" || season === "winter") &&
                Array.from({ length: season === "winter" ? 14 : 6 }, (_, i) => (
                  <g
                    transform={`translate(${24 + i * 44} ${40 + Math.floor(hash(i) * 120)})`}
                    key={i}
                    data-detail={
                      season === "winter" ? "snowfall" : "falling-leaf"
                    }
                  >
                    <rect
                      className="world-motion motion-fall"
                      width={season === "winter" ? 2 : 4}
                      height="4"
                      fill={season === "winter" ? "#f2f5ef" : "#db9369"}
                      style={{
                        animationDuration: `${10 + hash(i) * 14}s`,
                        animationDelay: `${hash(i) * -20}s`,
                      }}
                    />
                  </g>
                ))}
            </>
          ) : (
            <>
              <rect
                width="640"
                height="320"
                fill={night ? "#14354f" : "#317c93"}
              />
              <path d="M0 0h640v36H0z" fill={night ? "#28516c" : "#79b8bf"} />
              <path
                d="M0 44h164v28h160V48h316v88H488v-8H324v24H164v-24H0z"
                fill={night ? "#214a62" : "#3b8a9b"}
              />
              <path
                d="M0 262h96v-12h76v16h88v-8h88v-16h108v20h80v-8h104v66H0z"
                fill="#889d8d"
              />
              <path
                d="M0 282h156v-8h144v8h104v-12h96v8h140v42H0z"
                fill="#b5b6a0"
              />
              {Array.from({ length: 5 }, (_, i) => (
                <g key={i} transform={`translate(${20 + i * 146} 248)`}>
                  <g
                    className="world-motion motion-weed"
                    style={{
                      animationDuration: `${5 + i * 1.1}s`,
                      animationDelay: `${i * -2}s`,
                    }}
                    fill={night ? "#377278" : "#57a894"}
                  >
                    <path d="M0 32V0h4v16h8v-40h4v36h8v-28h4v68H0z" />
                  </g>
                </g>
              ))}
              <g fill="#446b77">
                <path d="M68 260v-32h12v-12h28v12h16v36H68zM440 274v-40h16v-16h44v12h16v44z" />
                <path d="M76 232h28v4H76zM454 232h42v4h-42z" fill="#779592" />
              </g>
              {count >= 100 && (
                <g fill="#c384a1" data-detail="earned-coral">
                  <path d="M190 274v-60h8v24h8v-40h8v44h12v-28h8v60zM518 282v-48h8v16h8v-36h8v68z" />
                </g>
              )}
              {count >= 250 && (
                <g fill="#df9b86" data-detail="reef-upgrade">
                  <path d="M328 290v-68h8v32h12v-48h8v48h12v-28h8v64z" />
                  <Life
                    name="crab"
                    x={370}
                    y={278}
                    index={9}
                    kind="walk"
                    size={24}
                  />
                </g>
              )}
              {Array.from({ length: 26 }, (_, i) => (
                <rect
                  key={i}
                  x={Math.floor(hash(i) * 158) * 4}
                  y={278 + Math.floor(hash(i + 4) * 9) * 4}
                  width="4"
                  height="2"
                  fill={i % 3 === 0 ? "#e3c9bd" : "#77978f"}
                />
              ))}
              <use
                href={assetUrl("assets/original/sprites.svg#shell")}
                x="576"
                y="282"
                width="24"
                height="24"
              />
              {Array.from({ length: population }, (_, i) => (
                <Life
                  key={i}
                  name={
                    i % 3 === 0 ? "reef-fish" : i % 3 === 1 ? "fish" : "shrimp"
                  }
                  x={60 + Math.floor(hash(i) * 450)}
                  y={70 + Math.floor(hash(i + 7) * 150)}
                  index={i + 3}
                  kind="fish"
                  size={i % 2 ? 24 : 32}
                />
              ))}
              {count >= 500 && (
                <use
                  className="world-motion motion-jelly"
                  href={assetUrl("assets/original/sprites.svg#jellyfish")}
                  x="320"
                  y="132"
                  width="36"
                  height="36"
                />
              )}
              {Array.from({ length: 10 }, (_, i) => (
                <g
                  transform={`translate(${28 + i * 62} ${260 - (i % 3) * 12})`}
                  key={i}
                >
                  <g
                    className="world-motion motion-bubble"
                    style={{
                      animationDuration: `${8 + hash(i) * 13}s`,
                      animationDelay: `${-hash(i + 8) * 23}s`,
                    }}
                    fill="none"
                    stroke="#93cdce"
                    strokeWidth="1"
                  >
                    <rect width="4" height="4" />
                    <rect width="2" height="2" x="6" y="18" />
                  </g>
                </g>
              ))}
              {season === "winter" && (
                <path
                  data-detail="frosted-waterline"
                  d="M0 0h640v8H0zM0 8h80v8H0zm200 0h100v8H200zm300 0h70v8H500z"
                  fill="#bdd9df"
                />
              )}
              {season === "spring" && (
                <g fill="#cf93b0" data-detail="spring-anemones">
                  <rect x="150" y="278" width="16" height="12" />
                  <rect x="400" y="270" width="16" height="12" />
                </g>
              )}
              {season === "autumn" && (
                <g fill="#c38a76" data-detail="autumn-kelp">
                  <rect x="380" y="224" width="4" height="54" />
                  <rect x="384" y="238" width="12" height="4" />
                </g>
              )}
            </>
          )}
        </svg>
      </div>
      <div className="world-field-labels">
        <button className="field-marker" onClick={onInspect}>
          {count}{" "}
          {kind === "garden"
            ? "words cultivated"
            : "words with mature memories"}{" "}
          ↗
        </button>
        {kind === "garden" && (
          <span className="field-note">
            {stages.seeds} seeds · {stages.sprouts} sprouts ·{" "}
            {stages.young + stages.growing} growing · {stages.mature} flowering
          </span>
        )}
        {kind === "aquarium" && count === 0 && (
          <span className="field-note">
            Your first resident arrives with a mature memory.
          </span>
        )}
      </div>
    </section>
  );
}
