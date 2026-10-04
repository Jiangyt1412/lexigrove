import { useState } from "react"; // # Search only the local dictionary; no network dependency.
import {
  Search,
  Plus,
  Upload,
  Star,
  Pause,
  Play,
  RotateCcw,
} from "../components/PixelIcons";
import type { Lexical, Progress } from "../types/model";
import {
  hydrateWord,
  learningUnits,
  wordProgress,
  syncPrimary,
  mergeLexicon,
  senseIdentity,
} from "../vocabulary/lexicon"; // # Words stay unique while each learning meaning keeps its own state.
import { freshProgress, manualEntry } from "../types/model";
import { addWord, db } from "../db/database";
import { learningState, resetProgress } from "../learning/engine";
import { difficult } from "../statistics/statistics";
import { Modal, Confirm, Empty } from "../components/ui";
export function WordEditor({
  initial = "",
  entry,
  onClose,
  notify,
}: {
  initial?: string;
  entry?: Lexical;
  onClose: () => void;
  notify: (s: string) => void;
}) {
  const canonical = entry ? hydrateWord(entry) : null;
  const initialUnit = canonical ? learningUnits([canonical])[0] : null;
  const [selected, setSelected] = useState(initialUnit?.id || ""),
    [newEntry, setNewEntry] = useState(false),
    [newGroup, setNewGroup] = useState(false);
  const [word, setWord] = useState(entry?.lemma ?? initial),
    [definition, setDefinition] = useState(initialUnit?.easyDefinition || ""),
    [chinese, setChinese] = useState(initialUnit?.chineseDefinition || ""),
    [example, setExample] = useState(initialUnit?.examples[0] || ""),
    [note, setNote] = useState(entry?.note || ""),
    [tags, setTags] = useState(entry?.tags.join(", ") || ""),
    [saving, setSaving] = useState(false);
  const [pos, setPos] = useState(initialUnit?.partOfSpeech || ""),
    [entryLabel, setEntryLabel] = useState(canonical?.entries[0].label || ""),
    [ipaUS, setIPAUS] = useState(initialUnit?.ipaUS || ""),
    [ipaUK, setIPAUK] = useState(initialUnit?.ipaUK || ""),
    [neutralIPA, setNeutralIPA] = useState(initialUnit?.ipa || ""),
    [collocations, setCollocations] = useState(
      initialUnit?.collocations.join("; ") || "",
    ),
    [target, setTarget] = useState(
      initialUnit?.clozeSpec?.target || entry?.lemma || initial,
    ),
    [expected, setExpected] = useState(
      initialUnit?.clozeSpec?.expectedAnswer || entry?.lemma || initial,
    ),
    [forms, setForms] = useState(
      initialUnit?.clozeSpec?.acceptedForms.join("; ") || "",
    ),
    [audioUS, setAudioUS] = useState(initialUnit?.audioUS || ""),
    [audioUK, setAudioUK] = useState(initialUnit?.audioUK || ""),
    [attribution, setAttribution] = useState(
      initialUnit?.audioAttribution || "",
    );
  const split = (text: string) =>
    text
      .split(";")
      .map((x) => x.trim())
      .filter(Boolean);
  function load(id: string) {
    if (!canonical) return;
    const unit = learningUnits([canonical]).find((u) => u.id === id)!;
    setSelected(id);
    setNewEntry(false);
    setNewGroup(false);
    setDefinition(unit.easyDefinition);
    setChinese(unit.chineseDefinition);
    setExample(unit.examples[0] || "");
    setPos(unit.partOfSpeech);
    setEntryLabel(
      canonical.entries.find((e) => e.entryId === unit.lexicalEntryId)?.label ||
        "",
    );
    setIPAUS(unit.ipaUS);
    setIPAUK(unit.ipaUK);
    setNeutralIPA(unit.ipa);
    setCollocations(unit.collocations.join("; "));
    setTarget(unit.clozeSpec?.target || word);
    setExpected(unit.clozeSpec?.expectedAnswer || word);
    setForms(unit.clozeSpec?.acceptedForms.join("; ") || "");
    setAudioUS(unit.audioUS);
    setAudioUK(unit.audioUK);
    setAttribution(unit.audioAttribution);
  }
  async function save() {
    setSaving(true);
    try {
      let draft = manualEntry(
        word,
        definition,
        example,
        note,
        ["Personal vocabulary"],
        tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      );
      draft.partOfSpeech = pos.trim();
      draft.ipaUS = ipaUS.trim();
      draft.ipaUK = ipaUK.trim();
      draft.ipa = neutralIPA.trim();
      draft.collocations = split(collocations);
      draft.chineseDefinition = chinese.trim();
      draft.chineseSource = chinese.trim() ? "User supplied Chinese hint" : "";
      draft.audioUS = audioUS.trim();
      draft.audioUK = audioUK.trim();
      draft.audioAttribution = attribution.trim();
      if (
        [draft.audioUS, draft.audioUK].some(
          (url) => url && !/^https:\/\//.test(url),
        )
      )
        throw Error("Recording URLs must use HTTPS.");
      if ((draft.audioUS || draft.audioUK) && !draft.audioAttribution)
        throw Error(
          "Provide recording author, source and licence attribution.",
        );
      draft = hydrateWord(draft);
      draft.entries[0].label = entryLabel.trim();
      const preferred = draft.entries[0].learningGroups[0];
      preferred.cloze = {
        sentence: example.trim(),
        target: target.trim() || word.trim(),
        expectedAnswer: expected.trim() || word.trim(),
        acceptedForms: split(forms),
      };
      if (!example.trim()) preferred.cloze.sentence = "";
      if (canonical) {
        const current = learningUnits([canonical]).find(
            (u) => u.id === selected,
          )!,
          selectedEntry = canonical.entries.find(
            (e) => e.entryId === current.lexicalEntryId,
          )!;
        const staleChinese =
          current.chineseSource.includes("Lexigrove") &&
          definition !== current.easyDefinition &&
          chinese === current.chineseDefinition;
        if (staleChinese) {
          preferred.chineseDefinition = "";
          preferred.chineseSource = "";
        }
        if (newEntry || newGroup) {
          if (newGroup) draft.entries[0].entryId = selectedEntry.entryId;
          const child = draft.entries[0];
          if (newGroup) {
            child.pronunciations.forEach(
              (p) => (p.lexicalEntryId = child.entryId),
            );
            child.senses.forEach((p) => (p.lexicalEntryId = child.entryId));
            child.learningGroups.forEach(
              (p) => (p.lexicalEntryId = child.entryId),
            );
          }
          draft = mergeLexicon(canonical, draft);
        } else {
          const child = canonical.entries.find(
              (e) => e.entryId === current.lexicalEntryId,
            )!,
            group = child.learningGroups.find(
              (g) => g.learningSenseId === selected,
            )!;
          child.partOfSpeech = pos.trim();
          child.label = entryLabel.trim();
          const newIds = draft.entries[0].pronunciations.map((p) => {
            const existing = child.pronunciations.find(
              (v) =>
                v.locale === p.locale &&
                v.ipa === p.ipa &&
                v.audioURL === p.audioURL &&
                v.audioAttribution === p.audioAttribution,
            );
            if (existing) return existing;
            const created = {
              ...p,
              lexicalEntryId: child.entryId,
              pronunciationId: crypto.randomUUID(),
            };
            child.pronunciations.push(created);
            return created;
          }); // # Preserve historical variants and reuse an unchanged pronunciation.
          let first = child.senses.find(
            (s) => s.senseId === group.dictionarySenseIds[0],
          );
          const dictionaryIds = [...group.dictionarySenseIds];
          if (
            first &&
            child.learningGroups.some(
              (g) =>
                g.learningSenseId !== selected &&
                g.dictionarySenseIds.includes(first!.senseId),
            )
          ) {
            first = { ...first, senseId: crypto.randomUUID() };
            child.senses.push(first);
            dictionaryIds[0] = first.senseId;
          } // # Editing one learning group must not rewrite a shared dictionary sense used by another group.
          if (first) {
            first.easyDefinition = definition;
            first.fullDefinition = definition;
            first.examples = example ? [example] : [];
            first.collocations = split(collocations);
          }
          Object.assign(group, preferred, {
            learningSenseId: selected,
            lexicalEntryId: child.entryId,
            pronunciationIds: newIds.map((p) => p.pronunciationId),
            dictionarySenseIds: dictionaryIds,
          });
          draft = {
            ...canonical,
            note,
            tags: draft.tags,
            updatedAt: Date.now(),
            sourceTags: [...new Set([...canonical.sourceTags, "User edited"])],
            exampleSource: "User supplied example; not a source quotation",
          };
        }
        draft = syncPrimary(draft);
        await db.transaction("rw", db.words, db.progress, async () => {
          await db.words.put(draft);
          for (const unit of learningUnits([draft])) {
            const saved = await db.progress.get(unit.id);
            if (!saved)
              await db.progress.add({
                ...freshProgress(unit.id),
                ...senseIdentity(unit),
              });
            else if (unit.id === selected)
              await db.progress.update(unit.id, {
                revision: saved.revision + 1,
              });
          }
        });
        notify(
          staleChinese
            ? "Word saved. Update the Chinese hint for this changed English sense."
            : "Word saved.",
        );
      } else {
        await addWord(draft);
        notify("Word saved.");
      }
      onClose();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal title={entry ? "Edit word" : "Add a word"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label className="field">
          Word
          <input
            value={word}
            readOnly={!!entry}
            required
            maxLength={120}
            onChange={(e) => setWord(e.target.value)}
            autoFocus
          />
        </label>
        {canonical && (
          <>
            <label className="field">
              Edit learning meaning
              <select
                aria-label="Edit learning meaning"
                value={selected}
                onChange={(e) => load(e.target.value)}
              >
                {learningUnits([canonical]).map((u) => (
                  <option value={u.id} key={u.id}>
                    {u.partOfSpeech || "Unspecified"} ·{" "}
                    {u.easyDefinition || "No definition"}
                  </option>
                ))}
              </select>
            </label>
            <div className="actions wrap">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setNewEntry(true);
                  setNewGroup(false);
                  setDefinition("");
                  setChinese("");
                  setExample("");
                  setPos("");
                  setEntryLabel("");
                  setIPAUS("");
                  setIPAUK("");
                  setNeutralIPA("");
                  setAudioUS("");
                  setAudioUK("");
                  setAttribution("");
                  setCollocations("");
                  setTarget(word);
                  setExpected(word);
                  setForms(""); // # A new entry starts without the previous meaning's example or collocations.
                }}
              >
                Add lexical entry
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  load(selected);
                  setNewGroup(true);
                  setNewEntry(false);
                  setDefinition("");
                  setChinese("");
                  setExample("");
                  setCollocations("");
                  setTarget(word);
                  setExpected(word);
                  setForms("");
                }}
              >
                Add learning meaning
              </button>
            </div>
            {(newEntry || newGroup) && (
              <p className="subtle">
                Saving adds a new {newEntry ? "entry" : "learning meaning"};
                existing progress is retained.
              </p>
            )}
          </>
        )}
        <label className="field">
          Part of speech
          <input
            aria-label="Part of speech"
            readOnly={newGroup}
            value={pos}
            onChange={(e) => setPos(e.target.value)}
            placeholder="noun, verb, adjective…"
            maxLength={100}
          />
        </label>
        <label className="field">
          English definition
          <textarea
            value={definition}
            maxLength={20000}
            onChange={(e) => setDefinition(e.target.value)}
            rows={2}
          />
        </label>
        <label className="field chinese-field">
          中文释义（可选）
          <textarea
            value={chinese}
            maxLength={20000}
            onChange={(e) => setChinese(e.target.value)}
            rows={2}
            lang="zh-CN"
            placeholder="与上面的英文义项保持一致"
          />
        </label>
        <label className="field">
          Example sentence
          <input
            value={example}
            maxLength={20000}
            onChange={(e) => setExample(e.target.value)}
            placeholder="Include the word or configure its inflected cloze target"
          />
        </label>
        <details className="entry-edit-details">
          <summary>Pronunciation, cloze and collocations</summary>
          <label className="field">
            Entry label
            <input
              value={entryLabel}
              onChange={(e) => setEntryLabel(e.target.value)}
              placeholder="Distinguish homonyms or pronunciation groups"
            />
          </label>
          <label className="field">
            UK IPA
            <input value={ipaUK} onChange={(e) => setIPAUK(e.target.value)} />
          </label>
          <label className="field">
            US IPA
            <input value={ipaUS} onChange={(e) => setIPAUS(e.target.value)} />
          </label>
          <label className="field">
            Unlabelled IPA
            <input
              value={neutralIPA}
              onChange={(e) => setNeutralIPA(e.target.value)}
            />
          </label>
          <label className="field">
            Cloze target in example
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={word}
            />
          </label>
          <label className="field">
            Expected cloze answer
            <input
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              placeholder={word}
            />
          </label>
          <label className="field">
            Accepted cloze forms
            <input
              value={forms}
              onChange={(e) => setForms(e.target.value)}
              placeholder="Separate with semicolons"
            />
          </label>
          <label className="field">
            Collocations
            <input
              value={collocations}
              onChange={(e) => setCollocations(e.target.value)}
              placeholder="Separate with semicolons"
            />
          </label>
          <label className="field">
            UK recording URL
            <input
              value={audioUK}
              onChange={(e) => setAudioUK(e.target.value)}
              type="url"
            />
          </label>
          <label className="field">
            US recording URL
            <input
              value={audioUS}
              onChange={(e) => setAudioUS(e.target.value)}
              type="url"
            />
          </label>
          <label className="field">
            Recording source, author and licence
            <textarea
              value={attribution}
              onChange={(e) => setAttribution(e.target.value)}
              rows={2}
            />
          </label>
        </details>
        <label className="field">
          Personal note
          <textarea
            value={note}
            maxLength={20000}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </label>
        <label className="field">
          Tags
          <input
            value={tags}
            maxLength={1000}
            onChange={(e) => setTags(e.target.value)}
            placeholder="reading, hydrology"
          />
        </label>
        <p className="subtle">
          Existing words gain a deck membership and keep their progress. A
          definition and matching example are needed before study.
        </p>
        <button
          className="primary"
          disabled={saving || !word.trim()}
          type="submit"
        >
          Save word
        </button>
      </form>
    </Modal>
  );
}
type Props = {
  words: Lexical[];
  progress: Progress[];
  showChinese: boolean;
  view: "all" | "personal" | "difficult";
  dictionary: (s: string) => void;
  onAdd: () => void;
  onImport: () => void;
  onPractice: (ids: string[]) => void;
  notify: (s: string) => void;
};
export default function Vocabulary({
  words,
  progress,
  showChinese,
  view,
  dictionary,
  onAdd,
  onImport,
  onPractice,
  notify,
}: Props) {
  const [query, setQuery] = useState(""),
    [deck, setDeck] = useState("All decks"),
    [state, setState] = useState("All states"),
    [reset, setReset] = useState<Lexical | null>(null);
  const states = (w: Lexical) => wordProgress(w, progress).states;
  const representative = (w: Lexical) => {
    const all = states(w),
      active = all.filter((p) => !p.known && !p.suspended);
    return (
      active.find(difficult) ||
      active.find((p) => p.card && p.card.due.getTime() <= Date.now()) ||
      active.find((p) => p.introduced && !p.card) ||
      active.find((p) => !p.card) ||
      active[0] ||
      all[0]
    );
  }; // # A learned primary meaning cannot hide another meaning that still needs attention.
  const updateAll = async (w: Lexical, patch: Partial<Progress>) =>
    db.transaction("rw", db.progress, async () => {
      for (const p of states(w))
        await db.progress.update(p.id, { ...patch, revision: p.revision + 1 });
    });
  const filtered = words
    .filter(
      (w) =>
        (view !== "personal" || w.decks.includes("Personal vocabulary")) &&
        (view !== "difficult" || states(w).some(difficult)),
    )
    .filter(
      (w) =>
        (deck === "All decks" || w.decks.includes(deck)) &&
        (state === "All states" ||
          states(w).some((p) => learningState(p) === state)),
    )
    .filter((w) =>
      [
        w.lemma,
        ...learningUnits([w]).flatMap((u) => [
          u.partOfSpeech,
          u.easyDefinition,
          u.chineseDefinition,
        ]),
        ...w.decks,
        ...w.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => a.lemma.localeCompare(b.lemma));
  const title =
    view === "personal"
      ? "Personal words"
      : view === "difficult"
        ? "A little extra care"
        : "Your vocabulary";
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>{filtered.length} words</p>
        </div>
        <div className="actions">
          <button className="secondary" onClick={onImport}>
            <Upload size={16} />
            Import
          </button>
          <button className="primary" onClick={onAdd}>
            <Plus size={17} />
            Add word
          </button>
        </div>
      </div>
      <div className="table-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Search vocabulary"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search words, meanings, tags…"
          />
        </label>
        <select
          aria-label="Filter deck"
          value={deck}
          onChange={(e) => setDeck(e.target.value)}
        >
          {["All decks", ...new Set(words.flatMap((w) => w.decks))].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select
          aria-label="Filter learning state"
          value={state}
          onChange={(e) => setState(e.target.value)}
        >
          {[
            "All states",
            "New",
            "Learning",
            "Learned",
            "Review",
            "Relearning",
            "Mature",
            "Known",
            "Suspended",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {filtered.length ? (
        <div className="vocabulary-table">
          <div className="vocabulary-row table-head">
            <span>WORD</span>
            <span>MEANING</span>
            <span>STATE</span>
            <span>OPTIONS</span>
          </div>
          {filtered.map((w) => {
            const p = representative(w),
              summary = wordProgress(w, progress);
            return (
              <div className="vocabulary-row" key={w.id}>
                <button
                  className="word-cell"
                  onClick={() => dictionary(w.lemma)}
                >
                  <strong>{w.lemma}</strong>
                  <span>
                    {[
                      ...new Set(
                        hydrateWord(w).entries.map((e) => e.partOfSpeech),
                      ),
                    ]
                      .filter(Boolean)
                      .join(" / ") || "Personal entry"}
                  </span>
                </button>
                <button
                  className="meaning-cell"
                  onClick={() => dictionary(w.lemma)}
                >
                  <span className="english-meaning">
                    {w.easyDefinition || "Add a definition to study"}
                  </span>
                  {showChinese && w.chineseDefinition && (
                    <span className="chinese-meaning" lang="zh-CN">
                      {w.chineseDefinition}
                    </span>
                  )}
                </button>
                <span
                  className={`state-chip state-${learningState(p).toLowerCase()}`}
                >
                  {learningState(p)}
                  {summary.total > 1 && (
                    <small>
                      {" "}
                      · {summary.acquired}/{summary.total} meanings
                    </small>
                  )}
                </span>
                <div className="row-actions">
                  <button
                    className="icon-button"
                    aria-label={`Favorite ${w.lemma}`}
                    onClick={() => p && updateAll(w, { favorite: !p.favorite })}
                  >
                    <Star
                      size={16}
                      fill={p?.favorite ? "currentColor" : "none"}
                    />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`${p?.suspended ? "Resume" : "Suspend"} ${w.lemma}`}
                    onClick={() =>
                      p && updateAll(w, { suspended: !p.suspended })
                    }
                  >
                    {p?.suspended ? <Play size={16} /> : <Pause size={16} />}
                  </button>
                  {view === "difficult" && (
                    <button
                      className="icon-button"
                      aria-label={`Reset ${w.lemma}`}
                      onClick={() => setReset(w)}
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty
          title={
            view === "difficult"
              ? "No difficult words right now."
              : "No words found."
          }
        >
          {view === "personal" && (
            <button className="primary" onClick={onAdd}>
              Add your first word
            </button>
          )}
        </Empty>
      )}
      {view === "difficult" && filtered.length > 0 && (
        <div className="page-footer">
          <button
            className="primary"
            onClick={() =>
              onPractice(
                filtered
                  .filter((w) => states(w).some((p) => !p.suspended))
                  .map((w) => w.id),
              )
            }
          >
            Practice these words
          </button>
          <span className="subtle">
            Extra practice leaves FSRS dates unchanged.
          </span>
        </div>
      )}
      {reset && (
        <Confirm
          title={`Reset ${reset.lemma}?`}
          danger
          onClose={() => setReset(null)}
          onConfirm={() =>
            Promise.all(learningUnits([reset]).map((u) => resetProgress(u.id)))
              .then(() => {
                setReset(null);
                notify("Learning reset. Historical attempts are preserved.");
              })
              .catch((e) => notify(e.message))
          }
        >
          This clears its acquisition and schedule. Historical attempts and
          earned world milestones stay saved.
        </Confirm>
      )}
    </>
  );
}
