import type { Lexical, Settings } from "../types/model"; // # Speech support varies by browser and installed voices.
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
export function speechAvailable() {
  return englishVoices().length > 0;
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
export async function pronounce(
  word: Lexical,
  settings: Settings,
  options: { strictAccent?: boolean } = {},
) {
  const url = settings.accent === "US" ? word.audioUS : word.audioUK;
  if (
    (settings.audioPreference === "human" || word.lexicalAudioRequired) &&
    url &&
    word.audioAttribution &&
    /^https:\/\//.test(url) &&
    navigator.onLine
  ) {
    try {
      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(url);
        audio.playbackRate = settings.speed;
        audio.onended = () => resolve();
        audio.onerror = () => reject(Error("Recording unavailable"));
        audio.play().catch(reject);
      });
      return;
    } catch {
      /* # A failed open recording falls back to installed system speech. */
    }
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
    options.strictAccent,
  );
  if (!voice)
    throw Error(
      options.strictAccent
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
    utterance.onend = () => resolve();
    utterance.onerror = () =>
      reject(Error("Pronunciation did not finish. Please try again."));
    speechSynthesis.speak(utterance);
  });
}
