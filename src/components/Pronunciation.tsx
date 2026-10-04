import { useRef, useState } from "react"; // # Shared accent controls keep dictionary and study playback consistent.
import type { Lexical, Settings } from "../types/model";
import { pronounce } from "../speech/speech";
import { Volume2 } from "./PixelIcons";

export function Pronunciation({
  word,
  settings,
  notify,
  onPlayed,
  listening = false,
}: {
  word: Lexical;
  settings: Settings;
  notify: (message: string) => void;
  onPlayed?: (pronunciationId?: string) => void;
  listening?: boolean;
}) {
  const [playing, setPlaying] = useState<Settings["accent"] | null>(null);
  const lock = useRef(false);
  async function play(accent: Settings["accent"]) {
    if (lock.current) return;
    lock.current = true;
    setPlaying(accent);
    try {
      await pronounce(word, { ...settings, accent }, { strictAccent: true }); // # A flag-labelled button must never silently use another country's voice.
      const variants = word.entries
        .flatMap((e) => e.pronunciations)
        .filter(
          (p) =>
            !word.pronunciationIds ||
            word.pronunciationIds.includes(p.pronunciationId),
        );
      onPlayed?.(
        variants.find((p) => p.locale === accent)?.pronunciationId ||
          variants.find((p) => p.locale === "neutral")?.pronunciationId,
      ); // # Listening credit is awarded only after successful playback completes.
    } catch (error) {
      notify((error as Error).message);
    } finally {
      lock.current = false;
      setPlaying(null);
    }
  }
  return (
    <div
      className={`pronunciation-pair ${listening ? "pronunciation-listening" : ""}`}
      role="group"
      aria-label="US and UK pronunciation"
    >
      {(["US", "UK"] as const).map((accent) => {
        const ipa = accent === "US" ? word.ipaUS : word.ipaUK;
        return (
          <button
            key={accent}
            type="button"
            className="pronunciation-button"
            aria-label={`Play ${accent} pronunciation`}
            disabled={playing !== null}
            aria-busy={playing === accent}
            onClick={() => void play(accent)}
          >
            <span className="pronunciation-flag" aria-hidden="true">
              {accent === "US" ? "🇺🇸" : "🇬🇧"}
            </span>
            <span className="pronunciation-accent" lang="zh-CN">
              {accent === "US" ? "美音" : "英音"}
            </span>
            {!listening && ipa && (
              <span className="pronunciation-ipa">{ipa}</span>
            )}
            <Volume2 size={listening ? 22 : 16} />
            {playing === accent && (
              <span className="pronunciation-status">…</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
