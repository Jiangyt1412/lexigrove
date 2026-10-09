import type { CSSProperties } from "react"; // # Transparent atlas frames preserve detailed resident artwork without a raster interface.
import { assetUrl } from "../utils/assets";

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
  return (
    <span
      className={`pixel-resident ${className}`}
      data-resident={kind}
      data-action={action}
      aria-hidden="true"
      style={style}
    >
      <span
        className="resident-frames"
        style={
          {
            "--resident-atlas": `url("${assetUrl(`assets/coastal/${keeper ? "keepers" : "companions"}-atlas-v2.webp`)}")`,
            "--resident-row":
              kind === "bird" ? "34.090909%" : `${(row * 100) / 3}%`, // # The generated bird feet extend below the nominal row; a slightly taller CSS window includes them without editing the atlas.
          } as CSSProperties
        }
      />
    </span>
  );
} // # Idle blinking, wingbeats and walking are separate frame cycles; motion preferences can stop both the atlas and travel.
