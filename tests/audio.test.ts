import { afterEach, describe, expect, it, vi } from "vitest"; // # Playback completion, cancellation and owned variants are tested without relying on hardware voices.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  pronounce,
  recordingUrl,
  speechAvailable,
  stopPronunciation,
} from "../src/speech/speech";
import { defaultSettings, manualEntry } from "../src/types/model";
import { hydrateWord } from "../src/vocabulary/lexicon";
import manifest from "../public/assets/audio/manifest.json";

const word = hydrateWord({
  ...manualEntry("adapt", "To change.", "We adapt."),
  audioUK: "assets/audio/uk/adapt.wav",
  audioUS: "assets/audio/us/adapt.wav",
  audioAttribution: "Attributed test fixture",
});
class FakeAudio {
  static instances: FakeAudio[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  playbackRate = 1;
  crossOrigin: string | null = null;
  paused = false;
  constructor(public url: string) {
    FakeAudio.instances.push(this);
  }
  play() {
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}
function device() {
  FakeAudio.instances = [];
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("navigator", { onLine: false });
  vi.stubGlobal("speechSynthesis", {
    getVoices: () => [],
    cancel: vi.fn(),
    speak: vi.fn(),
  });
}
afterEach(() => {
  stopPronunciation();
  vi.unstubAllGlobals();
});
describe("bundled pronunciation", () => {
  it("works offline without installed voices and identifies the actual completed UK variant", async () => {
    device();
    expect(defaultSettings.accent).toBe("UK");
    expect(speechAvailable(word, defaultSettings)).toBe(true);
    const played = pronounce(word, defaultSettings);
    expect(FakeAudio.instances[0].url).toContain("/assets/audio/uk/adapt.wav");
    expect(FakeAudio.instances[0].crossOrigin).toBe("anonymous");
    FakeAudio.instances[0].onended!();
    expect(await played).toEqual({
      pronunciationId: `${word.id}:entry:1:pron:UK`,
      source: "recording",
    });
  });
  it("preserves external attributed audio playback without imposing a new CORS requirement", async () => {
    device();
    vi.stubGlobal("navigator", { onLine: true });
    const imported = structuredClone(word);
    imported.entries[0].pronunciations.find((p) => p.locale === "UK")!.audioURL =
      "https://audio.example.test/adapt.mp3";
    const played = pronounce(imported, defaultSettings);
    expect(FakeAudio.instances[0].url).toBe("https://audio.example.test/adapt.mp3");
    expect(FakeAudio.instances[0].crossOrigin).toBeNull();
    FakeAudio.instances[0].onended!();
    expect((await played).source).toBe("recording");
  });
  it("stops a previous pronunciation instead of mixing two words or crediting cancelled audio", async () => {
    device();
    const first = pronounce(word, defaultSettings);
    const rejected = expect(first).rejects.toMatchObject({
      name: "AbortError",
    });
    const second = pronounce(word, { ...defaultSettings, accent: "US" });
    expect(FakeAudio.instances[0].paused).toBe(true);
    FakeAudio.instances[1].onended!();
    await rejected;
    expect((await second).pronunciationId).toBe(`${word.id}:entry:1:pron:US`);
  });
  it("accepts an owned pronunciation projected from a separate learning-group ID", async () => {
    device();
    const projected = {
      ...word,
      id: "separate-learning-group",
      wordId: word.id,
      pronunciationIds: [
        word.entries[0].pronunciations.find((p) => p.locale === "UK")!
          .pronunciationId,
      ],
    };
    const played = pronounce(projected, defaultSettings);
    FakeAudio.instances[0].onended!();
    expect((await played).pronunciationId).toBe(projected.pronunciationIds[0]); // # Projected group IDs are not canonical word IDs and must not be revalidated as a flat word.
  });
  it("reports autoplay policy failure without silently substituting a system voice", async () => {
    device();
    vi.spyOn(FakeAudio.prototype, "play").mockRejectedValueOnce(
      new DOMException("Blocked", "NotAllowedError"),
    );
    await expect(pronounce(word, defaultSettings)).rejects.toThrow(
      "浏览器阻止了自动发音",
    );
    expect(speechSynthesis.speak).not.toHaveBeenCalled();
  });
  it("resolves portable app assets and refuses filesystem or traversal paths", () => {
    expect(recordingUrl("assets/audio/uk/adapt.wav")).toContain(
      "/assets/audio/uk/adapt.wav",
    );
    expect(recordingUrl("file:///tmp/adapt.wav")).toBe("");
    expect(recordingUrl("assets/audio/uk/../../secret.wav")).toBe("");
  });
  it("ships exactly two non-silent PCM clips per starter word with reproducible checksums", () => {
    expect(manifest.entries).toHaveLength(120);
    expect(
      new Set(manifest.entries.map((a) => `${a.lemma}-${a.accent}`)).size,
    ).toBe(120);
    for (const clip of manifest.entries) {
      const file = readFileSync(
        new URL(`../public/${clip.file}`, import.meta.url),
      );
      expect(file.toString("ascii", 0, 4)).toBe("RIFF");
      expect(file.toString("ascii", 8, 12)).toBe("WAVE");
      expect(file.readUInt16LE(20)).toBe(1);
      expect(file.readUInt16LE(22)).toBe(1);
      expect(file.readUInt32LE(24)).toBe(24000);
      const offset = file.indexOf(Buffer.from("data")) + 8;
      let peak = 0;
      for (let i = offset; i + 1 < file.length; i += 2)
        peak = Math.max(peak, Math.abs(file.readInt16LE(i)));
      expect(peak).toBeGreaterThan(1000);
      expect(peak).toBeLessThan(32767); // # Normalized generated PCM must be audible and not clipped.
      expect(createHash("sha256").update(file).digest("hex")).toBe(clip.sha256);
      expect(file.length).toBe(clip.bytes);
      expect(clip.durationSeconds).toBeGreaterThan(0.2);
      expect(clip.durationSeconds).toBeLessThan(5.2);
    } // # Codec playback itself is checked separately in the browser, including the Pages base path.
  });
});
