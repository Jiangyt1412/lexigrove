import { z } from "zod"; // # Explicit relationships keep accent variants separate from lexical meanings.
const text = z.string().max(20000);
const id = z.string().min(1).max(250);
export const pronunciationSchema = z
  .object({
    pronunciationId: id,
    lexicalEntryId: id,
    locale: z.enum(["US", "UK", "neutral"]),
    ipa: text,
    audioURL: text.default(""),
    audioAttribution: text.default(""),
    notes: text.default(""),
  })
  .strict();
export const dictionarySenseSchema = z
  .object({
    senseId: id,
    lexicalEntryId: id,
    easyDefinition: text,
    fullDefinition: text,
    examples: z.array(text).default([]),
    collocations: z.array(text).default([]),
    synonyms: z.array(text).default([]),
    antonyms: z.array(text).default([]),
    usageNotes: z.array(text).default([]),
  })
  .strict();
export const learningSenseSchema = z
  .object({
    learningSenseId: id,
    lexicalEntryId: id,
    pronunciationIds: z.array(id).min(1),
    dictionarySenseIds: z.array(id).min(1),
    label: text.default(""),
    preferredLearningDefinition: text,
    chineseDefinition: text.default(""),
    chineseSource: text.default(""),
    preferredExample: text,
    preferredCollocations: z.array(text).default([]),
    cloze: z
      .object({
        sentence: text,
        target: text,
        expectedAnswer: text,
        acceptedForms: z.array(text).default([]),
      })
      .strict(),
  })
  .strict();
export const entrySchema = z
  .object({
    entryId: id,
    wordId: id,
    partOfSpeech: text,
    label: text.default(""),
    register: text.default(""),
    usageNotes: z.array(text).default([]),
    pronunciations: z.array(pronunciationSchema).min(1),
    senses: z.array(dictionarySenseSchema).min(1),
    learningGroups: z.array(learningSenseSchema).min(1),
  })
  .strict()
  .superRefine((entry, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    const unique = (ids: string[]) => new Set(ids).size === ids.length;
    if (
      ![
        entry.pronunciations.map((p) => p.pronunciationId),
        entry.senses.map((s) => s.senseId),
        entry.learningGroups.map((g) => g.learningSenseId),
      ].every(unique)
    )
      fail("Duplicate lexical identifiers.");
    if (
      [...entry.pronunciations, ...entry.senses, ...entry.learningGroups].some(
        (x) => x.lexicalEntryId !== entry.entryId,
      )
    )
      fail("Cross-entry content is not permitted.");
    for (const group of entry.learningGroups) {
      if (!unique(group.pronunciationIds) || !unique(group.dictionarySenseIds))
        fail("Duplicate learning-group relationships."); // # A relationship is a set, never a repeated source of learning credit.
      if (
        group.pronunciationIds.some(
          (id) => !entry.pronunciations.some((p) => p.pronunciationId === id),
        ) ||
        group.dictionarySenseIds.some(
          (id) => !entry.senses.some((s) => s.senseId === id),
        )
      )
        fail("Broken sense or pronunciation relationship.");
      if (
        group.cloze.sentence &&
        (!group.cloze.target || !group.cloze.expectedAnswer)
      )
        fail("Cloze needs a target surface form and expected answer.");
      if (group.cloze.sentence && group.cloze.target) {
        const escaped = group.cloze.target.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        ); // # Match a complete surface form instead of a substring inside another word.
        if (
          !new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, "iu").test(
            group.cloze.sentence,
          )
        )
          fail("Cloze target is absent from its sentence.");
      }
    }
  });
export const familyLinkSchema = z
  .object({
    lemma: text,
    normalizedLemma: text,
    wordId: id.nullable().default(null),
    lexicalEntryId: id.nullable().default(null),
    relation: z.enum(["derived", "related", "user"]),
    sourceUrl: text.default(""),
  })
  .strict();
export type LexicalEntry = z.infer<typeof entrySchema>;
export type PronunciationVariant = z.infer<typeof pronunciationSchema>;
export type LearningSenseGroup = z.infer<typeof learningSenseSchema>;
