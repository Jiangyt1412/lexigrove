import "fake-indexeddb/auto"; // # Isolated persistence tests exercise real Dexie migrations.
import Dexie from "dexie";
import { beforeEach, afterAll, describe, it, expect } from "vitest";
import { db, GroveDB, initialize } from "../src/db/database";
import { starterWords } from "../src/vocabulary/seed";
import { defaultSettings, freshProgress } from "../src/types/model";
import { createBackup, parseBackup } from "../src/backup/backup";
import { commitImport, parseImport } from "../src/import/import";
import chinese from "../data/chinese-glosses.json";

beforeEach(async () => {
  await db.delete();
  await db.open();
  await initialize(starterWords);
});
afterAll(async () => {
  await db.delete();
});

describe("Chinese meaning integrity", () => {
  it("covers exactly the starter senses with explicit adaptation attribution", () => {
    expect(Object.keys(chinese.glosses).sort()).toEqual(
      starterWords.map((w) => w.lemma).sort(),
    );
    expect(
      starterWords.every(
        (w) =>
          w.chineseDefinition &&
          w.chineseSource.includes("项目编写") &&
          w.sourceUrl.startsWith("https://en.wiktionary.org/"),
      ),
    ).toBe(true);
  });
  it("enriches original senses without overwriting custom meanings or progress", async () => {
    const w = starterWords[0],
      edited = starterWords[1],
      translated = starterWords[2];
    await db.words.update(w.id, {
      chineseDefinition: "",
      chineseSource: "",
      note: "Keep my note",
    });
    await db.progress.update(w.id, { favorite: true, revision: 9 });
    await db.words.update(edited.id, {
      easyDefinition: "My different sense",
      chineseDefinition: "",
      chineseSource: "",
    });
    await db.words.update(translated.id, {
      chineseDefinition: "我的解释",
      chineseSource: "User supplied",
    });
    const prior = await db.progress.toArray();
    await initialize(starterWords);
    expect((await db.words.get(w.id))!.chineseDefinition).toBe(
      w.chineseDefinition,
    );
    expect((await db.words.get(w.id))!.note).toBe("Keep my note");
    expect((await db.words.get(edited.id))!.chineseDefinition).toBe("");
    expect((await db.words.get(translated.id))!.chineseDefinition).toBe(
      "我的解释",
    );
    expect(await db.progress.toArray()).toEqual(prior);
  });
  it("reads existing version-2 backups lacking the new optional fields", async () => {
    const old = JSON.parse(JSON.stringify(await createBackup()));
    for (const w of old.words) {
      delete w.chineseDefinition;
      delete w.chineseSource;
      delete w.ipa;
      delete w.wordFamilySource;
    }
    delete old.settings.showChinese;
    const parsed = parseBackup(JSON.stringify(old));
    expect(parsed.words.every((w) => w.chineseDefinition === "")).toBe(true);
    expect(parsed.settings.showChinese).toBe(true);
    expect(parsed.progress).toHaveLength(60);
    expect(
      parsed.words.every((w) => w.ipa === "" && w.wordFamilySource === ""),
    ).toBe(true); // # Old backups acquire metadata defaults without changing learning data.
  });
  it("imports Chinese hints but rejects pairing them with a conflicting English sense", async () => {
    await commitImport(
      parseImport(
        "word,definition,chinese\nwatershed,A drainage area.,流域\nmitigate,A different sense.,错误义项",
        "bilingual.csv",
      ),
    );
    const added = await db.words
      .where("normalizedWord")
      .equals("watershed")
      .first();
    expect(added!.chineseDefinition).toBe("流域");
    expect(added!.chineseSource).toBe("User supplied Chinese hint");
    expect((await db.words.get("starter-mitigate"))!.chineseDefinition).toBe(
      starterWords[0].chineseDefinition,
    );
  });
  it("upgrades existing IndexedDB without changing saved progress or notes", async () => {
    const name = `old-db-${crypto.randomUUID()}`;
    const old = new Dexie(name);
    old.version(2).stores({
      words: "id,&normalizedWord,*decks,*tags",
      progress: "id",
      attempts: "id",
      settings: "id",
      sessions: "id",
      world: "id",
    });
    const record = JSON.parse(JSON.stringify(starterWords[0]));
    delete record.chineseDefinition;
    delete record.chineseSource;
    delete record.ipa;
    delete record.wordFamilySource;
    const settings = JSON.parse(JSON.stringify(defaultSettings));
    delete settings.showChinese;
    record.note = "Preserved";
    const progress = {
      ...freshProgress(record.id),
      favorite: true,
      revision: 7,
    };
    await old.table("words").put(record);
    await old.table("settings").put(settings);
    await old.table("progress").put(progress);
    old.close();
    const upgraded = new GroveDB(name);
    try {
      await upgraded.open();
      expect((await upgraded.words.get(record.id))!.chineseDefinition).toBe("");
      expect((await upgraded.words.get(record.id))!.note).toBe("Preserved");
      expect((await upgraded.words.get(record.id))!.ipa).toBe("");
      expect((await upgraded.words.get(record.id))!.wordFamilySource).toBe("");
      expect(await upgraded.progress.get(record.id)).toEqual(progress);
      expect((await upgraded.settings.get("settings"))!.showChinese).toBe(true);
    } finally {
      await upgraded.delete();
    }
  });
});
