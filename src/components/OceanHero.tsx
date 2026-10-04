import { ArrowUpRight, Waves } from "./PixelIcons"; // # Pixel controls accompany original, decorative marine art.
import { assetUrl } from "../utils/assets";

export function OceanHero({
  garden,
  aquarium,
  onInspect,
}: {
  garden: number;
  aquarium: number;
  onInspect: () => void;
}) {
  return (
    <section className="ocean-hero world-frame" aria-label="Your ocean base">
      <div className="scene-toolbar">
        <span>
          <Waves size={16} /> BLUE HORIZON
        </span>
        <b>WORD BY WORD</b>
      </div>
      <div className="ocean-hero-scene">
        <img
          src={assetUrl("assets/original/blue-horizon.svg")}
          alt=""
          aria-hidden="true"
        />
        <div className="ocean-hero-title">
          <span>EXPLORE. REMEMBER. RETURN.</span>
          <h2>
            A world of
            <br />
            small discoveries.
          </h2>
        </div>
        <button className="ocean-world-link" onClick={onInspect}>
          <span>MY WORLD</span>
          <b>
            {garden} cultivated · {aquarium} lasting
          </b>
          <ArrowUpRight size={18} />
        </button>
      </div>
    </section>
  ); // # The scenery is decorative; both displayed progress counts come from the saved database.
}
