import { test, expect } from "@playwright/test"; // # Fresh test origins never modify the user's saved study data.
import fs from "node:fs/promises";
import path from "node:path";
import { createEmptyCard, fsrs, Rating } from "ts-fsrs";
const shot = (name: string) => path.resolve(`../lexigrove-${name}.png`);
test("four seasons change coastal artwork and details while motion preferences persist", async ({
  page,
}) => {
  await page.goto("./");
  const fixtures = {
    spring: "blossoms",
    summer: null,
    autumn: "falling-leaf",
    winter: "roof-snow",
  };
  for (const season of ["spring", "summer", "autumn", "winter"] as const) {
    await page
      .getByRole("button", { name: "Settings & data", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Season", exact: true })
      .selectOption(season);
    await expect(
      page.getByRole("combobox", { name: "Season", exact: true }),
    ).toHaveValue(season);
    await page.getByRole("button", { name: "Today", exact: true }).click();
    const scene = page.locator(".coastal-world");
    await expect(scene).toHaveCount(1);
    await expect(scene).toHaveAttribute("data-season", season);
    await expect(scene.locator(".coast-backdrop")).toHaveAttribute(
      "src",
      new RegExp(`coast-${season}\\.webp$`),
    ); // # Each season changes its underlying scenery as well as foreground decorations.
    await expect
      .poll(() =>
        scene
          .locator(".coast-backdrop")
          .evaluate((image) => (image as HTMLImageElement).naturalWidth > 0),
      )
      .toBe(true);
    if (fixtures[season])
      await expect(
        scene.locator(`[data-detail="${fixtures[season]}"]`).first(),
      ).toBeVisible();
    expect(await scene.evaluate((el) => getComputedStyle(el).filter)).toBe(
      "none",
    );
    await page.screenshot({ path: shot(`home-${season}`), fullPage: true });
  }
  await page
    .getByRole("button", { name: "Toggle day and night theme" })
    .click();
  await expect(page.locator(".coastal-world")).toHaveAttribute(
    "data-night",
    "true",
  );
  const contrasts = await page
    .locator(".coastal-status > span")
    .evaluateAll((tiles) =>
      tiles.map((tile) => {
        const luminance = (color: string) => {
          const channels = color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((n) => {
              const c = n / 255;
              return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            });
          return (
            channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
          );
        }; // # Inspect actual rendered foreground/background after every stylesheet has applied.
        const foreground = luminance(
          getComputedStyle(tile.querySelector("b")!).color,
        );
        const background = luminance(
          getComputedStyle(tile.parentElement!).backgroundColor,
        );
        return (
          (Math.max(foreground, background) + 0.05) /
          (Math.min(foreground, background) + 0.05)
        );
      }),
    );
  expect(contrasts).toHaveLength(4);
  expect(contrasts.every((ratio) => ratio >= 4.5)).toBe(true); // # Small world status values retain text contrast in night mode.
  await page.screenshot({ path: shot("home-seasonal-night"), fullPage: true });
  await page
    .getByRole("button", { name: "Settings & data", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Environment animation", exact: true })
    .selectOption("reduced");
  await expect(
    page.getByRole("combobox", { name: "Environment animation", exact: true }),
  ).toHaveValue("reduced");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  expect(
    await page
      .locator(".world-motion:not(.motion-ripple):not(.motion-glow)")
      .evaluateAll((els) =>
        els.every((el) => getComputedStyle(el).animationName === "none"),
      ),
  ).toBe(true); // # Reduced mode stops travelling creatures while retaining restrained water motion.
  expect(
    await page
      .locator(".motion-ripple")
      .first()
      .evaluate((el) => getComputedStyle(el).animationDuration),
  ).toBe("18s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".coastal-world .world-motion")
      .evaluateAll((els) =>
        els.every((el) => getComputedStyle(el).animationName === "none"),
      ),
  ).toBe(true); // # The operating-system request also stops subdued water when the app is already set to reduced motion.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(
    await page
      .locator(".motion-ripple")
      .first()
      .evaluate((el) => getComputedStyle(el).animationDuration),
  ).toBe("18s"); // # Returning to no system preference restores the saved restrained app preference.
  await page
    .getByRole("button", { name: "Settings & data", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Environment animation", exact: true })
    .selectOption("static");
  await expect(
    page.getByRole("combobox", { name: "Environment animation", exact: true }),
  ).toHaveValue("static");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  expect(
    await page
      .locator(".world-motion")
      .evaluateAll((els) =>
        els.every((el) => getComputedStyle(el).animationName === "none"),
      ),
  ).toBe(true);
  await page.reload();
  await expect(page.locator(".coastal-world")).toHaveAttribute(
    "data-animation",
    "static",
  );
  await page
    .getByRole("button", { name: "Settings & data", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Environment animation", exact: true })
    .selectOption("full");
  await expect(
    page.getByRole("combobox", { name: "Environment animation", exact: true }),
  ).toHaveValue("full");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".world-motion")
      .evaluateAll((els) =>
        els.every((el) => getComputedStyle(el).animationName === "none"),
      ),
  ).toBe(true);
});
test("earned residents move independently while plant stages read saved learning data", async ({
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
  const backup = JSON.parse(
    await fs.readFile((await (await downloadPromise).path())!, "utf8"),
  );
  const scheduler = fsrs({
    enable_fuzz: false,
    learning_steps: [],
    relearning_steps: ["10m"],
  });
  // # Build a small test-only history using actual FSRS transitions; these numbers are not reported as user achievement.
  for (const word of backup.words.slice(0, 2)) {
    const entry = word.entries[0],
      group = entry.learningGroups[0],
      p = backup.progress.find(
        (p: { id: string }) => p.id === group.learningSenseId,
      );
    let at = new Date("2025-01-01T00:00:00Z"),
      card = createEmptyCard(at);
    const events = [];
    for (const [i, modality] of ["copy", "definition", "audio"].entries()) {
      const after = i === 2 ? scheduler.next(card, at, Rating.Good).card : null;
      events.push({
        id: `test-${word.id}-${i}`,
        wordId: word.id,
        lexicalEntryId: entry.entryId,
        learningSenseId: group.learningSenseId,
        pronunciationId:
          modality === "audio" ? group.pronunciationIds[0] : null,
        expectedAnswer: word.lemma,
        answer: word.lemma,
        at: at.getTime() - (2 - i) * 60000,
        mode: i === 0 ? "intro" : "acquisition",
        modality,
        correct: true,
        rating: i === 2 ? Rating.Good : null,
        before: null,
        after,
      });
      if (after) card = after;
    }
    for (let i = 0; i < 3; i++) {
      at = card.due;
      const before = structuredClone(card);
      card = scheduler.next(card, at, Rating.Good).card;
      events.push({
        id: `test-${word.id}-review-${i}`,
        wordId: word.id,
        lexicalEntryId: entry.entryId,
        learningSenseId: group.learningSenseId,
        pronunciationId: null,
        expectedAnswer: word.lemma,
        answer: word.lemma,
        at: at.getTime(),
        mode: "review",
        modality: "definition",
        correct: true,
        rating: Rating.Good,
        before,
        after: card,
      });
    }
    Object.assign(p, {
      introduced: true,
      stage: 3,
      streak: 3,
      attempts: 6,
      correct: 6,
      reviewSuccesses: 3,
      card,
      everAcquired: true,
      everMature: true,
      acquiredAt: Date.parse("2025-01-01T00:00:00Z"),
      lastReviewedAt: at.getTime(),
      revision: 6,
      accuracy: {
        copy: { total: 1, correct: 1 },
        definition: { total: 4, correct: 4 },
        audio: { total: 1, correct: 1 },
        cloze: { total: 0, correct: 0 },
      },
    });
    backup.attempts.push(...events);
  }
  backup.world = { id: "world", garden: 2, aquarium: 2 };
  backup.settings.season = "summer";
  backup.settings.environmentAnimation = "full";
  backup.settings.theme = "day";
  await page.locator("input[type=file]").setInputFiles({
    name: "test-world.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByRole("dialog", { name: "Restore this backup?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator(".coastal-world")).toHaveCount(1);
  await expect(page.locator(".living-aquarium .motion-fish")).toHaveCount(2);
  const fish = page.locator(".living-aquarium .motion-fish");
  const periods = await fish.evaluateAll((els) =>
    els.map((el) => getComputedStyle(el).animationDuration),
  );
  expect(new Set(periods).size).toBe(2);
  const catPeriod = await page
    .locator(".harbor-cat")
    .evaluate((el) => getComputedStyle(el).animationDuration);
  const duckPeriod = await page
    .locator(".harbor-duck")
    .evaluate((el) => getComputedStyle(el).animationDuration);
  expect(catPeriod).not.toBe(duckPeriod); // # Independently timed land and water residents avoid a synchronized scene loop.
  const before = await fish
    .first()
    .evaluate((el) => getComputedStyle(el).transform);
  await expect
    .poll(() => fish.first().evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(before);
  await expect(page.locator(".living-garden .field-marker")).toContainText(
    "2 words cultivated",
  );
  await expect(page.locator(".living-garden [data-plant-stage]")).toHaveCount(
    2,
  ); // # Two acquired words cannot claim eight planted beds.
  await expect(
    page.locator('.living-garden [data-plant-stage="mature"]'),
  ).toHaveCount(2);
  await expect(page.locator(".living-garden .field-note")).toContainText(
    "2 flowering",
  );
  await page.screenshot({ path: shot("earned-world"), fullPage: true });
});
test("390px home, learning and dictionary keep usable controls without horizontal scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Explore 60 words" }),
  ).toBeVisible();
  const fits = async () =>
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  await fits();
  await page.screenshot({ path: shot("mobile-home"), fullPage: true });
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  await expect(page.locator(".target-word")).toBeVisible();
  await fits();
  await page.getByRole("textbox", { name: "Your answer" }).fill("partial");
  await page.getByRole("button", { name: "Notes & entry" }).click();
  await expect(page.getByRole("dialog", { name: "Dictionary" })).toBeVisible();
  await fits();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.getByRole("textbox", { name: "Your answer" })).toHaveValue(
    "partial",
  );
  await page.screenshot({ path: shot("mobile-study"), fullPage: true });
});
