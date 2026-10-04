import {
  lexicalSchema,
  normalize,
  type Lexical,
  type Progress,
} from "../types/model"; // # Legacy records are lifted without changing their existing learning identifiers.
import type { LexicalEntry, LearningSenseGroup } from "../types/lexicon";
export type LearningUnit = Lexical & {
  wordId: string;
  lexicalEntryId: string;
  learningSenseId: string;
  pronunciationIds: string[];
};
export const lexicalIds = (word: Lexical) =>
  word.entries.flatMap((e) => [
    e.entryId,
    ...e.pronunciations.map((p) => p.pronunciationId),
    ...e.senses.map((s) => s.senseId),
    ...e.learningGroups.map((g) => g.learningSenseId),
  ]); // # Imported graph identifiers must remain unique across the entire library.
export function assertLexicalOwnership(word: Lexical, otherWords: Lexical[]) {
  const taken = new Set(
    otherWords
      .filter((w) => w.id !== word.id)
      .flatMap((w) => lexicalIds(hydrateWord(w))),
  );
  if (lexicalIds(word).some((id) => taken.has(id)))
    throw Error(
      "A lexical identifier already belongs to another word. Use distinct entry, sense and pronunciation IDs.",
    );
  if (
    otherWords.some(
      (w) => w.id === word.id && w.normalizedWord !== word.normalizedWord,
    )
  )
    throw Error("This word identifier already belongs to another spelling.");
}
export function hydrateWord(input: Lexical): Lexical {
  const word = lexicalSchema.parse(input);
  if (!word.entries.length) {
    const entryId = `${word.id}:entry:1`;
    const definitions = [
      ...new Set(
        [word.easyDefinition, ...word.fullDefinitions].filter(Boolean),
      ),
    ];
    if (!definitions.length) definitions.push("");
    const pronunciations = (["UK", "US", "neutral"] as const)
      .filter((locale) =>
        locale === "neutral"
          ? !!word.ipa || (!word.ipaUS && !word.ipaUK)
          : !!word[`ipa${locale}`] || !!word[`audio${locale}`],
      )
      .map((locale) => ({
        pronunciationId: `${entryId}:pron:${locale}`,
        lexicalEntryId: entryId,
        locale,
        ipa: locale === "neutral" ? word.ipa : word[`ipa${locale}`],
        audioURL: locale === "neutral" ? "" : word[`audio${locale}`],
        audioAttribution: word.audioAttribution,
        notes: "",
      }));
    const sentence =
      word.examples.find((e) =>
        new RegExp(
          `\\b${word.lemma.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          "i",
        ).test(e),
      ) || "";
    word.entries = [
      {
        entryId,
        wordId: word.id,
        partOfSpeech: word.partOfSpeech,
        label: "",
        register: "",
        usageNotes: [],
        pronunciations,
        senses: definitions.map((d, i) => ({
          senseId: `${entryId}:sense:${i + 1}`,
          lexicalEntryId: entryId,
          easyDefinition: d,
          fullDefinition: d,
          examples: i === 0 ? word.examples : [],
          collocations: i === 0 ? word.collocations : [],
          synonyms: word.synonyms,
          antonyms: word.antonyms,
          usageNotes: [],
        })),
        learningGroups: [
          {
            learningSenseId: word.id,
            lexicalEntryId: entryId,
            pronunciationIds: pronunciations.map((p) => p.pronunciationId),
            dictionarySenseIds: [`${entryId}:sense:1`],
            label: "",
            preferredLearningDefinition: word.easyDefinition,
            chineseDefinition: word.chineseDefinition,
            chineseSource: word.chineseSource,
            preferredExample: word.examples[0] || "",
            preferredCollocations: word.collocations,
            cloze: {
              sentence,
              target: sentence ? word.lemma : "",
              expectedAnswer: word.lemma,
              acceptedForms: word.alternatives,
            },
          },
        ],
      },
    ];
  }
  if (!word.familyLinks.length)
    word.familyLinks = word.wordFamily.map((lemma) => ({
      lemma,
      normalizedLemma: normalize(lemma),
      wordId: null,
      lexicalEntryId: null,
      relation: word.wordFamilySource ? "related" : "user",
      sourceUrl: word.wordFamilySource,
    }));
  return lexicalSchema.parse(word);
}
export function projectSense(
  word: Lexical,
  entry: LexicalEntry,
  group: LearningSenseGroup,
): LearningUnit {
  const pronunciations = entry.pronunciations.filter((p) =>
    group.pronunciationIds.includes(p.pronunciationId),
  );
  const byAccent = (locale: "US" | "UK" | "neutral") =>
    pronunciations.find((p) => p.locale === locale);
  const activePronunciations = word.entries.flatMap((e) =>
    e.pronunciations.filter((p) =>
      e.learningGroups.some((g) =>
        g.pronunciationIds.includes(p.pronunciationId),
      ),
    ),
  ); // # Old variants remain for history but do not make an edited simple word a heteronym.
  const allIPA = new Set(
    activePronunciations
      .filter((p) => p.locale === "US")
      .map((p) => p.ipa)
      .filter(Boolean),
  );
  const neutralIPA = new Set(
    activePronunciations
      .filter((p) => p.locale === "neutral")
      .map((p) => p.ipa)
      .filter(Boolean),
  );
  const ukIPA = new Set(
    activePronunciations
      .filter((p) => p.locale === "UK")
      .map((p) => p.ipa)
      .filter(Boolean),
  );
  return {
    ...word,
    id: group.learningSenseId,
    wordId: word.id,
    lexicalEntryId: entry.entryId,
    learningSenseId: group.learningSenseId,
    pronunciationIds: group.pronunciationIds,
    partOfSpeech: entry.partOfSpeech,
    ipa: byAccent("neutral")?.ipa || "",
    ipaUS: byAccent("US")?.ipa || "",
    ipaUK: byAccent("UK")?.ipa || "",
    audioUS: byAccent("US")?.audioURL || "",
    audioUK: byAccent("UK")?.audioURL || "",
    audioAttribution: pronunciations
      .map((p) => p.audioAttribution)
      .filter(Boolean)
      .join("; "),
    lexicalAudioRequired:
      allIPA.size > 1 || ukIPA.size > 1 || neutralIPA.size > 1,
    easyDefinition: group.preferredLearningDefinition,
    chineseDefinition: group.chineseDefinition,
    chineseSource: group.chineseSource,
    fullDefinitions: entry.senses
      .filter((s) => group.dictionarySenseIds.includes(s.senseId))
      .map((s) => s.fullDefinition),
    examples: group.preferredExample ? [group.preferredExample] : [],
    collocations: group.preferredCollocations,
    clozeSpec: group.cloze,
    alternatives: [],
  };
}
export function learningUnits(words: Lexical[]): LearningUnit[] {
  return words.flatMap((raw) => {
    const word = hydrateWord(raw);
    return word.entries.flatMap((entry) =>
      entry.learningGroups.map((group) => projectSense(word, entry, group)),
    );
  });
}
export function senseIdentity(unit: LearningUnit) {
  return {
    wordId: unit.wordId,
    lexicalEntryId: unit.lexicalEntryId,
    learningSenseId: unit.learningSenseId,
  };
}
export function wordProgress(word: Lexical, progress: Progress[]) {
  const units = learningUnits([word]);
  const states = progress.filter((p) => units.some((u) => u.id === p.id));
  return {
    total: units.length,
    acquired: states.filter((p) => p.everAcquired).length,
    mature: states.filter((p) => p.everMature).length,
    states,
  };
}
export function mergeLexicon(existing: Lexical, incoming: Lexical): Lexical {
  const old = hydrateWord(existing),
    next = hydrateWord(incoming);
  for (const entry of next.entries) {
    const byIdentifier = old.entries.find((e) => e.entryId === entry.entryId);
    if (
      byIdentifier?.partOfSpeech &&
      entry.partOfSpeech &&
      byIdentifier.partOfSpeech !== entry.partOfSpeech
    )
      throw Error(
        "An existing lexical entry ID cannot be reused for a different part of speech.",
      ); // # Explicit IDs establish ownership; they do not authorize mixing noun and verb content.
    const pronunciationKeys = (e: LexicalEntry) =>
      new Set(
        e.pronunciations
          .filter((p) =>
            e.learningGroups.some((g) =>
              g.pronunciationIds.includes(p.pronunciationId),
            ),
          )
          .map((p) => `${p.locale}:${p.ipa}`),
      );
    const importedKeys = pronunciationKeys(entry);
    const compatible = (e: LexicalEntry) => {
      const keys = pronunciationKeys(e);
      return (
        [...importedKeys].every((key) => keys.has(key)) ||
        [...keys].every((key) => importedKeys.has(key))
      );
    }; // # Importing one mapped pronunciation may enrich an entry that already contains several.
    const matching =
      byIdentifier ||
      old.entries.find(
        (e) =>
          e.partOfSpeech === entry.partOfSpeech &&
          e.label === entry.label &&
          compatible(e),
      ) ||
      (old.entries.length === 1 &&
      !old.entries[0].partOfSpeech &&
      old.entries[0].learningGroups.every((g) => !g.preferredLearningDefinition)
        ? old.entries[0]
        : undefined);
    if (!matching) {
      const entryId = crypto.randomUUID();
      const pMap = new Map(
        entry.pronunciations.map((p) => [
          p.pronunciationId,
          crypto.randomUUID(),
        ]),
      );
      const sMap = new Map(
        entry.senses.map((s) => [s.senseId, crypto.randomUUID()]),
      );
      old.entries.push({
        ...entry,
        entryId,
        wordId: old.id,
        pronunciations: entry.pronunciations.map((p) => ({
          ...p,
          lexicalEntryId: entryId,
          pronunciationId: pMap.get(p.pronunciationId)!,
        })),
        senses: entry.senses.map((s) => ({
          ...s,
          lexicalEntryId: entryId,
          senseId: sMap.get(s.senseId)!,
        })),
        learningGroups: entry.learningGroups.map((g) => ({
          ...g,
          lexicalEntryId: entryId,
          learningSenseId: crypto.randomUUID(),
          pronunciationIds: g.pronunciationIds.map((id) => pMap.get(id)!),
          dictionarySenseIds: g.dictionarySenseIds.map((id) => sMap.get(id)!),
        })),
      });
      continue;
    }
    if (!matching.partOfSpeech) matching.partOfSpeech = entry.partOfSpeech; // # Enrich an empty personal word without replacing its primary learning identifier.
    if (!matching.label) matching.label = entry.label;
    const pronMap = new Map<string, string>();
    for (const pron of entry.pronunciations) {
      let match = matching.pronunciations.find(
        (p) =>
          p.locale === pron.locale &&
          p.ipa === pron.ipa &&
          p.notes === pron.notes,
      );
      if (!match) {
        match = {
          ...pron,
          lexicalEntryId: matching.entryId,
          pronunciationId: crypto.randomUUID(),
        };
        matching.pronunciations.push(match);
      }
      if (!match.audioURL && pron.audioURL) {
        match.audioURL = pron.audioURL;
        match.audioAttribution = pron.audioAttribution;
      }
      pronMap.set(pron.pronunciationId, match.pronunciationId);
    }
    const remap = new Map<string, string>();
    for (const sense of entry.senses) {
      let match = matching.senses.find(
        (s) => s.fullDefinition === sense.fullDefinition,
      );
      if (!match) {
        match = matching.senses.find((s) => !s.fullDefinition);
        if (match)
          Object.assign(match, sense, {
            senseId: match.senseId,
            lexicalEntryId: matching.entryId,
          });
      }
      if (!match) {
        match = {
          ...sense,
          senseId: crypto.randomUUID(),
          lexicalEntryId: matching.entryId,
        };
        matching.senses.push(match);
      }
      remap.set(sense.senseId, match.senseId);
    }
    for (const group of entry.learningGroups) {
      let same = matching.learningGroups.find(
        (g) =>
          g.preferredLearningDefinition === group.preferredLearningDefinition &&
          JSON.stringify([...g.pronunciationIds].sort()) ===
            JSON.stringify(
              group.pronunciationIds.map((id) => pronMap.get(id)).sort(),
            ),
      );
      if (!same) {
        same = matching.learningGroups.find(
          (g) => !g.preferredLearningDefinition,
        );
        if (same)
          Object.assign(same, group, {
            learningSenseId: same.learningSenseId,
            lexicalEntryId: matching.entryId,
            pronunciationIds: group.pronunciationIds.map((id) =>
              pronMap.get(id)!,
            ),
            dictionarySenseIds: group.dictionarySenseIds.map((id) =>
              remap.get(id)!,
            ),
          });
      }
      if (same) {
        same.dictionarySenseIds = [
          ...new Set([
            ...same.dictionarySenseIds,
            ...group.dictionarySenseIds.map((id) => remap.get(id)!),
          ]),
        ];
        if (!same.preferredExample && group.preferredExample) {
          same.preferredExample = group.preferredExample;
          same.cloze = group.cloze;
        }
        if (!same.chineseDefinition) {
          same.chineseDefinition = group.chineseDefinition;
          same.chineseSource = group.chineseSource;
        }
        same.preferredCollocations = [
          ...new Set([
            ...same.preferredCollocations,
            ...group.preferredCollocations,
          ]),
        ];
      }
    }
    for (const group of entry.learningGroups)
      if (
        !matching.learningGroups.some(
          (g) =>
            g.preferredLearningDefinition ===
              group.preferredLearningDefinition &&
            JSON.stringify([...g.pronunciationIds].sort()) ===
              JSON.stringify(
                group.pronunciationIds.map((id) => pronMap.get(id)).sort(),
              ),
        )
      )
        matching.learningGroups.push({
          ...group,
          learningSenseId: crypto.randomUUID(),
          lexicalEntryId: matching.entryId,
          pronunciationIds: group.pronunciationIds.map((id) =>
            pronMap.get(id)!,
          ),
          dictionarySenseIds: group.dictionarySenseIds.map((id) =>
            remap.get(id)!,
          ),
        });
    for (const pron of entry.pronunciations) {
      const match = matching.pronunciations.find(
        (p) => p.locale === pron.locale && p.ipa === pron.ipa,
      );
      if (match && !match.audioURL) {
        match.audioURL = pron.audioURL;
        match.audioAttribution = pron.audioAttribution;
      }
    }
  }
  return syncPrimary({
    ...old,
    familyLinks: [
      ...old.familyLinks,
      ...next.familyLinks.filter(
        (link) =>
          !old.familyLinks.some(
            (existing) =>
              existing.normalizedLemma === link.normalizedLemma &&
              existing.relation === link.relation,
          ),
      ),
    ],
    decks: [...new Set([...old.decks, ...next.decks])],
    tags: [...new Set([...old.tags, ...next.tags])],
    note: old.note || next.note,
    updatedAt: Date.now(),
  });
}

export function syncPrimary(word: Lexical): Lexical {
  const base = hydrateWord(word),
    entry = base.entries[0],
    group = entry.learningGroups[0],
    unit = projectSense(base, entry, group);
  return {
    ...base,
    partOfSpeech: entry.partOfSpeech,
    ipa: unit.ipa,
    ipaUS: unit.ipaUS,
    ipaUK: unit.ipaUK,
    audioUS: unit.audioUS,
    audioUK: unit.audioUK,
    audioAttribution: unit.audioAttribution,
    easyDefinition: unit.easyDefinition,
    chineseDefinition: unit.chineseDefinition,
    chineseSource: unit.chineseSource,
    fullDefinitions: entry.senses.map((s) => s.fullDefinition),
    examples: unit.examples,
    collocations: unit.collocations,
    wordFamily: base.familyLinks.map((l) => l.lemma),
  };
} // # Lists display a projection; editing or importing never replaces unrelated lexical entries.
