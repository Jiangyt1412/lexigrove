import { z } from "zod"; // # Validate imports and backups before any writes.
import { entrySchema, familyLinkSchema } from "./lexicon"; // # Nested entries are authoritative; flat fields remain a legacy list projection.
const text = z.string().max(20000); // # Bound user-supplied strings.
export const normalize = (word: string) =>
  word.normalize("NFKC").trim().toLocaleLowerCase("en"); // # Exact spelling after Unicode, case and edge-whitespace normalization.
export const modalitySchema = z.enum(["copy", "definition", "audio", "cloze"]);
export type Modality = z.infer<typeof modalitySchema>;
export const lexicalSchema = z
  .object({
    id: z.string().min(1),
    entries: z.array(entrySchema).default([]),
    familyLinks: z.array(familyLinkSchema).default([]),
    wordId: z.string().optional(), // # Present only on a projected learning unit.
    lexicalEntryId: z.string().optional(),
    learningSenseId: z.string().optional(),
    pronunciationIds: z.array(z.string()).optional(),
    lexicalAudioRequired: z.boolean().optional(),
    clozeSpec: z
      .object({
        sentence: text,
        target: text,
        expectedAnswer: text,
        acceptedForms: z.array(text),
      })
      .optional(),
    lemma: z.string().trim().min(1).max(120),
    normalizedWord: z.string().min(1),
    partOfSpeech: text,
    ipa: text.default(""), // # A dictionary's unlabelled IPA remains neutral rather than being relabelled as a regional accent.
    ipaUS: text,
    ipaUK: text,
    easyDefinition: text,
    chineseDefinition: text.default(""), // # Old backups remain readable without a Chinese field.
    chineseSource: text.default(""), // # Keep editorial hints distinct from dictionary-source text.
    fullDefinitions: z.array(text),
    examples: z.array(text),
    collocations: z.array(text),
    wordFamily: z.array(text),
    wordFamilySource: text.default(""), // # Older backups may omit the source of morphological relatives.
    synonyms: z.array(text),
    antonyms: z.array(text),
    sourceTags: z.array(text),
    decks: z.array(z.string().min(1).max(100)),
    tags: z.array(text),
    frequencyRank: z.number().int().positive().nullable(),
    academic: z.boolean(),
    sourceUrl: text,
    sourceLicence: text,
    exampleSource: text,
    note: text,
    alternatives: z.array(text),
    audioUS: text,
    audioUK: text,
    audioAttribution: text,
    imageURL: text,
    imageAttribution: text,
    createdAt: z.number().finite(),
    updatedAt: z.number().finite(),
  })
  .strict()
  .superRefine((word, ctx) => {
    const ids = word.entries.flatMap((e) => [
      e.entryId,
      ...e.pronunciations.map((p) => p.pronunciationId),
      ...e.senses.map((s) => s.senseId),
      ...e.learningGroups.map((g) => g.learningSenseId),
    ]);
    if (
      new Set(ids).size !== ids.length ||
      word.entries.some((e) => e.wordId !== word.id)
    )
      ctx.addIssue({
        code: "custom",
        message: "Duplicate identifiers or foreign lexical entries.",
      });
  });
export type Lexical = z.infer<typeof lexicalSchema>;
const count = z.number().int().nonnegative();
const date = z
  .union([
    z.date(),
    z
      .string()
      .datetime()
      .transform((s) => new Date(s)),
  ])
  .refine((d) => Number.isFinite(d.getTime()));
export const cardSchema = z
  .object({
    due: date,
    stability: z.number().finite().nonnegative(),
    difficulty: z.number().finite().min(0).max(10),
    elapsed_days: z.number().finite().nonnegative(),
    scheduled_days: z.number().finite().nonnegative(),
    reps: count,
    lapses: count,
    state: z.number().int().min(0).max(3),
    learning_steps: count,
    last_review: date.optional(),
  })
  .strict()
  .refine(
    (c) =>
      c.state === 0 ||
      (c.stability > 0 && c.difficulty >= 1 && c.reps > 0 && !!c.last_review),
    "A studied card needs valid FSRS memory and review data.",
  );
const accuracy = z
  .object({ correct: count, total: count })
  .strict()
  .refine((a) => a.correct <= a.total);
export const progressSchema = z
  .object({
    id: z.string().min(1),
    wordId: z.string().default(""),
    lexicalEntryId: z.string().default(""),
    learningSenseId: z.string().default(""),
    introduced: z.boolean(),
    stage: z.number().int().min(0).max(3),
    streak: z.number().int().min(0).max(3),
    attempts: count,
    correct: count,
    incorrect: count,
    failures: count,
    reviewSuccesses: count,
    accuracy: z
      .object({
        copy: accuracy,
        definition: accuracy,
        audio: accuracy,
        cloze: accuracy,
      })
      .strict(),
    card: cardSchema.nullable(),
    suspended: z.boolean(),
    favorite: z.boolean(),
    known: z.boolean(),
    everAcquired: z.boolean(),
    everMature: z.boolean(),
    acquiredAt: z.number().finite().nullable(),
    lastReviewedAt: z.number().finite().nullable(),
    revision: count,
  })
  .strict()
  .refine(
    (p) =>
      p.correct + p.incorrect === p.attempts &&
      p.stage === p.streak &&
      (p.stage === 3) === (p.card !== null) &&
      (!p.card || p.introduced),
  );
export type Progress = z.infer<typeof progressSchema>;
export const attemptSchema = z
  .object({
    id: z.string().min(1),
    wordId: z.string().min(1),
    lexicalEntryId: z.string().default(""),
    learningSenseId: z.string().default(""),
    pronunciationId: z.string().nullable().default(null),
    expectedAnswer: text.default(""),
    at: z.number().finite(),
    mode: z.enum(["intro", "acquisition", "review", "practice"]),
    modality: modalitySchema,
    answer: text,
    correct: z.boolean(),
    rating: z.number().int().min(1).max(4).nullable(),
    before: cardSchema.nullable(),
    after: cardSchema.nullable(),
  })
  .strict();
export type Attempt = z.infer<typeof attemptSchema>;
export const settingsSchema = z
  .object({
    id: z.literal("settings"),
    accent: z.enum(["US", "UK"]),
    speed: z.union([z.literal(0.75), z.literal(1), z.literal(1.25)]),
    autoPronounce: z.boolean(),
    dailyTarget: z.number().int().min(1).max(200),
    retention: z.number().min(0.7).max(0.97),
    theme: z.enum(["day", "night", "system"]),
    world: z.enum(["farm", "ocean", "mixed", "off"]),
    showImages: z.boolean(),
    reduceEffects: z.boolean(),
    season: z
      .enum(["auto", "spring", "summer", "autumn", "winter"])
      .default("auto"),
    environmentAnimation: z.enum(["full", "reduced", "static"]).default("full"),
    easyDefault: z.boolean(),
    showChinese: z.boolean().default(true), // # Optional support; recall prompts still use English.
    audioPreference: z.enum(["local", "human"]),
    voiceURI: z.string().max(2000).default(""), // # Old settings and backups keep automatic voice selection.
    lastBackup: z.number().finite().nullable(),
  })
  .strict();
export type Settings = z.infer<typeof settingsSchema>;
export const defaultSettings: Settings = {
  id: "settings",
  accent: "US",
  speed: 1,
  autoPronounce: true,
  dailyTarget: 20,
  retention: 0.9,
  theme: "day",
  world: "mixed",
  showImages: false,
  reduceEffects: false,
  season: "auto",
  environmentAnimation: "full",
  easyDefault: true,
  showChinese: true,
  audioPreference: "local",
  voiceURI: "",
  lastBackup: null,
};
export const sessionSchema = z
  .object({
    id: z.literal("active"),
    token: z.string().min(1),
    mode: z.enum(["acquire", "review", "practice"]),
    wordIds: z.array(z.string()),
    lastWord: z.string().nullable(),
    completed: count,
    startedAt: z.number().finite(),
  })
  .strict();
export type Session = z.infer<typeof sessionSchema>;
export const worldSchema = z
  .object({ id: z.literal("world"), garden: count, aquarium: count })
  .strict();
export type World = z.infer<typeof worldSchema>;
export function freshProgress(id: string): Progress {
  return {
    id,
    wordId: id,
    lexicalEntryId: `${id}:entry:1`,
    learningSenseId: id,
    introduced: false,
    stage: 0,
    streak: 0,
    attempts: 0,
    correct: 0,
    incorrect: 0,
    failures: 0,
    reviewSuccesses: 0,
    accuracy: {
      copy: { correct: 0, total: 0 },
      definition: { correct: 0, total: 0 },
      audio: { correct: 0, total: 0 },
      cloze: { correct: 0, total: 0 },
    },
    card: null,
    suspended: false,
    favorite: false,
    known: false,
    everAcquired: false,
    everMature: false,
    acquiredAt: null,
    lastReviewedAt: null,
    revision: 0,
  };
}
export function manualEntry(
  lemma: string,
  definition = "",
  example = "",
  note = "",
  decks = ["Personal vocabulary"],
  tags: string[] = [],
): Lexical {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    entries: [],
    familyLinks: [],
    lemma: lemma.trim().normalize("NFKC"),
    normalizedWord: normalize(lemma),
    partOfSpeech: "",
    ipa: "",
    ipaUS: "",
    ipaUK: "",
    easyDefinition: definition,
    chineseDefinition: "",
    chineseSource: "",
    fullDefinitions: definition ? [definition] : [],
    examples: example ? [example] : [],
    collocations: [],
    wordFamily: [],
    wordFamilySource: "",
    synonyms: [],
    antonyms: [],
    sourceTags: ["Personal entry"],
    decks,
    tags,
    frequencyRank: null,
    academic: false,
    sourceUrl: "",
    sourceLicence: "User supplied — verify rights before redistribution",
    exampleSource: "User supplied",
    note,
    alternatives: [],
    audioUS: "",
    audioUK: "",
    audioAttribution: "",
    imageURL: "",
    imageAttribution: "",
    createdAt: now,
    updatedAt: now,
  };
}
