import { useState } from "react"; // # One reusable dictionary sheet with a breadcrumb stack.
import { Plus, Check, ExternalLink, Star } from "../components/PixelIcons";
import {
  type Lexical,
  type Progress,
  type Settings,
  normalize,
} from "../types/model";
import { db, addWord } from "../db/database";
import { Pronunciation } from "../components/Pronunciation"; // # Both accents are available directly beside their own source IPA.
import { hydrateWord, projectSense } from "../vocabulary/lexicon"; // # All entry panels use a single projection of their selected sense.
import { Definition, Modal } from "../components/ui";
import { learningState } from "../learning/engine"; // # Current scheduling state is distinct from a permanently earned world milestone.
export function Dictionary({
  initial,
  words,
  progress,
  settings,
  onClose,
  onEdit,
  notify,
}: {
  initial: string;
  words: Lexical[];
  progress: Progress[];
  settings: Settings;
  onClose: () => void;
  onEdit: (word: string) => void;
  notify: (message: string) => void;
}) {
  const [path, setPath] = useState([initial]);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const current = path[path.length - 1];
  const raw = words.find((w) => w.normalizedWord === normalize(current));
  const canonical = raw ? hydrateWord(raw) : null;
  const entry =
    canonical?.entries.find((e) => e.entryId === selected) ||
    (canonical?.entries.length === 1 ? canonical.entries[0] : null);
  const signatures = (
    entry: NonNullable<typeof canonical>["entries"][number],
  ) =>
    new Set(
      entry.learningGroups.map((g) =>
        JSON.stringify(
          entry.pronunciations
            .filter((p) => g.pronunciationIds.includes(p.pronunciationId))
            .map((p) => [p.locale, p.ipa])
            .sort(),
        ),
      ),
    );
  const variantAmbiguous = !!entry && signatures(entry).size > 1;
  const group =
    entry?.learningGroups.find((g) => g.learningSenseId === selectedGroup) ||
    (variantAmbiguous ? null : entry?.learningGroups[0]);
  const word =
    canonical && entry && group
      ? projectSense(canonical, entry, group)
      : canonical;
  const p = progress.find((p) => p.id === group?.learningSenseId);
  const visit = (word: string) => {
    setPath([...path, word]);
    setSelected(null);
    setSelectedGroup(null);
  };
  const add = async () => {
    if (!word) return onEdit(current);
    await addWord({ ...canonical!, decks: ["Personal vocabulary"] });
    notify("Added to personal vocabulary.");
  };
  const note = async (value: string) => {
    if (word)
      await db.words.update(canonical!.id, {
        note: value,
        updatedAt: Date.now(),
      });
  };
  return (
    <Modal
      title="Dictionary"
      onClose={onClose}
      showTitle={false}
      className="dictionary-modal"
    >
      {path.length > 1 && (
        <div className="breadcrumbs">
          {path.map((word, i) => (
            <button
              key={i}
              onClick={() => {
                setPath(path.slice(0, i + 1));
                setSelected(null);
                setSelectedGroup(null);
              }}
            >
              {i > 0 ? "› " : ""}
              {word}
            </button>
          ))}
        </div>
      )}
      <div className="word-title">
        <h2>{word?.lemma ?? current}</h2>
      </div>
      {word ? (
        <>
          {canonical && canonical.entries.length > 1 && (
            <div
              className="entry-tabs"
              role="group"
              aria-label="Lexical entries"
            >
              {canonical.entries.map((e) => (
                <button
                  key={e.entryId}
                  className={`entry-tab ${entry?.entryId === e.entryId ? "selected" : ""}`}
                  aria-pressed={entry?.entryId === e.entryId}
                  onClick={() => {
                    setSelected(e.entryId);
                    setSelectedGroup(null);
                  }}
                >
                  {e.partOfSpeech || "Entry"}
                  {e.label ? ` · ${e.label}` : ""}
                </button>
              ))}
              <button
                className="entry-tab"
                onClick={() => {
                  setSelected(null);
                  setSelectedGroup(null);
                }}
              >
                All entries
              </button>
            </div>
          )}
          {(!entry || !group) && canonical ? (
            <div className="entry-overview">
              {(entry ? [entry] : canonical.entries).map((e) => (
                <section className="dictionary-entry" key={e.entryId}>
                  <h3>
                    {e.partOfSpeech} {e.label}
                  </h3>
                  {signatures(e).size > 1 ? (
                    e.learningGroups.map((g) => (
                      <div
                        className="pronunciation-meaning"
                        key={g.learningSenseId}
                      >
                        <h4>{g.label || g.preferredLearningDefinition}</h4>
                        <Pronunciation
                          word={projectSense(canonical, e, g)}
                          settings={settings}
                          notify={notify}
                        />
                        <ol className="sense-list">
                          {e.senses
                            .filter((s) =>
                              g.dictionarySenseIds.includes(s.senseId),
                            )
                            .map((s) => (
                              <li key={s.senseId}>
                                <Definition
                                  text={s.fullDefinition}
                                  onWord={visit}
                                />
                              </li>
                            ))}
                        </ol>
                        <button
                          className="text-button"
                          onClick={() => {
                            setSelected(e.entryId);
                            setSelectedGroup(g.learningSenseId);
                          }}
                        >
                          Explore {g.label || "this meaning"}
                        </button>
                      </div>
                    ))
                  ) : (
                    <>
                      <Pronunciation
                        word={projectSense(canonical, e, e.learningGroups[0])}
                        settings={settings}
                        notify={notify}
                      />
                      <ol className="sense-list">
                        {e.senses.map((s) => (
                          <li key={s.senseId}>
                            <Definition
                              text={s.fullDefinition}
                              onWord={visit}
                            />
                          </li>
                        ))}
                      </ol>
                      <button
                        className="text-button"
                        onClick={() => setSelected(e.entryId)}
                      >
                        Explore {e.partOfSpeech} {e.label}
                      </button>
                    </>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <>
              <div className="word-meta">{word.partOfSpeech}</div>
              <Pronunciation
                key={`${word.lexicalEntryId}-${word.learningSenseId}`}
                word={word}
                settings={settings}
                notify={notify}
              />
              {entry && entry.learningGroups.length > 1 && (
                <label className="sense-picker">
                  Learning meaning{" "}
                  <select
                    aria-label="Learning meaning"
                    value={group?.learningSenseId}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                  >
                    {entry.learningGroups.map((g) => (
                      <option value={g.learningSenseId} key={g.learningSenseId}>
                        {g.label || g.preferredLearningDefinition} ·{" "}
                        {entry.pronunciations
                          .filter((p) =>
                            g.pronunciationIds.includes(p.pronunciationId),
                          )
                          .map((p) => p.ipa)
                          .filter(Boolean)
                          .join(" / ")}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p className="sense-progress">
                {learningState(p)} · This learning meaning
              </p>
              <p className="dictionary-definition">
                <Definition
                  text={word.easyDefinition || "No definition saved."}
                  onWord={visit}
                />
              </p>
              {settings.showChinese && word.chineseDefinition && (
                <p className="chinese-meaning" lang="zh-CN">
                  {word.chineseDefinition}
                </p>
              )}
              {entry && (
                <ol className="sense-list" aria-label="Dictionary meanings">
                  {entry.senses
                    .filter(
                      (s) =>
                        (!variantAmbiguous ||
                          group?.dictionarySenseIds.includes(s.senseId)) &&
                        s.fullDefinition !== word.easyDefinition,
                    )
                    .map((s) => (
                      <li key={s.senseId}>
                        <Definition text={s.fullDefinition} onWord={visit} />
                      </li>
                    ))}
                </ol>
              )}
              {word.examples.map((e, i) => (
                <blockquote key={i}>{e}</blockquote>
              ))}
              {!!word.collocations.length && (
                <div className="detail-section">
                  <h3>Collocations</h3>
                  <div className="chips">
                    {word.collocations.map((c) => (
                      <span key={c} className="chip">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {!!word.wordFamily.length && (
                <div className="detail-section">
                  <h3>Word family</h3>
                  {word.wordFamilySource && (
                    <a
                      className="family-source"
                      href={word.wordFamilySource}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Wiktionary source ↗
                    </a>
                  )}
                  <div className="chips">
                    {word.familyLinks.map((link) => {
                      const target = words.find(
                          (w) => w.normalizedWord === link.normalizedLemma,
                        ),
                        pos = target
                          ? [
                              ...new Set(
                                hydrateWord(target).entries.map(
                                  (e) => e.partOfSpeech,
                                ),
                              ),
                            ]
                              .filter(Boolean)
                              .join(" / ")
                          : ""; // # Labels use the linked entry's stored POS; an unknown relative is never assigned a guessed POS.
                      return (
                        <button
                          key={link.normalizedLemma}
                          className="chip"
                          onClick={() => visit(link.lemma)}
                        >
                          {link.lemma}
                          {pos && <span className="family-pos">{pos}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
          <label className="field">
            Personal note
            <textarea
              key={word.id}
              defaultValue={word.note}
              onBlur={(e) =>
                note(e.target.value).catch((e) => notify(e.message))
              }
              placeholder="A connection, context, or reminder…"
              rows={2}
            />
          </label>
          <div className="actions wrap">
            <button
              className="primary"
              onClick={() => add().catch((e) => notify(e.message))}
            >
              <Plus size={17} />
              Learn this word
            </button>
            <button
              className="secondary"
              disabled={!group || !!p?.card}
              onClick={() => {
                if (p)
                  void db.progress.update(p.id, {
                    known: !p.known,
                    revision: p.revision + 1,
                  });
              }}
            >
              <Check size={16} />
              {p?.known ? "Mark as new" : "I know this word"}
            </button>
            <button
              className="icon-button"
              disabled={!group}
              aria-label={p?.favorite ? "Unfavorite word" : "Favorite word"}
              onClick={() => {
                if (p) void db.progress.update(p.id, { favorite: !p.favorite });
              }}
            >
              <Star size={19} fill={p?.favorite ? "currentColor" : "none"} />
            </button>
          </div>
          <button className="text-button" onClick={() => onEdit(word.lemma)}>
            Edit definition & example
          </button>
          <details className="source-details">
            <summary>Source & licence</summary>
            {word.chineseDefinition && (
              <p lang="zh-CN">
                中文：{word.chineseSource || "用户提供"}。仅对应当前英文释义。
              </p>
            )}
            {word.sourceUrl ? (
              <p>
                <a href={word.sourceUrl} target="_blank" rel="noreferrer">
                  {word.sourceUrl.startsWith("https://en.wiktionary.org/")
                    ? "Wiktionary contributors"
                    : "Dictionary source"}{" "}
                  <ExternalLink size={12} />
                </a>{" "}
                {word.sourceTags.some((tag) => tag.includes("Kaikki"))
                  ? "via Kaikki · "
                  : "· "}
                {word.sourceLicence.includes("CC BY-SA 4.0") ? (
                  <a
                    href="https://creativecommons.org/licenses/by-sa/4.0/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {word.sourceLicence}
                  </a>
                ) : (
                  word.sourceLicence
                )}
                {". "}
                {word.exampleSource || "Example attribution not supplied."}
                {word.sourceTags.includes("User edited") &&
                  " Entry edited by you; original source attribution retained."}
              </p>
            ) : (
              <p>{word.sourceLicence}</p>
            )}
          </details>
        </>
      ) : (
        <>
          <p>This word is not in your offline dictionary yet.</p>
          <button className="primary" onClick={() => onEdit(current)}>
            <Plus size={17} />
            Create a personal entry
          </button>
        </>
      )}
    </Modal>
  );
}
