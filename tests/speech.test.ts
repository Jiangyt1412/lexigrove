import { describe, expect, it } from "vitest"; // # Validate voice choice independently of actual hardware playback.
import { selectVoice } from "../src/speech/speech";
import { defaultSettings, settingsSchema } from "../src/types/model";
const voice = (name: string, lang = "en-US", localService = true) => ({
  name,
  lang,
  localService,
  voiceURI: name,
  default: false,
});
describe("pronunciation voice selection", () => {
  it("avoids character voices even when they appear first or are the default", () => {
    const voices = [
      { ...voice("Albert"), default: true },
      voice("Fred"),
      voice("Whisper"),
      voice("Kathy"),
    ];
    expect(selectVoice(voices, defaultSettings)?.name).toBe("Kathy");
    expect(selectVoice([voice("Whisper")], defaultSettings)).toBeUndefined();
  });
  it("prefers a matching accent and upgraded regular voice", () => {
    expect(
      selectVoice([voice("Kathy"), voice("Samantha")], defaultSettings)?.name,
    ).toBe("Samantha");
    const voices = [
      voice("Samantha"),
      voice("Daniel", "en-GB"),
      voice("Samantha (Enhanced)"),
    ];
    expect(
      selectVoice(voices, { ...defaultSettings, accent: "US" })?.name,
    ).toBe("Samantha (Enhanced)");
    expect(
      selectVoice(voices, { ...defaultSettings, accent: "UK" })?.name,
    ).toBe("Daniel");
  });
  it("honors explicit voice choice and falls back safely when offline", () => {
    const voices = [voice("Kathy"), voice("Online English", "en-US", false)];
    const settings = {
      ...defaultSettings,
      accent: "US" as const,
      voiceURI: "Online English",
    };
    expect(selectVoice(voices, settings, true)?.name).toBe("Online English");
    expect(selectVoice(voices, settings, false)?.name).toBe("Kathy");
  });
  it("reads existing settings and backups without requiring a new voice field", () => {
    const old = { ...defaultSettings };
    delete (old as Partial<typeof old>).voiceURI;
    expect(settingsSchema.parse(old).voiceURI).toBe("");
  });
  it("a saved US voice cannot override a UK accent request", () => {
    const voices = [voice("Samantha"), voice("Daniel", "en-GB")];
    expect(
      selectVoice(voices, { accent: "UK", voiceURI: "Samantha" }, true, true)
        ?.name,
    ).toBe("Daniel");
    expect(
      selectVoice(voices, { accent: "US", voiceURI: "Daniel" }, true, true)
        ?.name,
    ).toBe("Samantha");
  });
  it("country-labelled playback never falls back to the other accent", () => {
    const uk = { accent: "UK" as const, voiceURI: "" };
    expect(selectVoice([voice("Samantha")], uk, true, true)).toBeUndefined();
    const online = voice("British neural", "en-GB", false);
    expect(
      selectVoice([online, voice("Samantha")], uk, false, true),
    ).toBeUndefined();
    expect(
      selectVoice([voice("Scottish English", "en_GB-scotland")], uk, true, true)
        ?.name,
    ).toBe("Scottish English");
  });
});
