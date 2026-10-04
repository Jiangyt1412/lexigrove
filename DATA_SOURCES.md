# Starter vocabulary provenance and licence report

Retrieved and checked on 2026-09-27. This is a curated development starter set, not an NGSL, NAWL, AWL, frequency-ranked or validated curriculum.

## Deliverables

- `data/starter-vocabulary.json`: 60 unique English lemmas, including all 25 terms expressly required by the product request.
- `data/selection-audit.json`: exact source URLs, SHA-256 hashes, part-of-speech selection, entry occurrence and sense indices.
- `scripts/fetch_dictionary.py`: bounded per-word downloader with an explicit work directory and retrieval-date manifest.
- `scripts/curate_dictionary.py`: offline transformation with explicit input/output directories and retrieval-date validation.
- `work/dictionary/raw/` (created on demand; not shipped): research evidence only; do not bundle this directory. Full raw responses can contain historical quotations and externally licensed audio references that were deliberately excluded from the application-ready subset.

## Rebuilding the starter data

Run the tools from the repository root with Python 3. They use only the Python standard library. Raw downloads and generated candidates default to `work/dictionary/`, independently of where the scripts themselves live. Generated files are not written directly over `data/`.

```sh
python3 scripts/fetch_dictionary.py --work-dir work/dictionary # Explicitly download 60 individual source entries and record their retrieval date.
python3 scripts/curate_dictionary.py --work-dir work/dictionary # Build candidate JSON under work/dictionary/generated without network access.
```

For an existing archived raw cache, run only the curator. Supply its known original retrieval date with `--retrieved-at YYYY-MM-DD` when the cache lacks `fetch-manifest.json`; replace the placeholder with the actual date, not today's processing date. `--output-dir` can select another candidate-output folder. A missing or malformed retrieval date is rejected rather than fabricated.

The production starter was retrieved on **2026-09-27**. Re-running the refactored curator on those existing raw files with that date reproduced both shipped JSON files byte for byte; no new network fetch was used for this check. The SHA-256 of `data/starter-vocabulary.json` is `f67703c91db97b788a32d891bfd5171d6dc9b36e137625d8f75934269aed14c7`; the SHA-256 of `data/selection-audit.json` is `cab54ddeeb57e2bf821f8c19ca0f3e920cafcb52a6e3292f3ed816a68931328a`.

Kaikki's per-word URLs are updated over time. Exact snapshot reproduction requires the original raw files whose hashes are recorded in the audit; a fresh download from the same URL is not guaranteed to be identical. The curator uses explicit part-of-speech and sense indices. After refreshing data, inspect the source senses, examples, IPA tags, copyright notices and audit hashes before accepting the generated candidates. Do not assume unchanged indices mean unchanged senses, and do not automatically overwrite the shipped data. The 60-entry assertion and cloze-target checks do not replace that editorial review.

Keep raw responses in `work/` and out of public assets, repository releases and backups intended as a redistributed dictionary: they can contain externally quoted passages or media metadata excluded from the reviewed starter subset. Only the selected JSON and its provenance/licence documentation belong in the distributable data directory.

## Primary-source evidence

[Kaikki's dictionary licence notice](https://kaikki.org/dictionary/) states exactly:

> This data is made available under the same licenses as Wiktionary - both CC-BY-SA and GFDL.

[Wiktionary's copyright page](https://en.wiktionary.org/wiki/Wiktionary:Copyrights) identifies CC BY-SA **4.0 International** and GFDL. Its copyright policy body is marked a draft; the actual site-wide footer independently links the Creative Commons licence. The exact footer notice is:

> Definitions and other text are available under the Creative Commons Attribution-ShareAlike License; additional terms may apply.

The [CC BY-SA 4.0 licence](https://creativecommons.org/licenses/by-sa/4.0/) permits redistribution and adaptations, including commercial use, subject to attribution, indicating changes and ShareAlike. [Full legal code](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en).

The [Kaikki English data page](https://kaikki.org/dictionary/English/index.html) and checked individual word page identify the 2026-09-02 English Wiktionary dump and a 2026-09-25 extraction. We downloaded individual `.jsonl` word endpoints, approximately 2.08 MB total for the selected 60 words, rather than a multi-gigabyte dictionary dump.

The [Wiktextract project](https://github.com/tatuylonen/wiktextract) is the upstream extractor. Its code has an MIT licence; that code licence does **not** relicense Wiktionary definitions. The source authors request citation of [Tatu Ylonen, “Wiktextract: Wiktionary as Machine-Readable Structured Data,” LREC 2022, pp. 1317–1325](https://aclanthology.org/2022.lrec-1.140/).

## Recommended notice for the application and repository

“Selected English definitions and IPA: English Wiktionary contributors, extracted through Kaikki.org / Wiktextract. Licensed under Creative Commons Attribution-ShareAlike 4.0 International: https://creativecommons.org/licenses/by-sa/4.0/. Per-entry source and contributor-history links are included in the dataset. Changes: selected and reordered senses; selected IPA variants; converted to this JSON schema; precipitation's short definition is an exact first-sentence excerpt. Examples and collocation selections were authored for this project and are included under the same data licence. No source endorsement is implied.”

Keep `sourceUrl`, `sourceName`, `sourceLicence`, `sourceLicenceUrl`, `sourceHistoryUrl` and `sourceExtractionUrl` with each entry. Show at least the source and licence links in the dictionary details. Keep this dataset and its adapted versions under CC BY-SA 4.0; document it as an exception to any MIT licence for application code. The dataset licence includes no warranty.

## Editorial choices and limitations

The 60 lemmas were chosen for development: the initial product request explicitly named 25, and the project supplemented 35 general, academic and environmental terms. Deck assignment and sense selection are editorial decisions. No corpus frequency calculation, representative sampling, standardized level assessment or verification against a published teaching/examination list was used. Source verification establishes where the definitions came from; it does not establish that this selection is an optimal curriculum.

Added on 2026-10-04: `data/chinese-glosses.json` contains 60 project-authored Simplified Chinese adaptations aligned with each entry's **primary English sense**. These are not copied from a verified bilingual dictionary or presented as official Wiktionary Chinese translations. They have not received independent bilingual review and do not translate every additional sense. They remain in the CC BY-SA 4.0 data layer with the original English source attribution. For example, significant teaches ordinary importance rather than statistical significance; retain teaches memory; bias initially teaches inclination rather than a formal statistical definition. Refreshing or editing English senses requires checking the corresponding Chinese hint. The app only enriches an existing starter entry automatically if its original primary English definition still matches, and preserves user-edited Chinese hints and all learning state.

All definitions in the unchanged 60-word starter are selected glosses from the downloaded Wiktionary data. Its default definition is the selected source gloss. The optional structured examples below add explicitly authored plain-English paraphrases; these are adaptations rather than verbatim dictionary quotations. The graph can retain a full definition separately from its teaching explanation.

The statistical definition of “significant” in the raw source is potentially misleading when read as a formal explanation of statistical significance. It was excluded. The starter teaches the ordinary senses “having a noticeable or major effect” and “reasonably large in number or amount.” Technical statistical teaching should use a reviewed explanation of significance testing.

The source definition of “catchment” is broad, and the definition of “confounder” is a dictionary-level description, not a formal causal-inference criterion. This dataset does not replace a specialist textbook glossary.

All 60 example sentences are original teaching examples authored for this project, not external quotations or descriptions of identified real studies. Each sentence contains its target lemma exactly once, checked programmatically. All 120 collocations are project-curated usage phrases; they are not claimed to be corpus-ranked or copied from Wiktionary. The original `data/starter-vocabulary.json` keeps its original empty `wordFamily` arrays. The app now separately joins 35 verified entries from `data/word-families.json` (checked 2026-10-04), selecting morphological relatives from the English Wiktionary Derived terms / Related terms sections. Per-entry links, verification dates and CC BY-SA 4.0 attribution are preserved. This is a partial word-family layer, not an exhaustive etymology or cross-language cognate dictionary; the remaining 25 entries explicitly show that no family has been verified. Unlabelled IPA is stored separately from US/UK transcriptions, without inventing an accent label.

IPA coverage: 38 entries have an explicitly US/General American transcription; 37 have an explicitly UK/Received Pronunciation transcription; 22 contain a source transcription without an accent tag in the separate `ipa` field. These counts overlap. Region labels are preserved rather than inferred. Some entries have no usable source IPA and omit it. Do not populate a missing accent field by copying the unlabelled IPA. Source sound URLs, recordings and images are not bundled.

The complete source pages were not subjected to a separate line-by-line historical copyright audit. Reuse relies on the explicit source licences and preserves traceable source links. Only definitions and IPA were extracted; illustrative quotations were excluded because their licences may differ.

## Structured multiple-meaning examples

`public/examples/lexical-import.json` is an optional import, separate from the unchanged 60-word starter and from personal backups. Its direct English Wiktionary sources were checked on 2026-10-04: [calm](https://en.wiktionary.org/wiki/calm#English), [record](https://en.wiktionary.org/wiki/record#English) and [bow](https://en.wiktionary.org/wiki/bow#English). Each record retains source URL, licence and example attribution. Definitions are project-authored paraphrases of selected source meanings; examples and collocations are original teaching material. These adapted data are distributed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), with attribution to English Wiktionary contributors. They are not exhaustive entries or independently reviewed teaching curricula.

| Case              | Demonstrated structure                                                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A, ordinary entry | The existing starter's mitigate has one primary teaching group; the test fixture also exercises one POS, one neutral pronunciation and one meaning.                                  |
| B, calm           | Adjective and noun entries share their within-accent IPA; accent variants remain pronunciations rather than semantic cards.                                                          |
| C, record         | Noun and verb entries own different stress patterns and their corresponding meanings, examples and collocations.                                                                     |
| D, bow            | One noun entry explicitly maps a bending gesture to /baʊ/ and a weapon to the separate UK/US variants; noun POS alone cannot select the pronunciation.                               |
| E, record         | Five selected dictionary senses map to four learning groups: the information/physical medium senses share a teaching group, while achievement and two verb meanings remain separate. |

These groupings are editorial examples of the generic architecture, not a claim that there is one universally correct sense taxonomy. `tests/fixtures/lexical.ts` supplies the same mappings to automated checks; there is no word-specific branching in the app. The optional record/bow example has no owned recordings, so its heteronym listening remains pending until attributed recordings for their selected pronunciations are supplied. Missing Chinese is left empty. Importing the example preserves existing canonical words, cards and notes and adds only genuinely new groups.

## Per-entry attribution links

Every row below links to the source entry. Its contributor history is accessible from that page and is also stored directly in the JSON. Exact download endpoints and hashes are in `data/selection-audit.json`.

| Lemma         | Part of speech | Source                                                                                                                                                      | Licence                                                         |
| ------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| mitigate      | verb           | [Wiktionary](https://en.wiktionary.org/wiki/mitigate#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/m/mi/mitigate.jsonl)           | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| significant   | adjective      | [Wiktionary](https://en.wiktionary.org/wiki/significant#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/s/si/significant.jsonl)     | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| empirical     | adjective      | [Wiktionary](https://en.wiktionary.org/wiki/empirical#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/e/em/empirical.jsonl)         | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| robust        | adjective      | [Wiktionary](https://en.wiktionary.org/wiki/robust#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/r/ro/robust.jsonl)               | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| infer         | verb           | [Wiktionary](https://en.wiktionary.org/wiki/infer#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/i/in/infer.jsonl)                 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| derive        | verb           | [Wiktionary](https://en.wiktionary.org/wiki/derive#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/d/de/derive.jsonl)               | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| subsequent    | adjective      | [Wiktionary](https://en.wiktionary.org/wiki/subsequent#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/s/su/subsequent.jsonl)       | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| constraint    | noun           | [Wiktionary](https://en.wiktionary.org/wiki/constraint#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/c/co/constraint.jsonl)       | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| distribution  | noun           | [Wiktionary](https://en.wiktionary.org/wiki/distribution#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/d/di/distribution.jsonl)   | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| uncertainty   | noun           | [Wiktionary](https://en.wiktionary.org/wiki/uncertainty#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/u/un/uncertainty.jsonl)     | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| estimate      | noun           | [Wiktionary](https://en.wiktionary.org/wiki/estimate#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/e/es/estimate.jsonl)           | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| variable      | noun           | [Wiktionary](https://en.wiktionary.org/wiki/variable#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/v/va/variable.jsonl)           | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| parameter     | noun           | [Wiktionary](https://en.wiktionary.org/wiki/parameter#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/p/pa/parameter.jsonl)         | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| framework     | noun           | [Wiktionary](https://en.wiktionary.org/wiki/framework#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/f/fr/framework.jsonl)         | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| methodology   | noun           | [Wiktionary](https://en.wiktionary.org/wiki/methodology#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/m/me/methodology.jsonl)     | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| bias          | noun           | [Wiktionary](https://en.wiktionary.org/wiki/bias#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/b/bi/bias.jsonl)                   | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| causal        | adjective      | [Wiktionary](https://en.wiktionary.org/wiki/causal#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/c/ca/causal.jsonl)               | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| confounder    | noun           | [Wiktionary](https://en.wiktionary.org/wiki/confounder#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/c/co/confounder.jsonl)       | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| validate      | verb           | [Wiktionary](https://en.wiktionary.org/wiki/validate#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/v/va/validate.jsonl)           | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| simulate      | verb           | [Wiktionary](https://en.wiktionary.org/wiki/simulate#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/s/si/simulate.jsonl)           | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| reservoir     | noun           | [Wiktionary](https://en.wiktionary.org/wiki/reservoir#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/r/re/reservoir.jsonl)         | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| sediment      | noun           | [Wiktionary](https://en.wiktionary.org/wiki/sediment#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/s/se/sediment.jsonl)           | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| runoff        | noun           | [Wiktionary](https://en.wiktionary.org/wiki/runoff#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/r/ru/runoff.jsonl)               | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| catchment     | noun           | [Wiktionary](https://en.wiktionary.org/wiki/catchment#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/c/ca/catchment.jsonl)         | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| precipitation | noun           | [Wiktionary](https://en.wiktionary.org/wiki/precipitation#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/p/pr/precipitation.jsonl) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| severe        | adjective      | [Wiktionary](https://en.wiktionary.org/wiki/severe#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/s/se/severe.jsonl)               | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| serious       | adjective      | [Wiktionary](https://en.wiktionary.org/wiki/serious#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/s/se/serious.jsonl)             | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| meticulous    | adjective      | [Wiktionary](https://en.wiktionary.org/wiki/meticulous#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/m/me/meticulous.jsonl)       | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| evidence      | noun           | [Wiktionary](https://en.wiktionary.org/wiki/evidence#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/e/ev/evidence.jsonl)           | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| maintain      | verb           | [Wiktionary](https://en.wiktionary.org/wiki/maintain#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/m/ma/maintain.jsonl)           | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| improve       | verb           | [Wiktionary](https://en.wiktionary.org/wiki/improve#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/i/im/improve.jsonl)             | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| support       | verb           | [Wiktionary](https://en.wiktionary.org/wiki/support#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/s/su/support.jsonl)             | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| reduce        | verb           | [Wiktionary](https://en.wiktionary.org/wiki/reduce#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/r/re/reduce.jsonl)               | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| increase      | verb           | [Wiktionary](https://en.wiktionary.org/wiki/increase#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/i/in/increase.jsonl)           | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| compare       | verb           | [Wiktionary](https://en.wiktionary.org/wiki/compare#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/c/co/compare.jsonl)             | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| explain       | verb           | [Wiktionary](https://en.wiktionary.org/wiki/explain#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/e/ex/explain.jsonl)             | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| observe       | verb           | [Wiktionary](https://en.wiktionary.org/wiki/observe#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/o/ob/observe.jsonl)             | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| evaluate      | verb           | [Wiktionary](https://en.wiktionary.org/wiki/evaluate#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/e/ev/evaluate.jsonl)           | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| hypothesis    | noun           | [Wiktionary](https://en.wiktionary.org/wiki/hypothesis#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/h/hy/hypothesis.jsonl)       | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| analysis      | noun           | [Wiktionary](https://en.wiktionary.org/wiki/analysis#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/a/an/analysis.jsonl)           | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| data          | noun           | [Wiktionary](https://en.wiktionary.org/wiki/data#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/d/da/data.jsonl)                   | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| method        | noun           | [Wiktionary](https://en.wiktionary.org/wiki/method#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/m/me/method.jsonl)               | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| outcome       | noun           | [Wiktionary](https://en.wiktionary.org/wiki/outcome#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/o/ou/outcome.jsonl)             | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| process       | noun           | [Wiktionary](https://en.wiktionary.org/wiki/process#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/p/pr/process.jsonl)             | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| response      | noun           | [Wiktionary](https://en.wiktionary.org/wiki/response#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/r/re/response.jsonl)           | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| reliable      | adjective      | [Wiktionary](https://en.wiktionary.org/wiki/reliable#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/r/re/reliable.jsonl)           | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| consistent    | adjective      | [Wiktionary](https://en.wiktionary.org/wiki/consistent#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/c/co/consistent.jsonl)       | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| ambiguous     | adjective      | [Wiktionary](https://en.wiktionary.org/wiki/ambiguous#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/a/am/ambiguous.jsonl)         | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| adapt         | verb           | [Wiktionary](https://en.wiktionary.org/wiki/adapt#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/a/ad/adapt.jsonl)                 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| retain        | verb           | [Wiktionary](https://en.wiktionary.org/wiki/retain#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/r/re/retain.jsonl)               | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| diverse       | adjective      | [Wiktionary](https://en.wiktionary.org/wiki/diverse#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/d/di/diverse.jsonl)             | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| efficient     | adjective      | [Wiktionary](https://en.wiktionary.org/wiki/efficient#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/e/ef/efficient.jsonl)         | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| habitat       | noun           | [Wiktionary](https://en.wiktionary.org/wiki/habitat#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/h/ha/habitat.jsonl)             | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| glacier       | noun           | [Wiktionary](https://en.wiktionary.org/wiki/glacier#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/g/gl/glacier.jsonl)             | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| drought       | noun           | [Wiktionary](https://en.wiktionary.org/wiki/drought#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/d/dr/drought.jsonl)             | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| ecosystem     | noun           | [Wiktionary](https://en.wiktionary.org/wiki/ecosystem#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/e/ec/ecosystem.jsonl)         | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| sustainable   | adjective      | [Wiktionary](https://en.wiktionary.org/wiki/sustainable#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/s/su/sustainable.jsonl)     | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| trend         | noun           | [Wiktionary](https://en.wiktionary.org/wiki/trend#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/t/tr/trend.jsonl)                 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| correlation   | noun           | [Wiktionary](https://en.wiktionary.org/wiki/correlation#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/c/co/correlation.jsonl)     | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| intervention  | noun           | [Wiktionary](https://en.wiktionary.org/wiki/intervention#English) · [Kaikki JSONL](https://kaikki.org/dictionary/English/meaning/i/in/intervention.jsonl)   | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |


Starter audio now has its own model, voice and processing provenance in [AUDIO_SOURCES.md](AUDIO_SOURCES.md). It does not change the selected 60 words, definitions, source ranks, card IDs or dictionary IPA.
