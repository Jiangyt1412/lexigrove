import { test, expect } from "@playwright/test"; // # Browser tests validate behavior through accessible user controls.
import fs from "node:fs/promises";
import path from "node:path";
const screenshotPath = path.resolve("../lexigrove-desktop.png");
test("fullscreen study preserves navigation, readable order and hidden recall answers", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Settings & data", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Pronounce correct answers" })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Pronounce correct answers" }),
  ).not.toBeChecked(); // # Wait for the persisted controlled preference rather than assuming a synchronous DOM toggle.
  await page.getByRole("spinbutton", { name: "New words per day" }).fill("2"); // # Two introductions are followed by recall, rather than another unseen introduction.
  await page.getByRole("button", { name: "Today", exact: true }).click(); // # Layout verification does not depend on headless-system speech availability.
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  await expect(page).toHaveURL(/#study$/);
  await expect(page.locator(".sidebar, .topbar")).toHaveCount(0); // # The learning scene has no mounted home navigation.
  const target = page.locator(".target-word");
  await expect(target).toBeVisible();
  const word = (await target.innerText()).trim();
  const boxes = await Promise.all(
    [
      target,
      page.locator(".study-phonetics"),
      page.locator(".study-meaning .learning-definition"),
      page.locator(".study-example"),
      page.locator(".study-family"),
    ].map((l) => l.boundingBox()),
  );
  expect(boxes.every(Boolean)).toBe(true);
  expect(boxes[1]!.y).toBeGreaterThanOrEqual(
    boxes[0]!.y + boxes[0]!.height - 2,
  ); // # POS and pronunciation follow the target word in the revised learning hierarchy.
  expect(boxes[1]!.y).toBeLessThan(boxes[2]!.y);
  expect(boxes[0]!.y).toBeLessThan(boxes[2]!.y);
  expect(boxes[2]!.y).toBeLessThan(boxes[3]!.y);
  expect(boxes[3]!.y).toBeLessThan(boxes[4]!.y);
  await page.screenshot({
    path: path.resolve("../lexigrove-study-ocean.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(target).toHaveText(word); // # Reload resumes the saved session instead of starting another one.
  await page.goBack();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await page.goForward();
  await expect(target).toHaveText(word);
  await page.getByRole("textbox", { name: "Your answer" }).fill(word);
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const second = (await target.innerText()).trim();
  await page.getByRole("textbox", { name: "Your answer" }).fill(second);
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".study-label")).toContainText("Recall the word"); // # Wait for a genuine recall task before asserting that its answer material is hidden.
  await expect(
    page.locator(
      ".target-word, .study-phonetics, .study-meaning, .study-example, .study-family",
    ),
  ).toHaveCount(0); // # Reordering the reading card must not leak any answer material into recall.
  await page.screenshot({
    path: path.resolve("../lexigrove-recall-ocean.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Save & leave" }).click();
  await expect(
    page.getByRole("button", { name: "Resume session", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Toggle day and night theme" })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
  await page.screenshot({
    path: path.resolve("../lexigrove-home-night.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Resume session", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Your answer" }),
  ).toBeVisible();
  await page.screenshot({
    path: path.resolve("../lexigrove-study-night.png"),
    fullPage: true,
  });
});
test("flag buttons play distinct accents despite a saved US voice", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const played: { text: string; lang: string; voice: string }[] = [];
    Object.defineProperty(window, "__accentPlayback", { value: played }); // # Record the actual utterance sent to speech synthesis, not just button labels.
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        text: string;
        onend: ((event: Event) => void) | null = null;
        onerror = null;
        voice = null;
        lang = "en-US";
        rate = 1;
        constructor(text: string) {
          this.text = text;
        }
      },
    });
    Object.defineProperty(speechSynthesis, "getVoices", {
      value: () => [
        {
          name: "Samantha",
          lang: "en-US",
          voiceURI: "Samantha",
          localService: true,
          default: true,
        },
        {
          name: "Daniel",
          lang: "en-GB",
          voiceURI: "Daniel",
          localService: true,
          default: false,
        },
      ],
    });
    Object.defineProperty(speechSynthesis, "speak", {
      value: (u: SpeechSynthesisUtterance) => {
        played.push({ text: u.text, lang: u.lang, voice: u.voice?.name || "" });
        setTimeout(
          () => u.onend?.(new Event("end") as SpeechSynthesisEvent),
          10,
        );
      },
    });
    Object.defineProperty(speechSynthesis, "cancel", { value: () => {} });
  });
  await page.goto("./");
  await page
    .getByRole("button", { name: "Settings & data", exact: true })
    .click();
  await page.getByLabel("Voice", { exact: true }).selectOption("Samantha");
  await expect(page.getByLabel("Voice", { exact: true })).toHaveValue(
    "Samantha",
  );
  await page.getByRole("button", { name: "Vocabulary", exact: true }).click();
  await page.getByRole("textbox", { name: "Search vocabulary" }).fill("robust");
  await page.getByRole("button", { name: "robust adjective" }).click();
  const us = page.getByRole("button", { name: "Play US pronunciation" });
  const uk = page.getByRole("button", { name: "Play UK pronunciation" });
  await expect(us).toContainText("🇺🇸");
  await expect(uk).toContainText("🇬🇧");
  await expect(us).toContainText("/ɹoʊˈbʌst/");
  await expect(uk).toContainText("/ɹəʊˈbʌst/");
  await uk.click();
  await expect(uk).toBeEnabled();
  await us.click();
  await expect(us).toBeEnabled();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __accentPlayback: unknown[] }).__accentPlayback,
    ),
  ).toEqual([
    { text: "robust", lang: "en-GB", voice: "Daniel" },
    { text: "robust", lang: "en-US", voice: "Samantha" },
  ]);
  expect(
    await uk.evaluate((el) => getComputedStyle(el).fontFamily),
  ).not.toContain("Pixelify");
  await page.screenshot({ path: path.resolve("../lexigrove-accents.png") });
});
test("Chinese search, readable details and optional visibility persist", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Vocabulary", exact: true }).click();
  await page.getByRole("textbox", { name: "Search vocabulary" }).fill("缓解");
  await expect(page.locator(".vocabulary-row:not(.table-head)")).toHaveCount(1);
  await page.getByRole("button", { name: "mitigate verb" }).click();
  await expect(
    page.locator(".dictionary-modal .chinese-meaning"),
  ).toContainText("缓解");
  expect(
    await page
      .locator(".dictionary-modal .chinese-meaning")
      .evaluate((el) => getComputedStyle(el).fontFamily),
  ).not.toContain("Pixelify");
  await page.screenshot({ path: path.resolve("../lexigrove-chinese.png") });
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Settings & data", exact: true })
    .click();
  const chineseToggle = page.getByRole("checkbox", { name: "显示中文释义" });
  await chineseToggle.click(); // # Wait for the IndexedDB preference write before reloading.
  await expect(chineseToggle).not.toBeChecked();
  await page.reload();
  await page.getByRole("button", { name: "Vocabulary", exact: true }).click();
  await expect(page.locator(".chinese-meaning")).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Search vocabulary" })
    .fill("mitigate");
  await page.getByRole("button", { name: "mitigate verb" }).click();
  await expect(page.locator(".dictionary-modal .chinese-meaning")).toHaveCount(
    0,
  );
});
test("desktop home has honest counts, local fonts and no overflow", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Explore 60 words" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".today-strip .metric strong").first()).toHaveText(
    "0",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".world-sign")
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily),
  ).toContain("Pixelify");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".launch-actions .primary")).toBeVisible();
});
test("dictionary preserves the current answer and adds personal deck membership", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Your answer" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Your answer" }).fill("partial");
  await page.getByRole("button", { name: "Notes & entry" }).click();
  await expect(page.getByRole("dialog", { name: "Dictionary" })).toBeVisible();
  await page
    .getByRole("button", { name: "Learn this word", exact: true })
    .click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.getByRole("textbox", { name: "Your answer" })).toHaveValue(
    "partial",
  );
  await page.getByRole("button", { name: "Save & leave" }).click();
  await page.getByRole("button", { name: "My words", exact: true }).click();
  await expect(page.locator(".vocabulary-row:not(.table-head)")).toHaveCount(1);
});
test("copy and three interleaved modalities graduate real words", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        text: string;
        onend: ((event: Event) => void) | null = null;
        onerror = null;
        voice = null;
        lang = "en-US";
        rate = 1;
        constructor(text: string) {
          this.text = text;
        }
      },
    });
    Object.defineProperty(speechSynthesis, "getVoices", {
      value: () => [
        { name: "Test English", lang: "en-US", localService: true },
      ],
    });
    Object.defineProperty(speechSynthesis, "speak", {
      value: (u: SpeechSynthesisUtterance) =>
        setTimeout(
          () => u.onend?.(new Event("end") as SpeechSynthesisEvent),
          10,
        ),
    });
    Object.defineProperty(speechSynthesis, "cancel", { value: () => {} });
  });
  await page.goto("./");
  await page
    .getByRole("button", { name: "Settings & data", exact: true })
    .click();
  await page.getByRole("spinbutton", { name: "New words per day" }).fill("2");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  const words: string[] = [];
  for (let i = 0; i < 8; i++) {
    const input = page.getByRole("textbox", { name: "Your answer" });
    await expect(input).toBeVisible();
    if (i < 2) {
      const target = (await page.locator(".target-word").innerText()).trim();
      words.push(target);
      expect(
        await page
          .locator(".target-word")
          .evaluate((el) => getComputedStyle(el).fontFamily),
      ).not.toContain("Pixelify");
      expect(
        await page
          .locator(".word-meta")
          .evaluate((el) => getComputedStyle(el).fontFamily),
      ).not.toContain("Pixelify");
    }
    if (i === 4 || i === 5) {
      await expect(
        page.getByRole("button", { name: "Check answer" }),
      ).toBeDisabled();
      if (i === 4) {
        await input.fill(words[i % 2]);
        await page
          .getByRole("button", { name: "Play UK pronunciation" })
          .click(); // # The mocked device has no UK voice; failure cannot earn listening credit.
        await expect(page.getByRole("status")).toContainText("英音语音不可用");
        await expect(
          page.getByRole("button", { name: "Check answer" }),
        ).toBeDisabled();
      }
      await page.getByRole("button", { name: "Play US pronunciation" }).click();
      await expect(
        page.getByRole("button", { name: "Play US pronunciation" }),
      ).toBeEnabled();
      await expect(page.locator(".pronunciation-ipa")).toHaveCount(0); // # Accent controls must not leak spelling or IPA into a listening test.
    }
    await input.fill(words[i % 2]);
    await input.press("Enter");
    await expect(page.getByText("Correct", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await expect(
    page.getByRole("heading", { name: "A little more learned." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to your grove" }).click();
  await expect(page.locator(".today-strip .metric strong").nth(2)).toHaveText(
    "2",
  );
  await expect(page.locator(".living-garden .field-marker")).toContainText(
    "2 words cultivated",
  );
});
test("backup export validates, invalid restore is non-destructive, valid restore works", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Settings & data", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  const download = await downloadPromise;
  const local = await download.path();
  const backup = JSON.parse(await fs.readFile(local!, "utf8"));
  expect(backup.version).toBe(3);
  expect(backup.words.length).toBe(60);
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"format":"bad"}'),
  });
  await expect(page.getByRole("status")).toContainText(
    "Invalid or unsupported backup",
  );
  await page.locator("input[type=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByRole("dialog", { name: "Restore this backup?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Explore 60 words" }),
  ).toBeVisible();
});
test("word-only import can be completed through the existing-entry editor", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Vocabulary", exact: true }).click();
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "words.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("word\nwatershed\n"),
  });
  await page.getByRole("button", { name: "Import 1 rows" }).click();
  await page
    .getByRole("textbox", { name: "Search vocabulary" })
    .fill("watershed");
  await page.getByRole("button", { name: "watershed Personal entry" }).click();
  await page.getByRole("button", { name: "Edit definition & example" }).click();
  await page
    .getByLabel("English definition", { exact: true })
    .fill("An area that drains into a shared outlet.");
  await page
    .getByLabel("Example sentence", { exact: true })
    .fill("The watershed contains several streams.");
  await page.getByRole("button", { name: "Save word", exact: true }).click();
  await page.getByRole("button", { name: "watershed Personal entry" }).click();
  await expect(page.locator(".dictionary-definition")).toContainText(
    "An area that drains",
  );
});
test("cached shell, dictionary and fonts work offline after first load", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Explore 60 words" }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await document.fonts.ready;
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Start learning", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Vocabulary", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search vocabulary" })
    .fill("mitigate");
  await expect(
    page.getByRole("button", { name: "mitigate verb" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.fonts.check('18px "Pixelify Sans"')),
  ).toBe(true);
});
test("night and decoration-off do not change learning controls or counts", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Toggle day and night theme" })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
  await page
    .getByRole("button", { name: "Settings & data", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Environment", exact: true })
    .selectOption("off");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator(".living-world")).toHaveCount(0);
  await expect(page.locator(".today-strip .metric strong").nth(2)).toHaveText(
    "0",
  );
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Your answer" }),
  ).toBeVisible();
});
