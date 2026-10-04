import Papa from "papaparse"; // # Handle quoted commas, BOM and multiline CSV correctly.
import { z } from "zod"; // # Bound imported data before previewing it.
import {
  manualEntry,
  normalize,
  type Lexical,
  freshProgress,
} from "../types/model"; // # One lexical object across all decks.
import { entrySchema } from "../types/lexicon"; // # JSON imports may supply explicit lexical graphs; CSV remains a simple single-group format.
import {
  hydrateWord,
  mergeLexicon,
  learningUnits,
  senseIdentity,
  lexicalIds,
} from "../vocabulary/lexicon";
import { db } from "../db/database"; // # Batch imports commit as one transaction.
const rowSchema = z.object({
  word: z.string().trim().min(1).max(120),
  definition: z.string().max(20000).optional(),
  chinese: z.string().max(20000).optional(), // # Optional bilingual column in CSV and JSON.
  example: z.string().max(20000).optional(),
  deck: z.string().max(100).optional(),
  tag: z.string().max(1000).optional(),
  entries: z.array(entrySchema).optional(),
  partofspeech: z.string().max(100).optional(),
  ipaus: z.string().max(500).optional(),
  ipauk: z.string().max(500).optional(),
  clozetarget: z.string().max(120).optional(),
  expectedanswer: z.string().max(120).optional(),
  acceptedforms: z.preprocess(
    (value) =>
      typeof value === "string"
        ? value
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean)
        : value,
    z.array(z.string().max(120)).optional(),
  ), // # CSV accepts semicolon-separated forms; JSON accepts an array.
  sourceurl: z.string().max(20000).optional(),
  sourcelicence: z.string().max(20000).optional(),
  examplesource: z.string().max(20000).optional(),
  note: z.string().max(20000).optional(),
});
export type ImportRow = z.infer<typeof rowSchema>;
export function parseImport(content: string, filename: string): ImportRow[] {
  if (content.length > 10000000)
    throw Error("Import is limited to 10 MB per file.");
  let rows: unknown;
  if (filename.toLowerCase().endsWith(".json")) rows = JSON.parse(content);
  else {
    const parsed = Papa.parse(content, {
      header: true,
      delimiter: ",",
      skipEmptyLines: true,
      transformHeader: (h) =>
        h
          .replace(/^\uFEFF/, "")
          .trim()
          .toLowerCase(),
    });
    if (parsed.errors.length) throw Error(`CSV: ${parsed.errors[0].message}`);
    rows = parsed.data;
  }
  return z.array(rowSchema).min(1).max(10000).parse(rows);
}
export function previewImport(rows: ImportRow[], words: Lexical[]) {
  const seen = new Set(words.map((w) => w.normalizedWord));
  let added = 0,
    existing = 0,
    unknown = 0,
    conflicts = 0;
  for (const row of rows) {
    const key = normalize(row.word);
    const match = words.find((w) => w.normalizedWord === key);
    if (seen.has(key)) existing++;
    else {
      added++;
      seen.add(key);
    }
    if (
      !row.definition &&
      !row.entries?.some((e) =>
        e.learningGroups.some((g) => g.preferredLearningDefinition),
      ) &&
      !match?.easyDefinition
    )
      unknown++;
    if (match && row.definition && row.definition !== match.easyDefinition)
      conflicts++;
  }
  return { added, existing, unknown, conflicts };
}
export async function commitImport(rows: ImportRow[]) {
  const validated = z.array(rowSchema).max(10000).parse(rows);
  await db.transaction("rw", db.words, db.progress, async () => {
    const savedWords = await db.words.toArray();
    const byLemma = new Map(savedWords.map((w) => [w.normalizedWord, w]));
    const byId = new Map(savedWords.map((w) => [w.id, w.normalizedWord]));
    const owners = new Map(
      savedWords.flatMap((w) =>
        lexicalIds(hydrateWord(w)).map((id) => [id, w.id] as const),
      ),
    ); // # Index once per batch; large imports do not repeatedly parse the entire library.
    for (const row of validated) {
      const existing = byLemma.get(normalize(row.word));
      const decks = [row.deck || "Personal vocabulary"];
      const tags = (row.tag || "")
        .split(/[;|]/)
        .map((t) => t.trim())
        .filter(Boolean);
      let entry = manualEntry(
        row.word,
        row.definition,
        row.example,
        row.note,
        decks,
        tags,
      );
      entry.chineseDefinition = row.chinese || "";
      entry.chineseSource = row.chinese ? "User supplied Chinese hint" : "";
      entry.sourceUrl = row.sourceurl || "";
      entry.sourceLicence = row.sourcelicence || entry.sourceLicence;
      entry.exampleSource = row.examplesource || entry.exampleSource;
      if (entry.sourceUrl && !/^https:\/\//.test(entry.sourceUrl))
        throw Error("Dictionary source URLs must use HTTPS.");
      const candidates = existing
        ? learningUnits([existing]).filter(
            (u) =>
              (!row.partofspeech || u.partOfSpeech === row.partofspeech) &&
              (!row.ipaus || u.ipaUS === row.ipaus) &&
              (!row.ipauk || u.ipaUK === row.ipauk),
          )
        : [];
      const exact = candidates.filter(
        (u) => u.easyDefinition === row.definition,
      );
      const signatures = new Set(
        candidates.map((u) =>
          JSON.stringify([u.partOfSpeech, u.ipa, u.ipaUS, u.ipaUK]),
        ),
      );
      const resolved =
        exact.length === 1
          ? exact[0]
          : signatures.size === 1
            ? candidates[0]
            : null; // # Never infer a heteronym's pronunciation merely from its part of speech.
      entry.partOfSpeech = row.partofspeech || resolved?.partOfSpeech || "";
      entry.ipaUS = row.ipaus || resolved?.ipaUS || "";
      entry.ipaUK = row.ipauk || resolved?.ipaUK || "";
      entry.ipa = resolved?.ipa || "";
      if (
        !row.entries &&
        existing &&
        !resolved &&
        row.definition &&
        (!row.partofspeech ||
          (candidates.length > 1 && !row.ipaus && !row.ipauk))
      )
        throw Error(
          `Specify partofspeech and pronunciation, or explicit entries, for ambiguous word: ${row.word}.`,
        );
      if (row.entries)
        entry.entries = row.entries.map((e) => ({ ...e, wordId: entry.id }));
      entry = hydrateWord(entry);
      if (!row.entries && row.clozetarget) {
        const group = entry.entries[0].learningGroups[0];
        group.cloze = {
          sentence: row.example || "",
          target: row.clozetarget,
          expectedAnswer: row.expectedanswer || row.clozetarget,
          acceptedForms: row.acceptedforms || [],
        };
        entry = hydrateWord(entry);
      }
      const word = existing
        ? !row.definition && !row.entries
          ? {
              ...hydrateWord(existing),
              decks: [...new Set([...existing.decks, ...decks])],
              tags: [...new Set([...existing.tags, ...tags])],
            }
          : mergeLexicon(existing, entry)
        : entry;
      if (
        lexicalIds(word).some(
          (id) => owners.has(id) && owners.get(id) !== word.id,
        )
      )
        throw Error("A lexical identifier already belongs to another word.");
      if (byId.has(word.id) && byId.get(word.id) !== word.normalizedWord)
        throw Error(
          "This word identifier already belongs to another spelling.",
        );
      await db.words.put(word);
      byLemma.set(word.normalizedWord, word);
      byId.set(word.id, word.normalizedWord);
      for (const id of lexicalIds(word)) owners.set(id, word.id);
      for (const unit of learningUnits([word]))
        if (!(await db.progress.get(unit.id)))
          await db.progress.add({
            ...freshProgress(unit.id),
            ...senseIdentity(unit),
          });
    }
  });
}
