import { defaultSettings, type Lexical, type Settings } from "../types/model"; // # Speech support varies by browser and installed voices.
import { hydrateWord } from "../vocabulary/lexicon";
import { assetUrl } from "../utils/assets";
import { holdAudioDownloads } from "./audio-cache";
type Voice = Pick<
  SpeechSynthesisVoice,
  "name" | "lang" | "voiceURI" | "localService" | "default"
>;
const effects =
  /^(albert|bad news|bahh|bells|boing|bubbles|cellos|fred|good news|jester|junior|organ|ralph|superstar|trinoids|whisper|wobble|zarvox)(?:\b|$)/i; // # Avoid macOS character and sound-effect voices in automatic pronunciation.
const preferred = [
  "samantha",
  "ava",
  "allison",
  "susan",
  "zoe",
  "alex",
  "tom",
  "daniel",
  "serena",
  "oliver",
  "stephanie",
  "karen",
  "moira",
  "tessa",
  "rishi",
  "kathy",
]; // # Give regular voices a stable preference order instead of using device enumeration order.
export function voiceMatchesAccent(
  voice: Pick<Voice, "lang">,
  accent: Settings["accent"],
) {
  const locale = voice.lang.replaceAll("_", "-").toLowerCase();
  const requested = accent === "US" ? "en-us" : "en-gb";
  return locale === requested || locale.startsWith(`${requested}-`); // # Include regional variants while preserving the country distinction.
}
export function selectVoice<T extends Voice>(
  voices: T[],
  settings: Pick<Settings, "accent" | "voiceURI">,
  online = true,
  strictAccent = false,
): T | undefined {
  const available = voices.filter(
    (v) =>
      /^en(?:[-_]|$)/i.test(v.lang) &&
      (online || v.localService) &&
      (!strictAccent || voiceMatchesAccent(v, settings.accent)),
  );
  const explicit =
    settings.voiceURI &&
    available.find(
      (v) =>
        v.voiceURI === settings.voiceURI &&
        voiceMatchesAccent(v, settings.accent),
    ); // # A saved US voice must not override a UK button, or vice versa.
  if (explicit) return explicit;
  const preference = (v: Voice) => {
    const index = preferred.findIndex((name) =>
      new RegExp(`\\b${name}\\b`, "i").test(v.name),
    );
    return index < 0 ? 0 : 50 - index;
  };
  const score = (v: Voice) =>
    (voiceMatchesAccent(v, settings.accent) ? 300 : 0) +
    (/enhanced|premium|natural|neural/i.test(v.name) ? 80 : 0) +
    preference(v) +
    (v.localService ? 20 : 0) +
    (v.default ? 5 : 0);
  return available
    .filter((v) => !effects.test(v.name))
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))[0];
}
export function englishVoices() {
  if (typeof speechSynthesis === "undefined") return [];
  return speechSynthesis
    .getVoices()
    .filter(
      (v) =>
        /^en(?:[-_]|$)/i.test(v.lang) && (navigator.onLine || v.localService),
    );
}
function ownedVariant(word: Lexical, accent: Settings["accent"]) {
  return (word.entries.length ? word.entries : hydrateWord(word).entries)
    .flatMap((e) => e.pronunciations)
    .find(
      (p) =>
        p.locale === accent &&
        (!word.pronunciationIds ||
          word.pronunciationIds.includes(p.pronunciationId)),
    ); // # Playback and listening history always refer to the current entry's actual accent variant.
}
export function recordingUrl(path: string) {
  if (/^assets\/audio\/(?:uk|us)\/[a-z]+\.(?:m4a|mp3|wav)$/.test(path))
    return assetUrl(path);
  if (/^https:\/\//.test(path)) return path;
  return ""; // # Portable bundled paths work at / and /lexigrove/ without accepting arbitrary local filesystem URLs.
}
export function speechAvailable(
  word?: Lexical,
  settings: Settings = defaultSettings,
) {
  if (word) {
    const variant = ownedVariant(word, settings.accent);
    if (
      variant?.audioAttribution &&
      recordingUrl(variant.audioURL) &&
      (variant.audioURL.startsWith("assets/audio/") || navigator.onLine)
    )
      return true;
    if (word.lexicalAudioRequired) return false;
  }
  return !!selectVoice(englishVoices(), settings, navigator.onLine, true);
}
async function readyVoices() {
  const voices = englishVoices();
  if (voices.length) return voices;
  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      speechSynthesis.removeEventListener("voiceschanged", update);
      resolve(englishVoices());
    };
    const update = () => {
      if (englishVoices().length) finish();
    };
    const timer = setTimeout(finish, 1500); // # Voice enumeration can complete after the initial page render.
    speechSynthesis.addEventListener("voiceschanged", update);
    update();
  });
}
let activeStop: (() => void) | null = null;
export function stopPronunciation() {
  activeStop?.();
}
export function isPlaybackCancelled(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
export type Playback = {
  pronunciationId: string | null;
  source: "recording" | "system";
};
export async function pronounce(
  word: Lexical,
  settings: Settings,
  options: { strictAccent?: boolean; signal?: AbortSignal } = {},
): Promise<Playback> {
  stopPronunciation();
  if (options.signal?.aborted)
    throw new DOMException("Playback cancelled", "AbortError");
  const controller = new AbortController();
  const releaseDownloads = holdAudioDownloads();
  const cancel = () => controller.abort();
  activeStop = cancel;
  options.signal?.addEventListener("abort", cancel, { once: true });
  const variant = ownedVariant(word, settings.accent);
  const url = recordingUrl(variant?.audioURL || "");
  try {
    if (
      (settings.audioPreference === "human" || word.lexicalAudioRequired) &&
      url &&
      variant?.audioAttribution &&
      (variant.audioURL.startsWith("assets/audio/") || navigator.onLine)
    ) {
      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(url);
        audio.crossOrigin = "anonymous"; // # Cached media uses Workbox's supported CORS/Range-request path, including same-origin files.
        audio.playbackRate = settings.speed;
        const finish = (error?: Error) => {
          clearTimeout(timer);
          controller.signal.removeEventListener("abort", abort);
          audio.onended = null;
          audio.onerror = null;
          audio.pause();
          if (error) reject(error);
          else resolve();
        };
        const abort = () =>
          finish(new DOMException("Playback cancelled", "AbortError"));
        const timer = setTimeout(
          () => finish(Error("音频未能播放完成，请点击英音按钮重试。")),
          15000,
        );
        controller.signal.addEventListener("abort", abort, { once: true });
        audio.onended = () => finish();
        audio.onerror = () =>
          finish(Error("录音加载失败，请检查连接后重试。听写进度仍然保留。"));
        audio
          .play()
          .catch((error) =>
            finish(
              error?.name === "NotAllowedError"
                ? Error("浏览器阻止了自动发音，请点击英音按钮启用播放。")
                : error,
            ),
          );
      });
      return { pronunciationId: variant.pronunciationId, source: "recording" }; // # Failed recordings stay visible instead of silently replacing them with the robotic voice the user rejected.
    }
    if (word.lexicalAudioRequired)
      throw Error(
        "This pronunciation needs an entry-specific recording. Playback is unavailable; the listening test remains pending.",
      ); // # Unconstrained TTS cannot reliably disambiguate heteronyms.
    if (typeof speechSynthesis === "undefined")
      throw Error("Speech is unavailable on this device.");
    const voice = selectVoice(
      await readyVoices(),
      settings,
      navigator.onLine,
      options.strictAccent ?? true,
    );
    if (controller.signal.aborted)
      throw new DOMException("Playback cancelled", "AbortError");
    if (!voice)
      throw Error(
        (options.strictAccent ?? true)
          ? `${settings.accent === "US" ? "美音" : "英音"}语音不可用。请在系统中安装${settings.accent === "US" ? "美国" : "英国"}英语语音后重试。`
          : "No regular English voice is available. Choose an installed voice in Settings or install an English system voice. This listening test stays pending.",
      );
    await new Promise<void>((resolve, reject) => {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word.lemma);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = settings.speed;
      utterance.pitch = 1; // # Keep the selected voice at its original pitch.
      const finish = (error?: Error) => {
        clearTimeout(timer);
        controller.signal.removeEventListener("abort", abort);
        utterance.onend = null;
        utterance.onerror = null;
        if (error) reject(error);
        else resolve();
      };
      const abort = () => {
        speechSynthesis.cancel();
        finish(new DOMException("Playback cancelled", "AbortError"));
      };
      const timer = setTimeout(
        () => finish(Error("Pronunciation did not finish. Please try again.")),
        15000,
      );
      controller.signal.addEventListener("abort", abort, { once: true });
      utterance.onend = () => finish();
      utterance.onerror = () =>
        finish(Error("Pronunciation did not finish. Please try again."));
      speechSynthesis.speak(utterance);
    });
    const neutral = (
      word.entries.length ? word.entries : hydrateWord(word).entries
    )
      .flatMap((e) => e.pronunciations)
      .find(
        (p) =>
          p.locale === "neutral" &&
          (!word.pronunciationIds ||
            word.pronunciationIds.includes(p.pronunciationId)),
      );
    return {
      pronunciationId:
        variant?.pronunciationId || neutral?.pronunciationId || null,
      source: "system",
    };
  } finally {
    releaseDownloads();
    options.signal?.removeEventListener("abort", cancel);
    if (activeStop === cancel) activeStop = null;
  }
}
