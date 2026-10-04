import data from "../../data/starter-vocabulary.json"; // # Real, attributed Wiktionary definitions; data licence is CC BY-SA 4.0.
import chinese from "../../data/chinese-glosses.json"; // # Project adaptations match only the selected English sense.
import families from "../../data/word-families.json"; // # Source-listed morphological relatives, not guessed synonyms or cross-language cognates.
import audio from "../../data/starter-audio.json"; // # Compact path lookup; full audio provenance and checksums remain in the public manifest.
import { manualEntry, type Lexical } from "../types/model"; // # Seed entries have no pre-filled learning progress.
const general = new Set([
  "severe",
  "serious",
  "meticulous",
  "maintain",
  "improve",
  "support",
  "reduce",
  "increase",
  "compare",
  "explain",
  "observe",
  "reliable",
  "adapt",
  "retain",
  "diverse",
  "efficient",
]);
const environment = new Set([
  "reservoir",
  "sediment",
  "runoff",
  "catchment",
  "precipitation",
  "habitat",
  "glacier",
  "drought",
  "ecosystem",
  "sustainable",
]);
export const starterWords: Lexical[] = data.map((d) => ({
  ...manualEntry(
    d.lemma,
    d.definition,
    d.example,
    "",
    [
      general.has(d.lemma) ? "General English" : "Academic English",
      ...(environment.has(d.lemma) ? ["Environmental science"] : []),
    ],
    environment.has(d.lemma) ? ["environment"] : [],
  ),
  id: `starter-${d.lemma}`,
  partOfSpeech: d.partOfSpeech,
  ipa: d.ipa ?? "",
  chineseDefinition: chinese.glosses[d.lemma as keyof typeof chinese.glosses],
  chineseSource:
    "Lexigrove 项目编写，依当前英文义项改写 · CC BY-SA 4.0；未经独立双语审校",
  ipaUS: "ipaUS" in d ? (d.ipaUS ?? "") : "",
  ipaUK: "ipaUK" in d ? (d.ipaUK ?? "") : "",
  audioUK:
    audio.entries.find(
      (a) => a.lemma === d.lemma && a.partOfSpeech === d.partOfSpeech,
    )?.UK ?? "",
  audioUS:
    audio.entries.find(
      (a) => a.lemma === d.lemma && a.partOfSpeech === d.partOfSpeech,
    )?.US ?? "",
  audioAttribution: `Lexigrove 预生成合成语音 · Kokoro v1.0, UK bf_emma / US af_heart · model Apache-2.0 · ${audio.source}`,
  fullDefinitions: d.fullDefinitions,
  collocations: d.collocations,
  wordFamily: families.entries.find((f) => f.lemma === d.lemma)?.terms ?? [],
  wordFamilySource:
    families.entries.find((f) => f.lemma === d.lemma)?.sourceUrl ?? "",
  sourceTags: [d.sourceName],
  sourceUrl: d.sourceUrl,
  sourceLicence: d.sourceLicence,
  exampleSource: d.exampleSource,
  academic: !general.has(d.lemma),
  createdAt: 1790467200000,
  updatedAt: 1790467200000,
}));
