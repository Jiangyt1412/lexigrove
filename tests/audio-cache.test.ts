import { afterEach, expect, it, vi } from "vitest"; // # Verify bounded downloads and foreground priority rather than duplicating cache configuration.
import {
  holdAudioDownloads,
  warmStarterAudio,
} from "../src/speech/audio-cache";

const releases: Array<() => void> = [];
afterEach(() => {
  releases.splice(0).forEach((release) => release());
  vi.unstubAllGlobals();
});
function cacheDevice() {
  const stored = new Map<string, Response>();
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("location", { href: "https://example.test/lexigrove/" });
  vi.stubGlobal("caches", {
    open: async () => ({
      match: async (url: string) => stored.get(url),
      put: async (url: string, response: Response) => {
        stored.set(url, response);
      },
    }),
  });
  return stored;
}
it("warms the finite clips with at most two downloads and reuses completed full-body cache entries", async () => {
  const stored = cacheDevice();
  let active = 0,
    peak = 0;
  const download = vi.fn(async () => {
    peak = Math.max(peak, ++active);
    await new Promise((resolve) => setTimeout(resolve, 0));
    active--;
    return new Response("complete clip", { status: 200 });
  });
  vi.stubGlobal("fetch", download);
  await warmStarterAudio();
  expect(peak).toBe(2);
  expect(stored.size).toBe(120);
  expect(
    [...stored.keys()].every((url) =>
      url.startsWith("https://example.test/assets/audio/"),
    ),
  ).toBe(true);
  await warmStarterAudio();
  expect(download).toHaveBeenCalledTimes(120);
});
it("foreground playback aborts background transfers, pauses new downloads, then retries full clips", async () => {
  const stored = cacheDevice();
  let immediate = false;
  const download = vi.fn((_url: string, options: RequestInit) => {
    if (immediate)
      return Promise.resolve(new Response("complete", { status: 200 }));
    return new Promise<Response>((_resolve, reject) => {
      options.signal!.addEventListener(
        "abort",
        () => reject(new DOMException("Paused", "AbortError")),
        { once: true },
      );
    });
  });
  vi.stubGlobal("fetch", download);
  const warming = warmStarterAudio();
  await vi.waitFor(() => expect(download).toHaveBeenCalledTimes(2));
  const release = holdAudioDownloads();
  releases.push(release);
  expect(
    download.mock.calls.every(([, options]) => options.signal!.aborted),
  ).toBe(true);
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(download).toHaveBeenCalledTimes(2);
  expect(stored.size).toBe(0);
  immediate = true;
  release();
  await warming;
  expect(stored.size).toBe(120);
});
