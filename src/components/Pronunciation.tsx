import { useEffect, useRef, useState } from "react"; // # Shared accent controls keep dictionary and study playback consistent.
import type { Lexical, Settings } from "../types/model";
import { pronounce, isPlaybackCancelled } from "../speech/speech";
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
  const playback = useRef<AbortController | null>(null);
  useEffect(() => () => playback.current?.abort(), [word.id]); // # Closing an entry or advancing a task cannot credit stale audio.
  async function play(accent: Settings["accent"]) {
    if (lock.current) return;
    lock.current = true;
    setPlaying(accent);
    const controller = new AbortController();
    playback.current = controller;
    try {
      const completed = await pronounce(
        word,
        { ...settings, accent },
        { strictAccent: true, signal: controller.signal },
      );
      if (!controller.signal.aborted)
        onPlayed?.(completed.pronunciationId || undefined); // # Only the variant whose playback actually completed earns listening credit.
    } catch (error) {
      if (!isPlaybackCancelled(error)) notify((error as Error).message);
    } finally {
      lock.current = false;
      setPlaying(null);
    }
  }
  return (
    <div
      className={`pronunciation-pair ${listening ? "pronunciation-listening" : ""}`}
      role="group"
      aria-label="UK primary and US supplementary pronunciation"
    >
      {(["UK", "US"] as const).map((accent) => {
        const ipa = accent === "US" ? word.ipaUS : word.ipaUK;
        return (
          <button
            key={accent}
            type="button"
            className={`pronunciation-button ${accent === "UK" ? "primary-accent" : "secondary-accent"}`}
            aria-label={`Play ${accent} pronunciation`}
            title={
              (accent === "UK" ? word.audioUK : word.audioUS).startsWith(
                "assets/audio/",
              )
                ? `${accent === "UK" ? "英音为主 · bf_emma" : "美音辅助 · af_heart"} · Kokoro 预生成合成语音`
                : `Play ${accent} pronunciation`
            }
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
