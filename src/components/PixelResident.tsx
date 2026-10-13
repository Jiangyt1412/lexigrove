import type { CSSProperties } from "react"; // # Transparent atlas frames preserve detailed resident artwork without a raster interface.
import { assetUrl } from "../utils/assets";
import { residentAtlases } from "./resident-atlases"; // # Calibrated viewports retain the actual fine painted sprite detail and every hat/foot.

export type Resident =
  "cat" | "bird" | "duck" | "butterfly" | "gardener" | "diver";
export function PixelResident({
  kind,
  action = "idle",
  className = "",
  style,
}: {
  kind: Resident;
  action?: "idle" | "walk" | "cheer" | "wave";
  className?: string;
  style?: CSSProperties;
}) {
  const keeper = kind === "gardener" || kind === "diver";
  const row = keeper
    ? kind === "gardener"
      ? action === "walk"
        ? 1
        : 0
      : action === "wave" || action === "cheer"
        ? 3
        : 2
    : { cat: 0, bird: 1, duck: 2, butterfly: 3 }[
        kind as "cat" | "bird" | "duck" | "butterfly"
      ];
  const atlas = residentAtlases[keeper ? "keepers" : "companions"];
  const frame = atlas.rows[row];
  return (
    <span
      className={`pixel-resident ${className}`}
      data-resident={kind}
      data-action={action}
      aria-hidden="true"
      style={
        {
          "--resident-atlas": `url("${assetUrl(`assets/coastal/${atlas.file}`)}")`,
          "--resident-row": `${frame.backgroundY}%`,
          "--resident-bg-height": `${frame.backgroundHeight}%`,
          "--resident-aspect": frame.aspect,
          "--resident-ground": `${frame.groundPercent}%`, // # Contact points come from the actual returned atlas rather than assumed square slots.
          ...style,
        } as CSSProperties
      }
    >
      <span className="resident-frames" />
    </span>
  );
} // # Idle blinking, wingbeats and walking are separate frame cycles; motion preferences can stop both the atlas and travel.
