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
  const referenceCompanion = kind === "cat" || kind === "bird"; // # These two identities now come directly from the supplied room and feedback references.
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
            "--resident-atlas": `url("${assetUrl(referenceCompanion ? "assets/reference/companions-atlas-v1.webp" : `assets/coastal/${keeper ? "keepers" : "companions"}-atlas-v2.webp`)}")`,
            "--resident-row": referenceCompanion
              ? kind === "bird"
                ? "100%"
                : "0%"
              : `${(row * 100) / 3}%`, // # Reference companions occupy two equal atlas rows; other residents retain their four-row source.
          } as CSSProperties
        }
      />
    </span>
  );
} // # Idle blinking, wingbeats and walking are separate frame cycles; motion preferences can stop both the atlas and travel.
