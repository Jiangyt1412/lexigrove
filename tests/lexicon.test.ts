import "fake-indexeddb/auto"; // # Every test uses isolated browser-storage fixtures, never a user's IndexedDB.
import Dexie from "dexie";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createEmptyCard, Rating } from "ts-fsrs";
import {
  db,
  GroveDB,
  initialize,
  addWord,
  saveSettings,
} from "../src/db/database";
import {
  lexicalSchema,
  manualEntry,
  freshProgress,
  defaultSettings,
  type Attempt,
  type Session,
} from "../src/types/model";
import {
  hydrateWord,
  learningUnits,
  projectSense,
  mergeLexicon,
  senseIdentity,
  wordProgress,
} from "../src/vocabulary/lexicon";
import {
  nextTask,
  startSession,
  submitTask,
  schedule,
  cloze,
} from "../src/learning/engine";
import { createBackup, parseBackup, restoreBackup } from "../src/backup/backup";
import { commitImport, parseImport, previewImport } from "../src/import/import";
import { statistics } from "../src/statistics/statistics";
import { projectWorld, WORLD_CONFIG } from "../src/world/progression";
import { resolveSeason } from "../src/world/environment";
import {
  bowWord,
  calmWord,
  recordWord,
  simpleWord,
  lexicalWords,
  importRows,
} from "./fixtures/lexical";

beforeEach(async () => {
  await db.delete();
  await db.open();
  await initialize(lexicalWords);
});
afterAll(async () => {
  await db.delete();
});
const groups = (word = recordWord) => learningUnits([word]);
const verb = () =>
  groups().find(
    (u) => u.partOfSpeech === "verb" && u.clozeSpec?.target === "recorded",
  )!;
async function activate(
  unitId: string,
  stage = 1,
  mode: Session["mode"] = "acquire",
) {
  const progress = (await db.progress.get(unitId))!;
  await db.progress.put({
    ...progress,
    introduced: mode !== "practice",
    stage,
    streak: stage,
  });
  await db.sessions.put({
    id: "active",
    token: crypto.randomUUID(),
    mode,
    wordIds: [unitId, simpleWord.id],
    lastWord: null,
    completed: 0,
    startedAt: Date.now(),
  });
  return nextTask(
    (await db.sessions.get("active"))!,
    await db.words.toArray(),
    await db.progress.toArray(),
    true,
  )!;
} // # A fixture isolates a particular stage; the original engine suite separately verifies the complete interleaved sequence.
async function activateCloze(id: string) {
  await activate(id, 0, "practice");
  const progress = (await db.progress.get(id))!;
  progress.accuracy.definition = { correct: 1, total: 1 };
  await db.progress.put(progress);
  return nextTask(
    (await db.sessions.get("active"))!,
    await db.words.toArray(),
    await db.progress.toArray(),
    false,
  )!;
} // # Isolate context practice without scheduling or manufacturing a graduation event.
function without<T extends object, K extends keyof T>(
  input: T,
  ...keys: K[]
): Omit<T, K> {
  const copy = { ...input };
  for (const key of keys) delete copy[key];
  return copy;
} // # Old fixtures genuinely omit fields introduced by the new schema.
function legacySnapshot() {
  const w = structuredClone(simpleWord),
    flatWord = without(w, "entries", "familyLinks");
  const p = {
    ...freshProgress(w.id),
    introduced: true,
    stage: 3,
    streak: 3,
    everAcquired: true,
    everMature: true,
    revision: 9,
  };
  const unit = learningUnits([w])[0],
    events: Attempt[] = [];
  let at = new Date("2025-01-01T00:00:00Z"),
    card = createEmptyCard(at);
  for (const [i, modality] of (
    ["copy", "definition", "audio", "cloze"] as const
  ).entries()) {
    const after =
      i === 3 ? schedule(0.9).next(card, at, Rating.Good).card : null;
    events.push({
      id: `legacy-intro-${i}`,
      wordId: w.id,
      lexicalEntryId: unit.lexicalEntryId,
      learningSenseId: unit.id,
      pronunciationId: modality === "audio" ? unit.pronunciationIds[0] : null,
      expectedAnswer: w.lemma,
      answer: w.lemma,
      at: at.getTime() - (3 - i) * 60000,
      mode: i === 0 ? "intro" : "acquisition",
      modality,
      correct: true,
      rating: i === 3 ? Rating.Good : null,
      before: null,
      after,
    });
    if (after) card = after;
    p.accuracy[modality] = { correct: 1, total: 1 };
  }
  for (let i = 0; i < 3; i++) {
    at = card.due;
    const before = structuredClone(card);
    card = schedule(0.9).next(card, at, Rating.Good).card;
    events.push({
      id: `legacy-review-${i}`,
      wordId: w.id,
      lexicalEntryId: unit.lexicalEntryId,
      learningSenseId: unit.id,
      pronunciationId: null,
      expectedAnswer: w.lemma,
      answer: w.lemma,
      at: at.getTime(),
      mode: "review",
      modality: "definition",
      correct: true,
      rating: Rating.Good,
      before,
      after: card,
    });
    p.accuracy.definition.correct++;
    p.accuracy.definition.total++;
  }
  Object.assign(p, {
    attempts: events.length,
    correct: events.length,
    reviewSuccesses: 3,
    card,
    acquiredAt: Date.parse("2025-01-01T00:00:00Z"),
    lastReviewedAt: at.getTime(),
  });
  const flatProgress = without(
    p,
    "wordId",
    "lexicalEntryId",
    "learningSenseId",
  );
  const attempts = events.map(
    ({
      lexicalEntryId: _entry,
      learningSenseId: _group,
      pronunciationId: _pron,
      expectedAnswer: _expected,
      ...event
    }) => event,
  );
  const settings = without(defaultSettings, "season", "environmentAnimation");
  const session: Session = {
    id: "active",
    token: "legacy-session-token",
    mode: "review",
    wordIds: [w.id],
    lastWord: w.id,
    completed: 4,
    startedAt: Date.parse("2025-02-01T00:00:00Z"),
  };
  return {
    word: {
      ...flatWord,
      note: "Keep this personal note.",
      decks: ["My archive"],
    },
    progress: flatProgress,
    attempts,
    settings,
    session,
    world: { id: "world", garden: 17, aquarium: 4 },
  };
} // # Historical cards are generated with real FSRS transitions rather than invented intervals.

describe("generic lexical graph", () => {
  it("keeps a simple entry as one learning unit", () => {
    expect(simpleWord.entries).toHaveLength(1);
    expect(groups(simpleWord)).toHaveLength(1);
    expect(simpleWord.entries[0].pronunciations).toHaveLength(1);
  });
  it("supports multiple parts of speech with the same accent-specific pronunciation", () => {
    const units = groups(calmWord);
    expect(units.map((u) => u.partOfSpeech)).toEqual(["adjective", "noun"]);
    expect(units[0].ipaUS).toBe(units[1].ipaUS);
    expect(units.every((u) => !u.lexicalAudioRequired)).toBe(true);
  });
  it("maps noun and verb pronunciations to their own content", () => {
    const noun = groups()[0],
      v = verb();
    expect(noun.ipaUK).toBe("/ˈɹɛk.ɔːd/");
    expect(v.ipaUK).toBe("/ɹɪˈkɔːd/");
    expect(v.easyDefinition).toContain("measured information");
    expect(v.examples).toEqual([
      "The measurements were recorded automatically.",
    ]);
    expect(v.collocations).toEqual(["record measurements", "record data"]);
    expect(v.fullDefinitions).not.toContain(noun.easyDefinition);
  });
  it("maps different pronunciations inside one noun entry without relying on POS", () => {
    const units = groups(bowWord);
    expect(bowWord.entries).toHaveLength(1);
    expect(units.map((u) => u.partOfSpeech)).toEqual(["noun", "noun"]);
    expect(units[0].ipaUS).toBe("/baʊ/");
    expect(units[1].ipaUS).toBe("/ˈboʊ̯/");
    expect(units[0].easyDefinition).toContain("greeting");
    expect(units[1].easyDefinition).toContain("arrows");
  });
  it("does not turn every dictionary sense or accent into a learning card", () => {
    expect(recordWord.entries.flatMap((e) => e.senses)).toHaveLength(5);
    expect(groups()).toHaveLength(4);
    expect(
      recordWord.entries[0].learningGroups[0].pronunciationIds,
    ).toHaveLength(2);
    expect(groups(calmWord)).toHaveLength(2); // # Two semantic entries, not four cards for US and UK.
  });
  it("supports multiple meanings sharing the same spelling and pronunciation", () => {
    const [stored, achievement] = groups();
    expect(stored.pronunciationIds).toEqual(achievement.pronunciationIds);
    expect(stored.learningSenseId).not.toBe(achievement.learningSenseId);
    expect(stored.easyDefinition).not.toBe(achievement.easyDefinition);
  });
  it("rejects foreign-entry pronunciations and broken dictionary relationships", () => {
    const foreign = structuredClone(recordWord);
    foreign.entries[1].learningGroups[0].pronunciationIds = [
      foreign.entries[0].pronunciations[0].pronunciationId,
    ];
    expect(() => lexicalSchema.parse(foreign)).toThrow(/relationship/);
    const broken = structuredClone(recordWord);
    broken.entries[0].learningGroups[0].dictionarySenseIds = ["not-a-sense"];
    expect(() => lexicalSchema.parse(broken)).toThrow(/relationship/);
  });
  it("rejects duplicate relationship IDs and substring cloze targets", () => {
    const duplicate = structuredClone(simpleWord),
      g = duplicate.entries[0].learningGroups[0];
    g.pronunciationIds.push(g.pronunciationIds[0]);
    expect(() => lexicalSchema.parse(duplicate)).toThrow(/Duplicate/);
    const substring = structuredClone(simpleWord);
    substring.entries[0].learningGroups[0].cloze = {
      sentence: "The team reacted quickly.",
      target: "act",
      expectedAnswer: "act",
      acceptedForms: [],
    };
    expect(() => lexicalSchema.parse(substring)).toThrow(/absent/);
  });
  it("allows an incomplete personal entry to wait safely outside acquisition", () => {
    const word = hydrateWord(manualEntry("watershed"));
    expect(groups(word)[0].clozeSpec?.sentence).toBe("");
    expect(() => lexicalSchema.parse(word)).not.toThrow();
  });
  it("ignores unused historical pronunciations when deciding whether TTS is ambiguous", () => {
    const word = structuredClone(simpleWord),
      entry = word.entries[0];
    entry.pronunciations.push({
      ...entry.pronunciations[0],
      pronunciationId: "archived-pronunciation",
      ipa: "/old/",
    });
    expect(
      projectSense(word, entry, entry.learningGroups[0]).lexicalAudioRequired,
    ).toBe(false);
  });
});

describe("sense-consistent learning and progress", () => {
  it("definition acquisition uses the selected learning group", async () => {
    const v = verb(),
      task = await activate(v.id);
    expect(task.modality).toBe("definition");
    expect(task.word.easyDefinition).toBe(v.easyDefinition);
    const event = await submitTask(task, "record", crypto.randomUUID());
    expect(event).toMatchObject({
      ...senseIdentity(v),
      expectedAnswer: "record",
      correct: true,
    });
  });
  it("audio acquisition rejects a different entry variant and an unidentified playback", async () => {
    const v = verb(),
      task = await activate(v.id, 2),
      before = await db.progress.get(v.id);
    await expect(
      submitTask(
        task,
        "record",
        crypto.randomUUID(),
        true,
        Date.now(),
        groups()[0].pronunciationIds[0],
      ),
    ).rejects.toThrow(/does not belong/);
    await expect(
      submitTask(task, "record", crypto.randomUUID(), true),
    ).rejects.toThrow(/variant/);
    expect(await db.progress.get(v.id)).toEqual(before);
    expect(await db.attempts.count()).toBe(0);
    const event = await submitTask(
      task,
      "record",
      crypto.randomUUID(),
      true,
      Date.now(),
      v.pronunciationIds[0],
    );
    expect(event.pronunciationId).toBe(v.pronunciationIds[0]);
    expect(event.lexicalEntryId).toBe(v.lexicalEntryId);
    expect(event.modality).toBe("audio");
  });
  it("cloze practice expects the grammatical surface form instead of the lemma", async () => {
    const v = verb(),
      task = await activateCloze(v.id);
    expect(task.expectedAnswer).toBe("recorded");
    expect(
      cloze(task.word.clozeSpec!.sentence, task.word.clozeSpec!.target),
    ).toBe("The measurements were ________ automatically.");
    const event = await submitTask(task, "recorded", crypto.randomUUID());
    expect(event.correct).toBe(true);
    expect(event.expectedAnswer).toBe("recorded");
    expect(event.after).toBeNull();
    expect((await db.progress.get(groups()[0].id))?.card).toBeNull();
    expect((await db.progress.get(groups()[0].id))?.everMature).toBe(false);
  });
  it("does not accept the lemma when the sentence requires an inflected form", async () => {
    const task = await activateCloze(verb().id),
      event = await submitTask(task, "record", crypto.randomUUID());
    expect(event.correct).toBe(false);
    expect((await db.progress.get(task.word.id))?.stage).toBe(0);
  });
  it("accepts only explicitly configured alternate cloze forms", async () => {
    const word = structuredClone(recordWord),
      group = word.entries[1].learningGroups[0];
    group.cloze.acceptedForms = ["RECORDED"];
    await db.words.put(word);
    const task = await activateCloze(group.learningSenseId);
    expect(
      (await submitTask(task, "  RECORDED ", crypto.randomUUID())).correct,
    ).toBe(true);
  });
  it("a practiced lemma expands to all learning groups and never changes FSRS", async () => {
    const before = await db.progress.toArray(),
      session = await startSession("practice", [recordWord.id]);
    expect(session.wordIds).toEqual(groups().map((u) => u.id));
    const task = nextTask(session, await db.words.toArray(), before, true)!;
    await submitTask(task, task.expectedAnswer, crypto.randomUUID());
    expect(await db.progress.toArray()).toEqual(before);
  });
  it("interleaves different spellings rather than adjacent senses of the same word", async () => {
    const session: Session = {
      id: "active",
      token: "fixture",
      mode: "acquire",
      wordIds: [groups()[0].id, verb().id, simpleWord.id],
      lastWord: groups()[0].id,
      completed: 1,
      startedAt: Date.now(),
    };
    expect(
      nextTask(session, lexicalWords, await db.progress.toArray(), true)?.word
        .wordId,
    ).toBe(simpleWord.id);
  });
  it("summarizes acquired senses and keeps headline word counts lemma-based", async () => {
    for (const unit of groups().slice(0, 2))
      await db.progress.update(unit.id, {
        everAcquired: true,
        everMature: unit === groups()[0],
      });
    const progress = await db.progress.toArray();
    expect(wordProgress(recordWord, progress)).toMatchObject({
      total: 4,
      acquired: 2,
    });
    const stats = statistics(lexicalWords, progress, []);
    expect(stats.learned).toBe(1);
    expect(stats.learnedSenses).toBe(2);
    expect(projectWorld(progress).garden).toBe(1);
  });
  it("season and animation preferences never change progress or FSRS configuration", async () => {
    const progress = await db.progress.toArray(),
      world = await db.world.get("world"),
      config = structuredClone(WORLD_CONFIG);
    for (const season of ["spring", "summer", "autumn", "winter"] as const)
      await saveSettings({ season, environmentAnimation: "static" });
    expect(await db.progress.toArray()).toEqual(progress);
    expect(await db.world.get("world")).toEqual(world);
    expect(WORLD_CONFIG).toEqual(config);
    expect(resolveSeason("auto", new Date(2026, 2, 1))).toBe("spring");
    expect(resolveSeason("winter", new Date(2026, 6, 1))).toBe("winter");
  });
});

describe("imports, migrations and historical ownership", () => {
  it("adds a genuine new entry without duplicating the lemma or replacing old progress", async () => {
    const nounOnly = {
      ...structuredClone(recordWord),
      entries: [structuredClone(recordWord.entries[0])],
    };
    await db.delete();
    await db.open();
    await initialize([nounOnly, simpleWord]);
    const before = await db.progress.get(recordWord.id);
    await commitImport(importRows([recordWord]));
    expect(await db.words.count()).toBe(2);
    expect((await db.words.get(recordWord.id))?.entries).toHaveLength(2);
    expect(await db.progress.count()).toBe(5);
    expect(await db.progress.get(recordWord.id)).toEqual(before);
    await commitImport(importRows([recordWord]));
    expect(await db.progress.count()).toBe(5);
  });
  it("importing a same-POS heteronym preserves each group's pronunciation mapping", async () => {
    await commitImport(importRows([bowWord]));
    const word = (await db.words.get(bowWord.id))!,
      units = groups(word);
    expect(units).toHaveLength(2);
    expect(units[0].ipaUS).toBe("/baʊ/");
    expect(units[1].ipaUS).toBe("/ˈboʊ̯/");
    expect(new Set(units.flatMap((u) => u.pronunciationIds)).size).toBe(4);
  });
  it("rejects ambiguous flat imports but resolves an explicitly matching meaning", async () => {
    const before = await createBackup();
    await expect(
      commitImport([
        { word: "bow", definition: "An unspecified new noun meaning." },
      ]),
    ).rejects.toThrow(/ambiguous/);
    expect((await createBackup()).words).toEqual(before.words);
    const weapon = groups(bowWord)[1];
    await commitImport([
      {
        word: "bow",
        definition: weapon.easyDefinition,
        example: weapon.examples[0],
        deck: "Archer",
      },
    ]);
    expect(groups((await db.words.get(bowWord.id))!)).toHaveLength(2);
    expect((await db.words.get(bowWord.id))?.decks).toContain("Archer");
  });
  it("fills an empty personal entry while preserving its primary progress identifier", async () => {
    const blank = manualEntry("retain");
    await addWord(blank);
    const before = await db.progress.get(blank.id);
    await addWord({
      ...manualEntry("retain", "To keep something.", "We retain the notes."),
      partOfSpeech: "verb",
    });
    const saved = (await db.words.get(blank.id))!;
    expect(groups(saved)).toHaveLength(1);
    expect(groups(saved)[0].easyDefinition).toBe("To keep something.");
    expect(await db.progress.get(blank.id)).toEqual(before);
  });
  it("validates imported graph IDs before they can share unrelated progress", async () => {
    const collision = structuredClone(calmWord);
    collision.lemma = "calming";
    collision.normalizedWord = "calming";
    collision.id = "other-word";
    collision.entries.forEach((e) => (e.wordId = collision.id));
    await expect(addWord(collision)).rejects.toThrow(/another word/);
    expect(await db.words.count()).toBe(4);
    expect(previewImport(importRows(), []).unknown).toBe(0);
    expect(
      parseImport(
        "word,acceptedforms\nrecord,recorded; recorded\n",
        "forms.csv",
      )[0].acceptedforms,
    ).toEqual(["recorded", "recorded"]);
  });
  it("a v4 database migration preserves card fields, all history, notes, the active queue and world milestones", async () => {
    const name = `migration-${crypto.randomUUID()}`,
      old = new Dexie(name),
      snapshot = legacySnapshot();
    old.version(4).stores({
      words: "id,&normalizedWord,*decks,*tags",
      progress: "id,acquiredAt,lastReviewedAt",
      attempts: "id,wordId,at,mode",
      settings: "id",
      sessions: "id",
      world: "id",
    });
    await old.open();
    await old.table("words").put(snapshot.word);
    await old.table("progress").put(snapshot.progress);
    await old.table("attempts").bulkPut(snapshot.attempts);
    await old.table("settings").put({
      ...snapshot.settings,
      accent: "US",
      audioPreference: "local",
      autoPronounce: false,
      voiceURI: "Saved US voice",
    }); // # Upgrade from the previously shipped voice defaults.
    await old.table("sessions").put(snapshot.session);
    await old.table("world").put(snapshot.world);
    old.close();
    const upgraded = new GroveDB(name);
    try {
      await upgraded.open();
      const p = (await upgraded.progress.get(simpleWord.id))!;
      expect(p).toEqual({
        ...snapshot.progress,
        ...senseIdentity(groups(simpleWord)[0]),
      });
      const backup = await createBackup(upgraded);
      expect(backup.settings.accent).toBe("UK");
      expect(backup.settings.audioPreference).toBe("human");
      expect(backup.settings.autoPronounce).toBe(true);
      expect(backup.settings.voiceURI).toBe("");
      expect(backup.settings.dailyTarget).toBe(snapshot.settings.dailyTarget);
      expect(backup.words[0].note).toBe(snapshot.word.note);
      expect(backup.words[0].decks).toEqual(snapshot.word.decks);
      expect(
        backup.attempts.map((a) => ({
          id: a.id,
          at: a.at,
          before: a.before,
          after: a.after,
        })),
      ).toEqual(
        snapshot.attempts.map((a) => ({
          id: a.id,
          at: a.at,
          before: a.before,
          after: a.after,
        })),
      );
      expect(backup.sessions[0]).toMatchObject({
        ...snapshot.session,
        token: expect.any(String),
        recall: { groups: {} },
      });
      expect(backup.sessions[0].token).not.toBe(snapshot.session.token);
      expect(backup.world).toEqual(snapshot.world);
      expect(backup.attempts.every((a) => a.pronunciationId === null)).toBe(
        true,
      );
    } finally {
      await upgraded.delete();
    }
  });
  it("old v2 backups migrate without resetting the scheduler or falsely identifying historical audio", () => {
    const old = legacySnapshot(),
      backup = parseBackup(
        JSON.stringify({
          format: "lexigrove-backup",
          version: 2,
          exportedAt: new Date().toISOString(),
          words: [old.word],
          progress: [old.progress],
          attempts: old.attempts,
          settings: old.settings,
          sessions: [old.session],
          world: old.world,
        }),
      );
    expect(backup.version).toBe(5);
    expect(backup.progress[0].card).toEqual(old.progress.card);
    expect(backup.sessions[0]).toMatchObject({
      ...old.session,
      token: expect.any(String),
      recall: { groups: {} },
    });
    expect(backup.sessions[0].token).not.toBe(old.session.token);
    expect(
      backup.attempts.find((a) => a.modality === "audio")?.pronunciationId,
    ).toBeNull();
    expect(backup.attempts[0].learningSenseId).toBe(simpleWord.id);
  });
  it("allows an earlier played variant to remain in history after the group is edited", async () => {
    const unit = verb(),
      task = await activate(unit.id, 2);
    await submitTask(
      task,
      "record",
      crypto.randomUUID(),
      true,
      Date.now(),
      unit.pronunciationIds[0],
    );
    const word = (await db.words.get(recordWord.id))!,
      entry = word.entries[1],
      group = entry.learningGroups[0],
      variant = {
        ...entry.pronunciations[0],
        pronunciationId: "edited-variant",
        ipa: "/updated/",
      };
    entry.pronunciations.push(variant);
    group.pronunciationIds = [variant.pronunciationId];
    await db.words.put(word);
    const backup = await createBackup();
    expect(backup.attempts[0].pronunciationId).toBe(unit.pronunciationIds[0]);
    const invalid = structuredClone(backup);
    invalid.attempts[0].pronunciationId = groups()[0].pronunciationIds[0];
    await expect(restoreBackup(invalid)).rejects.toThrow(/another entry/);
  });
  it("merging a new meaning preserves existing preferred examples and notes", () => {
    const old = { ...structuredClone(recordWord), note: "My original note." },
      incoming = {
        ...structuredClone(recordWord),
        note: "Replace this?",
        decks: ["Field work"],
      };
    const merged = mergeLexicon(old, incoming);
    expect(merged.note).toBe("My original note.");
    expect(groups(merged)).toHaveLength(4);
    expect(merged.decks).toContain("Field work");
    expect(groups(merged)[0].examples).toEqual(groups(old)[0].examples);
  });
});
