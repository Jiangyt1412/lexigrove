import starter from "../../data/starter-audio.json"; // # Cache only the finite, shipped starter clips.
import { assetUrl } from "../utils/assets";

export const AUDIO_CACHE = "lexigrove-audio-a3073bb43d3a"; // # Version follows the current audio provenance manifest, independent of user data.
let warming: Promise<void> | null = null;
let foreground = 0;
const downloads = new Set<AbortController>();
const waiting = new Set<() => void>();

export function holdAudioDownloads() {
  foreground++;
  for (const download of downloads) download.abort("foreground");
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--foreground === 0) {
      for (const resume of waiting) resume();
      waiting.clear();
    }
  }; // # Playback cancels background transfers and resumes them only after the last active pronunciation ends.
}

async function waitForPlayback() {
  if (foreground) await new Promise<void>((resolve) => waiting.add(resolve));
}

export function warmStarterAudio(): Promise<void> {
  if (warming) return warming;
  if (typeof caches === "undefined" || !navigator.onLine)
    return Promise.resolve();
  warming = (async () => {
    const cache = await caches.open(AUDIO_CACHE);
    const paths = starter.entries.flatMap((entry) => [entry.UK, entry.US]);
    let next = 0;
    async function worker() {
      while (next < paths.length) {
        const path = paths[next++];
        const url = new URL(assetUrl(path), location.href).href;
        if (await cache.match(url)) continue;
        let retry = true;
        while (retry) {
          retry = false;
          while (foreground) await waitForPlayback(); // # Recheck after each wake-up so a new pronunciation keeps priority.
          if (!navigator.onLine) return;
          const controller = new AbortController();
          downloads.add(controller);
          const deadline = setTimeout(() => controller.abort("timeout"), 20000);
          try {
            const response = await fetch(url, {
              signal: controller.signal,
              priority: "low",
            });
            if (response.status === 200) await cache.put(url, response);
          } catch {
            if (controller.signal.reason === "foreground") retry = true;
            // # A failed/full-download timeout leaves this clip uncached and is retried on the next page load or online event.
          } finally {
            clearTimeout(deadline);
            downloads.delete(controller);
          }
        }
      }
    }
    await Promise.all([worker(), worker()]); // # Two full-body downloads avoid a 120-request install burst; media Range requests stay separate.
  })()
    .catch(() => undefined)
    .finally(() => {
      warming = null;
    }); // # Cache quota or availability failures do not block learning or fabricate offline readiness.
  return warming;
}
