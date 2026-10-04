import { test, expect, type Page } from "@playwright/test"; // # Exercise real bundled audio and grouped FSRS through fresh browser contexts.
import fs from "node:fs/promises";
import type { Backup } from "../../src/backup/backup";
import { createEmptyCard, fsrs, Rating } from "ts-fsrs";

async function settings(page: Page) {
  await page
    .getByRole("button", { name: "Settings & data", exact: true })
    .click();
}
async function exportState(page: Page): Promise<Backup> {
  await settings(page);
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  return JSON.parse(await fs.readFile((await (await pending).path())!, "utf8"));
}
async function restore(page: Page, backup: Backup) {
  await page.locator("input[type=file]").setInputFiles({
    name: "isolated-review-fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Restore this backup?" }),
  ).not.toBeVisible();
}
test("UK audio plays on arrival and submission, stays concealed during recall, and US remains separate", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const clips: string[] = [];
    Object.defineProperty(window, "__clips", { value: clips });
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      clips.push(this.src);
      return original.call(this); // # Observe real decode/playback, not a simulated successful recording.
    };
    Object.defineProperty(speechSynthesis, "getVoices", { value: () => [] });
    Object.defineProperty(speechSynthesis, "speak", {
      value: () => {
        throw Error("Unexpected system speech");
      },
    });
  });
  await page.goto("./");
  await settings(page);
  await expect(page.getByLabel("Accent", { exact: true })).toHaveValue("UK");
  await page.getByRole("spinbutton", { name: "New words per day" }).fill("2");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  const clips = () =>
    page.evaluate(() => (window as unknown as { __clips: string[] }).__clips);
  await expect.poll(clips).toHaveLength(1);
  const first = (await page.locator(".target-word").innerText()).trim();
  expect((await clips())[0]).toContain(`/assets/audio/uk/${first}.wav`);
  expect(
    await page
      .locator(".pronunciation-button")
      .first()
      .getAttribute("aria-label"),
  ).toBe("Play UK pronunciation");
  const input = page.getByRole("textbox", { name: "Your answer" });
  await input.pressSequentially(first.slice(0, 3));
  expect(await clips()).toHaveLength(1); // # Typing is not interpreted as a stream of repeated pronunciations.
  await input.fill(first);
  await input.press("Enter");
  await expect.poll(clips).toHaveLength(2);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect.poll(clips).toHaveLength(3);
  const second = (await page.locator(".target-word").innerText()).trim();
  await input.fill(second);
  await input.press("Enter");
  await expect.poll(clips).toHaveLength(4);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".study-label")).toContainText("Recall the word");
  await expect(page.locator(".target-word")).toHaveCount(0);
  await page.waitForTimeout(200);
  expect(await clips()).toHaveLength(4); // # Definition recall is not preceded by the spoken answer.
  await input.fill("wrong");
  await input.press("Enter");
  await expect.poll(clips).toHaveLength(5); // # Incorrect submitted spelling also receives the target pronunciation.
  await page.getByRole("button", { name: "Play US pronunciation" }).click();
  await expect.poll(clips).toHaveLength(6);
  expect((await clips())[5]).toContain(`/assets/audio/us/${first}.wav`);
  await expect(
    page.getByRole("button", { name: "Play US pronunciation" }),
  ).toBeEnabled();
  await expect(page.locator(".audio-feedback")).toHaveCount(0);
});

async function dueReview(page: Page) {
  await page.goto("./");
  const backup = await exportState(page),
    now = Date.now() - 86400000;
  const p = backup.progress.find((p) => p.wordId === "starter-mitigate")!;
  p.introduced = true;
  p.stage = p.streak = 3;
  p.everAcquired = true;
  p.acquiredAt = now;
  p.card = fsrs({
    enable_fuzz: false,
    enable_short_term: true,
    learning_steps: [],
    relearning_steps: ["10m"],
  }).next(createEmptyCard(new Date(now)), new Date(now), Rating.Good).card;
  p.card.due = new Date(Date.now() - 1000);
  backup.settings.autoPronounce = true;
  backup.sessions = [];
  await restore(page, backup);
  await page.getByRole("button", { name: /^Today/ }).click();
  await page.getByRole("button", { name: "Start review", exact: true }).click();
  await expect(page.locator(".target-word")).toHaveText("mitigate");
  await expect(
    page.locator(
      ".study-focus .study-meaning, .study-focus .study-phonetics, .answer-input",
    ),
  ).toHaveCount(0);
  return p;
} // # A fresh-browser fixture makes one real starter card due; it never reads the user's database.
async function repair(page: Page, modality: string, step: string) {
  await expect(page.locator(".study-label")).toContainText(step);
  const input = page.getByRole("textbox", { name: "Your answer" }),
    check = page.getByRole("button", { name: "Check answer" });
  await input.fill("mitigate");
  if (modality === "audio" && (await check.isDisabled()))
    await page.getByRole("button", { name: "Play UK pronunciation" }).click();
  await expect(check).toBeEnabled();
  await check.click();
  await expect(page.locator(".result-label")).toContainText("Correct");
}
test("review opens editable details, restores its draft, and known changed to unknown repeats three stages with one lapse", async ({
  page,
}) => {
  const before = await dueReview(page);
  await page.getByRole("button", { name: "认识", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Dictionary" });
  await expect(dialog.locator(".word-title")).toHaveText("mitigate");
  await expect(dialog.locator(".dictionary-definition")).toContainText(
    "less severe",
  );
  await dialog.getByRole("button", { name: "不认识", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "不认识", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "不认识", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "mitigation", exact: true }).click();
  await expect(dialog.locator(".word-title")).toHaveText("mitigation");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(
    dialog.getByRole("button", { name: "Create a personal entry" }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "返回正在复习的释义" }).click();
  await expect(dialog.locator(".word-title")).toHaveText("mitigate");
  await expect(
    dialog.getByRole("button", { name: "不认识", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "../lexigrove-review-confirmation.png" });
  await dialog.getByRole("button", { name: "确认并继续" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".target-word")).toHaveText("mitigate");
  await repair(page, "copy", "1 / 3");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".target-word")).toHaveCount(0);
  await expect(page.locator(".recall-prompt")).toContainText("缓解");
  await repair(page, "definition", "2 / 3");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".target-word, .pronunciation-ipa")).toHaveCount(0);
  await repair(page, "audio", "3 / 3");
  await expect(page.getByText(/本次遗忘或考核有错/)).toBeVisible();
  await page.getByRole("button", { name: "Save & leave" }).click();
  const saved = await exportState(page),
    p = saved.progress.find((p) => p.id === before.id)!;
  expect(p.card!.reps).toBe(before.card!.reps + 1);
  expect(p.card!.lapses).toBe(1);
  expect(p.reviewSuccesses).toBe(0);
  expect(
    saved.attempts
      .filter((a) => a.mode === "review")
      .sort((a, b) => a.reviewStep! - b.reviewStep!)
      .map((a) => [a.modality, a.rating]),
  ).toEqual([
    ["recognition", null],
    ["copy", null],
    ["definition", null],
    ["audio", 1],
  ]);
});
test("uncertain review resumes at listening and updates FSRS once after both tests", async ({
  page,
}) => {
  const before = await dueReview(page);
  await page.getByRole("button", { name: "不确定", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认并继续" })
    .click();
  await repair(page, "definition", "1 / 2");
  await expect(
    page.getByText("本题已保存，完成本组后安排下次复习。", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.reload();
  await expect(page.locator(".study-label")).toContainText("2 / 2");
  await expect(page.locator(".target-word, .pronunciation-ipa")).toHaveCount(0);
  await repair(page, "audio", "2 / 2");
  await page.getByRole("button", { name: "Save & leave" }).click();
  const saved = await exportState(page),
    p = saved.progress.find((p) => p.id === before.id)!;
  expect(p.card!.reps).toBe(before.card!.reps + 1);
  expect(p.reviewSuccesses).toBe(1);
  const events = saved.attempts
    .filter((a) => a.mode === "review")
    .sort((a, b) => a.reviewStep! - b.reviewStep!);
  expect(events.map((a) => [a.modality, a.rating])).toEqual([
    ["recognition", null],
    ["definition", null],
    ["audio", 2],
  ]);
  expect(events[2].pronunciationId).toBe("starter-mitigate:entry:1:pron:UK");
  expect(saved.sessions[0].recall!.groups[p.id]).toEqual({
    choice: "unsure",
    phase: "complete",
    completed: 2,
    failed: false,
  });
});
test("known confirmed in details completes review without typing or listening tests", async ({
  page,
}) => {
  const before = await dueReview(page);
  await page.screenshot({ path: "../lexigrove-recognition-desktop.png" });
  await page.getByRole("button", { name: "认识", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认并继续" })
    .click();
  await expect(
    page.getByRole("heading", { name: "A little more learned." }),
  ).toBeVisible();
  await expect(page.locator(".answer-input")).toHaveCount(0);
  await page.getByRole("button", { name: "Back to your grove" }).click();
  const saved = await exportState(page),
    p = saved.progress.find((p) => p.id === before.id)!;
  expect(p.card!.reps).toBe(before.card!.reps + 1);
  expect(p.reviewSuccesses).toBe(1);
  expect(
    saved.attempts
      .filter((a) => a.mode === "review")
      .map((a) => [a.modality, a.rating, a.answer]),
  ).toEqual([["recognition", 3, "known"]]);
});

test("blocked autoplay reports the policy failure and can be retried manually", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    let blocked = true;
    HTMLMediaElement.prototype.play = function () {
      if (blocked) {
        blocked = false;
        return Promise.reject(
          new DOMException("Blocked by test", "NotAllowedError"),
        );
      }
      return original.call(this); // # One policy failure followed by real user-initiated playback.
    };
  });
  await page.goto("./");
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  await expect(page.locator(".audio-feedback")).toContainText(
    "浏览器阻止了自动发音",
  );
  await page.getByRole("button", { name: "Play UK pronunciation" }).click();
  await expect(
    page.getByRole("button", { name: "Play UK pronunciation" }),
  ).toBeEnabled();
});

test("all 120 clips cache and British and American word audio actually finish offline", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    const ended: string[] = [];
    Object.defineProperty(window, "__endedClips", { value: ended });
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      this.addEventListener("ended", () => ended.push(this.src), {
        once: true,
      });
      return original.call(this); // # A real decode/end event, not a simulated audio success.
    };
    Object.defineProperty(speechSynthesis, "getVoices", { value: () => [] });
  });
  await page.goto("./");
  await settings(page);
  await page.getByRole("checkbox", { name: /自动发音/ }).click();
  await expect(
    page.getByRole("checkbox", { name: /自动发音/ }),
  ).not.toBeChecked();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const cachesList = await caches.keys(),
            urls = (
              await Promise.all(
                cachesList.map(async (key) =>
                  (await (await caches.open(key)).keys()).map((r) => r.url),
                ),
              )
            ).flat();
          return new Set(
            urls.filter(
              (url) =>
                url.includes("/assets/audio/") &&
                new URL(url).pathname.endsWith(".wav"),
            ),
          ).size;
        }),
      { timeout: 30000 },
    )
    .toBe(120);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.getByRole("button", { name: /^Today/ }).click();
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  const word = (await page.locator(".target-word").innerText()).trim();
  const completed = () =>
    page.evaluate(
      () => (window as unknown as { __endedClips: string[] }).__endedClips,
    );
  const cachedResponse = page.waitForResponse((response) =>
    response.url().endsWith(`/assets/audio/uk/${word}.wav`),
  ); // # Verify that offline media really uses the service worker's byte-range route.
  await page.getByRole("button", { name: "Play UK pronunciation" }).click();
  await expect.poll(completed).toHaveLength(1);
  const response = await cachedResponse;
  expect(response.fromServiceWorker()).toBe(true);
  expect(response.status()).toBe(206);
  expect(response.headers()["content-range"]).toMatch(/^bytes /);
  expect((await completed())[0]).toContain(`/assets/audio/uk/${word}.wav`);
  await page.getByRole("button", { name: "Play US pronunciation" }).click();
  await expect.poll(completed).toHaveLength(2);
  expect((await completed())[1]).toContain(`/assets/audio/us/${word}.wav`);
  await expect(page.locator(".audio-feedback")).toHaveCount(0);
});
