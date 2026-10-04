import { manualEntry, type Lexical } from "../../src/types/model"; // # Small acceptance fixtures use generic graph construction, never word-specific application logic.
import { entrySchema, type LexicalEntry } from "../../src/types/lexicon";
import { hydrateWord, syncPrimary } from "../../src/vocabulary/lexicon";
import type { ImportRow } from "../../src/import/import";

type Meaning = {
  key: string;
  definition: string;
  dictionaries?: string[];
  example: string;
  collocations: string[];
  pronunciation?: string;
  target?: string;
  label?: string;
}; // # Definitions are project paraphrases; examples and collocations are authored fixtures.
function buildEntry(
  wordId: string,
  key: string,
  pos: string,
  pronunciations: Record<string, { UK: string; US: string }>,
  meanings: Meaning[],
  primary = false,
): LexicalEntry {
  const entryId = `${wordId}:entry:${key}`;
  const variants = Object.entries(pronunciations).flatMap(
    ([variant, accents]) =>
      (["UK", "US"] as const).map((locale) => ({
        pronunciationId: `${entryId}:pron:${variant}:${locale}`,
        lexicalEntryId: entryId,
        locale,
        ipa: accents[locale],
      })),
  );
  const senses = meanings.flatMap((meaning) =>
    (meaning.dictionaries || [meaning.definition]).map((definition, i) => ({
      senseId: `${entryId}:sense:${meaning.key}:${i}`,
      lexicalEntryId: entryId,
      easyDefinition: definition,
      fullDefinition: definition,
      examples: i === 0 ? [meaning.example] : [],
      collocations: meaning.collocations,
    })),
  );
  return entrySchema.parse({
    entryId,
    wordId,
    partOfSpeech: pos,
    pronunciations: variants,
    senses,
    learningGroups: meanings.map((meaning, i) => ({
      learningSenseId:
        primary && i === 0 ? wordId : `${entryId}:learn:${meaning.key}`,
      lexicalEntryId: entryId,
      pronunciationIds: variants
        .filter((p) =>
          p.pronunciationId.includes(
            `:pron:${meaning.pronunciation || "main"}:`,
          ),
        )
        .map((p) => p.pronunciationId),
      dictionarySenseIds: senses
        .filter((s) => s.senseId.includes(`:sense:${meaning.key}:`))
        .map((s) => s.senseId),
      label: meaning.label || "",
      preferredLearningDefinition: meaning.definition,
      preferredExample: meaning.example,
      preferredCollocations: meaning.collocations,
      cloze: {
        sentence: meaning.example,
        target: meaning.target || wordId.replace("fixture-", ""),
        expectedAnswer: meaning.target || wordId.replace("fixture-", ""),
        acceptedForms: [],
      },
    })),
  });
}
function word(lemma: string, entries: LexicalEntry[]): Lexical {
  return syncPrimary({
    ...manualEntry(lemma),
    id: `fixture-${lemma}`,
    entries,
    sourceUrl: `https://en.wiktionary.org/wiki/${lemma}`,
    sourceLicence:
      "CC BY-SA 4.0; project-adapted definitions and pronunciation selection",
    sourceTags: ["Wiktionary contributors; direct acceptance fixture"],
    exampleSource:
      "Lexigrove-authored acceptance examples; not source quotations",
  }); // # Sources checked on 2026-10-04: Wiktionary English record, bow and calm entries; no audio rights are assumed.
}
export const simpleWord = hydrateWord({
  ...manualEntry(
    "mitigate",
    "To make a harmful situation less severe.",
    "These measures mitigate the risk.",
  ),
  id: "fixture-mitigate",
  partOfSpeech: "verb",
  ipa: "/ˈmɪtɪɡeɪt/",
}); // # Case A: one entry, one pronunciation variant and one learning meaning.
export const calmWord = word("calm", [
  buildEntry(
    "fixture-calm",
    "adjective",
    "adjective",
    { main: { UK: "/kɑːm/", US: "/kɑm/" } },
    [
      {
        key: "quiet",
        definition: "Free from worry, excitement or disturbance.",
        example: "She remained calm during the storm.",
        collocations: ["remain calm", "calm voice"],
      },
    ],
    true,
  ),
  buildEntry(
    "fixture-calm",
    "noun",
    "noun",
    { main: { UK: "/kɑːm/", US: "/kɑm/" } },
    [
      {
        key: "peace",
        definition:
          "A peaceful state without worry or strong negative emotion.",
        example: "She felt a sense of calm after the exam.",
        collocations: ["a sense of calm", "restore calm"],
      },
    ],
  ),
]); // # Case B: adjective and noun share pronunciation within each accent.
export const recordWord = word("record", [
  buildEntry(
    "fixture-record",
    "noun",
    "noun",
    { main: { UK: "/ˈɹɛk.ɔːd/", US: "/ˈɹɛk.ɚd/" } },
    [
      {
        key: "information",
        definition: "Information kept so that it can be checked later.",
        dictionaries: [
          "Information kept so that it can be checked later.",
          "A document or other medium that preserves information.",
        ],
        example: "The laboratory keeps a record of each experiment.",
        collocations: ["keep a record", "written record"],
      },
      {
        key: "achievement",
        definition: "The best performance officially measured in an activity.",
        example: "The runner broke the national record.",
        collocations: ["break a record", "world record"],
      },
    ],
    true,
  ),
  buildEntry(
    "fixture-record",
    "verb",
    "verb",
    { main: { UK: "/ɹɪˈkɔːd/", US: "/ɹɪˈkɔɹd/" } },
    [
      {
        key: "information",
        definition: "To store measured information so it can be used later.",
        example: "The measurements were recorded automatically.",
        target: "recorded",
        collocations: ["record measurements", "record data"],
      },
      {
        key: "capture",
        definition: "To capture sound or video for later playback.",
        example: "We record each lecture for students to replay.",
        collocations: ["record a lecture", "record a video"],
      },
    ],
  ),
]); // # Cases C and E: two parts of speech, different stress, five dictionary senses and four learning groups.
export const bowWord = word("bow", [
  buildEntry(
    "fixture-bow",
    "noun",
    "noun",
    {
      gesture: { UK: "/baʊ/", US: "/baʊ/" },
      weapon: { UK: "/ˈbəʊ̯/", US: "/ˈboʊ̯/" },
    },
    [
      {
        key: "gesture",
        label: "Bending the body",
        pronunciation: "gesture",
        definition:
          "A movement that bends the head or upper body as a greeting.",
        example: "The actor gave a bow after the performance.",
        collocations: ["take a bow", "a polite bow"],
      },
      {
        key: "weapon",
        label: "Shooting arrows",
        pronunciation: "weapon",
        definition:
          "A weapon with a curved frame and string for shooting arrows.",
        example: "The archer raised the bow and aimed.",
        collocations: ["draw a bow", "bow and arrow"],
      },
    ],
    true,
  ),
]); // # Case D: one noun entry has two explicitly mapped lexical pronunciations.
export const lexicalWords = [simpleWord, calmWord, recordWord, bowWord];
export function importRows(
  words = [calmWord, recordWord, bowWord],
): ImportRow[] {
  return words.map((w) => ({
    word: w.lemma,
    deck: "Lexical acceptance",
    entries: structuredClone(w.entries),
    sourceurl: w.sourceUrl || undefined,
    sourcelicence: w.sourceLicence,
    examplesource: w.exampleSource,
  }));
} // # Graph imports contain no progress; new groups start with fresh scheduler state.
