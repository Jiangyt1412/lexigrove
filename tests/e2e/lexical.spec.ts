import { test, expect, type Page } from "@playwright/test"; // # All lexical acceptance cases run through the UI on a fresh test origin.
import fs from "node:fs/promises";
import path from "node:path";
import { importRows } from "../fixtures/lexical";
import type { Backup } from "../../src/backup/backup";

async function importCases(page: Page) {
  await page.goto("./");
  await page.getByRole("button", { name: "Vocabulary", exact: true }).click();
  await page.getByRole("button", { name: "Import", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Import vocabulary" });
  await dialog.locator("input[type=file]").setInputFiles({
    name: "lexical-cases.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(importRows())),
  });
  await expect(
    dialog.getByText("2 entries · 4 learning meanings", { exact: true }),
  ).toBeVisible(); // # Preview reads the supplied entry graph.
  await dialog
    .getByRole("button", { name: "Import 3 rows", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
}
async function openWord(page: Page, word: string) {
  await page.getByRole("textbox", { name: "Search vocabulary" }).fill(word);
  const target = page
    .locator(".word-cell")
    .filter({ has: page.getByText(word, { exact: true }) });
  await expect(target).toHaveCount(1); // # Search also matches definitions; only the exact lemma must remain unique.
  await target.click();
  return page.getByRole("dialog", { name: "Dictionary" });
}
async function exportState(page: Page): Promise<Backup> {
  await page
    .getByRole("button", { name: "Settings & data", exact: true })
    .click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  return JSON.parse(await fs.readFile((await (await pending).path())!, "utf8"));
}
async function restoreState(page: Page, backup: Backup) {
  await page.locator("input[type=file]").setInputFiles({
    name: "test-sense-session.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByRole("dialog", { name: "Restore this backup?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume session", exact: true }),
  ).toBeVisible();
}
async function stubSpeech(page: Page) {
  await page.addInitScript(() => {
    const spoken: string[] = [];
    Object.defineProperty(window, "__testSpoken", { value: spoken });
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
      value: (utterance: SpeechSynthesisUtterance) => {
        spoken.push(utterance.text);
        setTimeout(
          () => utterance.onend?.(new Event("end") as SpeechSynthesisEvent),
          10,
        );
      },
    });
    Object.defineProperty(speechSynthesis, "cancel", { value: () => {} });
  }); // # A working synthetic voice must still be refused for an ambiguous lexical pronunciation.
}

test("dictionary selectors update POS, pronunciation, definition, example, collocations and progress together", async ({
  page,
}) => {
  await importCases(page);
  let dialog = await openWord(page, "calm");
  await expect(dialog.locator(".dictionary-entry")).toHaveCount(2);
  expect(
    await dialog
      .locator(".primary")
      .evaluate((el) => getComputedStyle(el).fontFamily),
  ).not.toContain("Pixelify"); // # Dictionary action text follows the same readable typography as definitions.
  await dialog
    .locator(".entry-tabs")
    .getByRole("button", { name: "adjective", exact: true })
    .click();
  const calmIPA = await dialog
    .getByRole("button", { name: "Play US pronunciation" })
    .innerText();
  await expect(dialog.locator(".dictionary-definition")).toContainText(
    "Free from worry",
  );
  await dialog
    .locator(".entry-tabs")
    .getByRole("button", { name: "noun", exact: true })
    .click();
  await expect(dialog.locator(".dictionary-definition")).toContainText(
    "A peaceful state",
  );
  await expect(dialog.locator("blockquote")).toHaveText(
    "She felt a sense of calm after the exam.",
  );
  expect(
    await dialog
      .getByRole("button", { name: "Play US pronunciation" })
      .innerText(),
  ).toBe(calmIPA);
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  dialog = await openWord(page, "record");
  await expect(dialog.locator(".dictionary-entry")).toHaveCount(2);
  await expect(dialog.locator(".sense-list li")).toHaveCount(5);
  await dialog
    .locator(".entry-tabs")
    .getByRole("button", { name: "noun", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Play UK pronunciation" }),
  ).toContainText("/ˈɹɛk.ɔːd/");
  await expect(dialog.locator(".dictionary-definition")).toContainText(
    "Information kept",
  );
  await expect(dialog.locator("blockquote")).toHaveText(
    "The laboratory keeps a record of each experiment.",
  );
  await dialog
    .getByRole("button", { name: "Collocations", exact: true })
    .click();
  await expect(dialog.locator(".dictionary-collocations")).toBeVisible();
  await expect(dialog.locator(".chips")).toContainText("keep a record");
  await expect(dialog.locator(".dictionary-definition")).toBeHidden();
  await dialog
    .getByRole("button", { name: "Definitions", exact: true })
    .click(); // # Bookmarks reveal the actual selected meaning's content while preserving its lexical ownership.
  await page.screenshot({
    path: path.resolve("../lexigrove-dictionary-record-noun.png"),
  });
  await dialog
    .locator(".entry-tabs")
    .getByRole("button", { name: "verb", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Play UK pronunciation" }),
  ).toContainText("/ɹɪˈkɔːd/");
  await expect(dialog.locator(".dictionary-definition")).toContainText(
    "To store measured information",
  );
  await expect(dialog.locator("blockquote")).toHaveText(
    "The measurements were recorded automatically.",
  );
  await dialog
    .getByRole("button", { name: "Collocations", exact: true })
    .click();
  await expect(dialog.locator(".chips")).toContainText("record measurements");
  await dialog
    .getByRole("button", { name: "Definitions", exact: true })
    .click();
  await expect(dialog.locator(".sense-progress")).toHaveText(
    "New · This learning meaning",
  );
  await dialog
    .getByRole("combobox", { name: "Learning meaning" })
    .selectOption({
      label:
        "To capture sound or video for later playback. · /ɹɪˈkɔːd/ / /ɹɪˈkɔɹd/",
    });
  await expect(dialog.locator(".dictionary-definition")).toContainText(
    "capture sound or video",
  );
  await expect(dialog.locator("blockquote")).toHaveText(
    "We record each lecture for students to replay.",
  );
  await dialog
    .getByRole("button", { name: "Collocations", exact: true })
    .click();
  await expect(dialog.locator(".chips")).toContainText("record a video");
  await dialog
    .getByRole("button", { name: "Definitions", exact: true })
    .click();
  await page.screenshot({
    path: path.resolve("../lexigrove-dictionary-record-verb.png"),
  });
  await dialog
    .locator(".entry-tabs")
    .getByRole("button", { name: "All entries", exact: true })
    .click();
  await expect(dialog.locator(".dictionary-entry")).toHaveCount(2);
});

test("same-POS heteronyms show explicit mappings and never silently use a generic voice", async ({
  page,
}) => {
  await stubSpeech(page);
  await importCases(page);
  const dialog = await openWord(page, "bow");
  await expect(dialog.locator(".pronunciation-meaning")).toHaveCount(2);
  const gesture = dialog
      .locator(".pronunciation-meaning")
      .filter({ hasText: "Bending the body" }),
    weapon = dialog
      .locator(".pronunciation-meaning")
      .filter({ hasText: "Shooting arrows" });
  await expect(
    gesture.getByRole("button", { name: "Play US pronunciation" }),
  ).toContainText("/baʊ/");
  await expect(gesture.locator(".sense-list")).toContainText("greeting");
  await expect(
    weapon.getByRole("button", { name: "Play US pronunciation" }),
  ).toContainText("/ˈboʊ̯/");
  await expect(weapon.locator(".sense-list")).toContainText("arrows");
  await page.screenshot({
    path: path.resolve("../lexigrove-dictionary-bow-groups.png"),
  });
  await weapon
    .getByRole("button", { name: "Explore Shooting arrows", exact: true })
    .click();
  await expect(dialog.locator(".dictionary-definition")).toContainText(
    "shooting arrows",
  );
  await expect(dialog.locator(".dictionary-definition")).not.toContainText(
    "greeting",
  );
  await expect(dialog.locator("blockquote")).toHaveText(
    "The archer raised the bow and aimed.",
  );
  await dialog.getByRole("button", { name: "Play US pronunciation" }).click();
  await expect(page.locator(".toast")).toContainText(
    "entry-specific recording",
  );
  expect(
    await page.evaluate(
      () => (window as unknown as { __testSpoken: string[] }).__testSpoken,
    ),
  ).toEqual([]);
});

test("entry editor adds a new POS and edits only its selected learning meaning", async ({
  page,
}) => {
  await importCases(page);
  const before = await exportState(page);
  await page.getByRole("button", { name: "Vocabulary", exact: true }).click();
  let dialog = await openWord(page, "calm");
  await dialog
    .getByRole("button", { name: "Edit definition & example", exact: true })
    .click();
  const editor = page.getByRole("dialog", { name: "Edit word" });
  await editor
    .getByRole("button", { name: "Add lexical entry", exact: true })
    .click();
  await editor
    .getByRole("textbox", { name: "Part of speech", exact: true })
    .fill("verb");
  await editor
    .getByLabel("English definition", { exact: true })
    .fill("To make someone less worried or excited.");
  await editor
    .getByLabel("Example sentence", { exact: true })
    .fill("Music can calm an anxious child.");
  await editor.locator("summary").click();
  await editor.getByLabel("UK IPA", { exact: true }).fill("/kɑːm/");
  await editor.getByLabel("US IPA", { exact: true }).fill("/kɑm/");
  await editor
    .getByLabel("Collocations", { exact: true })
    .fill("calm a child; calm someone down");
  await editor.getByRole("button", { name: "Save word", exact: true }).click();
  await expect(editor).not.toBeVisible();
  const after = await exportState(page),
    oldWord = before.words.find((w) => w.lemma === "calm")!,
    newWord = after.words.find((w) => w.lemma === "calm")!;
  expect(after.words.length).toBe(before.words.length);
  expect(newWord.id).toBe(oldWord.id);
  expect(newWord.entries).toHaveLength(3);
  for (const p of before.progress.filter((p) => p.wordId === oldWord.id)) {
    const saved = after.progress.find((q) => q.id === p.id)!;
    expect({ ...saved, revision: p.revision }).toEqual(p);
  }
  expect(after.progress.filter((p) => p.wordId === newWord.id)).toHaveLength(3);
  await page.getByRole("button", { name: "Vocabulary", exact: true }).click();
  dialog = await openWord(page, "calm");
  await dialog
    .locator(".entry-tabs")
    .getByRole("button", { name: "verb", exact: true })
    .click();
  await expect(dialog.locator("blockquote")).toHaveText(
    "Music can calm an anxious child.",
  );
  await expect(dialog.locator(".chips")).toContainText("calm someone down");
  await dialog
    .getByRole("button", { name: "Edit definition & example", exact: true })
    .click();
  const targetOption = await editor
    .locator('select[aria-label="Edit learning meaning"] option')
    .filter({ hasText: "verb ·" })
    .getAttribute("value");
  await editor
    .getByRole("combobox", { name: "Edit learning meaning" })
    .selectOption(targetOption!);
  await editor.getByLabel("Example sentence", { exact: true }).fill("");
  await editor.getByRole("button", { name: "Save word", exact: true }).click();
  await expect(editor).not.toBeVisible();
  const edited = await exportState(page),
    editedWord = edited.words.find((w) => w.id === newWord.id)!;
  expect(editedWord.entries[0]).toEqual(newWord.entries[0]);
  expect(editedWord.entries[1]).toEqual(newWord.entries[1]);
  expect(editedWord.entries[2].learningGroups[0].preferredExample).toBe("");
});

test("learning focuses on one group and cloze grades an inflected form with honest history", async ({
  page,
}) => {
  await importCases(page);
  const backup = await exportState(page),
    word = backup.words.find((w) => w.lemma === "record")!,
    entry = word.entries.find((e) => e.partOfSpeech === "verb")!,
    group = entry.learningGroups.find((g) => g.cloze.target === "recorded")!,
    buddy = backup.words.find((w) => w.lemma === "adapt")!;
  backup.settings.autoPronounce = false;
  backup.sessions = [
    {
      id: "active",
      token: "test-focused-session",
      mode: "acquire",
      wordIds: [
        group.learningSenseId,
        buddy.entries[0].learningGroups[0].learningSenseId,
      ],
      lastWord: null,
      completed: 0,
      startedAt: Date.now(),
    },
  ];
  await restoreState(page, backup);
  await page
    .getByRole("button", { name: "Resume session", exact: true })
    .click();
  await expect(page.locator(".target-word")).toHaveText("record");
  await expect(page.locator(".study-phonetics .word-meta")).toHaveText("verb");
  await expect(page.locator(".study-meaning")).toContainText(
    "To store measured information",
  );
  await expect(page.locator(".study-example")).toContainText(
    "The measurements were recorded automatically.",
  );
  await expect(page.locator(".study-collocations")).toContainText(
    "record measurements",
  );
  await expect(page.locator(".study-focus")).not.toContainText(
    "best performance",
  );
  const answer = page.getByRole("textbox", { name: "Your answer" }),
    started = Date.now();
  await answer.pressSequentially("record".repeat(15), { delay: 0 });
  expect(Date.now() - started).toBeLessThan(2500);
  await expect(answer).toHaveValue("record".repeat(15)); // # Measure a 90-character interaction on this test machine; this is not a universal device-performance claim.
  await answer.fill("");
  await page.screenshot({
    path: path.resolve("../lexigrove-learning-record-verb.png"),
  });
  await page.getByRole("button", { name: "Save & leave" }).click();
  const clozeBackup = await exportState(page),
    progress = clozeBackup.progress.find(
      (p) => p.id === group.learningSenseId,
    )!;
  progress.attempts = progress.correct = 2;
  progress.accuracy.definition = { correct: 1, total: 1 };
  progress.accuracy.audio = { correct: 1, total: 1 };
  clozeBackup.attempts.push({
    id: "prior-definition-fixture",
    wordId: word.id,
    lexicalEntryId: entry.entryId,
    learningSenseId: group.learningSenseId,
    pronunciationId: null,
    expectedAnswer: word.lemma,
    at: Date.now() - 60000,
    mode: "acquisition",
    modality: "definition",
    answer: word.lemma,
    correct: true,
    rating: null,
    before: null,
    after: null,
  });
  clozeBackup.attempts.push({
    ...clozeBackup.attempts.at(-1)!,
    id: "prior-audio-fixture",
    modality: "audio",
    pronunciationId: group.pronunciationIds[0],
  }); // # A coherent prior result makes contextual practice the weakest available modality.
  clozeBackup.sessions = [
    {
      ...backup.sessions[0],
      token: "test-inflected-cloze",
      mode: "practice",
      wordIds: [group.learningSenseId],
      completed: 0,
      lastWord: null,
    },
  ];
  await restoreState(page, clozeBackup);
  await page
    .getByRole("button", { name: "Resume session", exact: true })
    .click();
  await expect(page.locator(".recall-prompt")).toHaveText(
    "The measurements were ________ automatically.",
  );
  await expect(page.locator(".target-word")).toHaveCount(0);
  await answer.fill("recorded");
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator(".result-label")).toContainText("Correct");
  await expect(page.locator(".study-phonetics .word-meta")).toHaveText("verb");
  await page.getByRole("button", { name: "Save & leave" }).click();
  const result = await exportState(page),
    event = result.attempts.find(
      (a) =>
        a.learningSenseId === group.learningSenseId && a.modality === "cloze",
    )!;
  expect(event).toMatchObject({
    wordId: word.id,
    lexicalEntryId: entry.entryId,
    learningSenseId: group.learningSenseId,
    expectedAnswer: "recorded",
    answer: "recorded",
    modality: "cloze",
    correct: true,
    mode: "practice",
    rating: null,
  });
  expect(
    result.progress
      .filter((p) => p.wordId === word.id && p.id !== group.learningSenseId)
      .every((p) => p.card === null && !p.everMature),
  ).toBe(true);
});
