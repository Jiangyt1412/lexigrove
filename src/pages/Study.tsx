import { useEffect, useRef, useState } from "react"; // # Hold the visible task through feedback while database writes commit.
import {
  ArrowRight,
  Check,
  ArrowLeft,
  Headphones,
  BookOpen,
  TextCursorInput,
} from "../components/PixelIcons";
import type {
  Lexical,
  Progress,
  Session,
  Settings,
  Attempt,
} from "../types/model";
import { normalize } from "../types/model";
import {
  nextTask,
  submitTask,
  deferAudioTask,
  cloze,
  dueWords,
  type Task,
} from "../learning/engine";
import { pronounce, speechAvailable } from "../speech/speech";
import { Definition, Empty } from "../components/ui";
import { characterDiff } from "../utils/diff";
import { Pronunciation } from "../components/Pronunciation"; // # Hide all spelling and IPA inside listening prompts.
import { hydrateWord } from "../vocabulary/lexicon"; // # Family links open their own lexical entries instead of borrowing the current word's POS.
type Props = {
  words: Lexical[];
  progress: Progress[];
  session?: Session;
  settings: Settings;
  dictionary: (word: string) => void;
  onExit: () => void;
  notify: (message: string) => void;
};
export default function Study({
  words,
  progress,
  session,
  settings,
  dictionary,
  onExit,
  notify,
}: Props) {
  const [task, setTask] = useState<Task | null>(null),
    [answer, setAnswer] = useState(""),
    [result, setResult] = useState<Attempt | null>(null),
    [heard, setHeard] = useState(false),
    [playedPronunciation, setPlayedPronunciation] = useState<string | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [full, setFull] = useState(!settings.easyDefault);
  const input = useRef<HTMLInputElement>(null),
    next = useRef<HTMLButtonElement>(null),
    lock = useRef(false);
  const token = useRef(crypto.randomUUID());
  const [voiceTick, setVoiceTick] = useState(0);
  useEffect(() => {
    if (typeof speechSynthesis === "undefined") return;
    const update = () => setVoiceTick((n) => n + 1);
    speechSynthesis.addEventListener("voiceschanged", update);
    return () => speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);
  useEffect(() => {
    if (!task && session)
      setTask(nextTask(session, words, progress, speechAvailable()));
  }, [task, session, words, progress, voiceTick]);
  useEffect(() => {
    if (task && session && task.sessionToken !== session.token) {
      setTask(null);
      setAnswer("");
      setResult(null);
      setHeard(false);
      token.current = crypto.randomUUID();
    }
  }, [task, session]);
  useEffect(() => {
    if (result) next.current?.focus();
    else input.current?.focus();
  }, [task, result]);
  async function submit() {
    if (!task || lock.current || !answer.trim()) return;
    lock.current = true;
    setBusy(true);
    try {
      const saved = await submitTask(
        task,
        answer,
        token.current,
        heard,
        Date.now(),
        playedPronunciation,
      );
      setResult(saved);
      if (saved.correct && settings.autoPronounce)
        void pronounce(task.word, settings).catch((e) => notify(e.message));
    } catch (e) {
      notify((e as Error).message);
      setTask(null);
      setAnswer("");
      setHeard(false);
      token.current = crypto.randomUUID();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function advance() {
    setTask(null);
    setAnswer("");
    setResult(null);
    setHeard(false);
    setPlayedPronunciation(null);
    setFull(!settings.easyDefault);
    token.current = crypto.randomUUID();
  }
  async function deferAudio() {
    if (!task || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await deferAudioTask(task); // # Only the current session may move its queue.
      advance();
    } catch (e) {
      notify((e as Error).message);
      advance(); // # Discard the obsolete prompt and load the current saved task.
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!session)
    return (
      <Empty title="Choose a study session">
        <button className="primary" onClick={onExit}>
          Back to today
        </button>
      </Empty>
    );
  if (!task && session.mode === "acquire" && dueWords(progress).length)
    return (
      <Empty title="Your reviews are ready.">
        <p>
          Finish the due reviews, then continue these new words. Your
          acquisition is saved.
        </p>
        <button className="primary" onClick={onExit}>
          Back to reviews
        </button>
      </Empty>
    );
  if (!task) {
    const pending =
      session.mode === "acquire" &&
      session.wordIds.some((id) => !progress.find((p) => p.id === id)?.card);
    return (
      <div className="session-complete">
        <div className="completion-mark">
          <Check size={36} />
        </div>
        <h1>{pending ? "Acquisition is saved." : "A little more learned."}</h1>
        <p>
          {pending
            ? "Add a second dictionary word to keep recall tests interleaved."
            : `${session.completed} attempts saved. You can return whenever you’re ready.`}
        </p>
        <button className="primary" onClick={onExit}>
          Back to your grove <ArrowRight size={17} />
        </button>
      </div>
    );
  }
  const { word, mode, modality } = task;
  const showingWord = modality === "copy";
  const revealed = showingWord || result !== null; // # Reading material is shown only during introduction or after an answer is saved.
  const icon =
    modality === "audio" ? (
      <Headphones size={19} />
    ) : modality === "cloze" ? (
      <TextCursorInput size={19} />
    ) : (
      <BookOpen size={19} />
    );
  const label =
    mode === "intro"
      ? "Meet a new word"
      : mode === "practice"
        ? "Recall break"
        : modality === "audio"
          ? "Listen & spell"
          : modality === "cloze"
            ? "Complete the sentence"
            : "Recall the word";
  const diff =
    result && !result.correct
      ? characterDiff(normalize(task.expectedAnswer), normalize(answer))
      : null;
  return (
    <div className="study-page">
      <div className="study-top">
        <button className="text-button" onClick={onExit}>
          <ArrowLeft size={17} />
          Save & leave
        </button>
        <span>
          {session.completed} attempts ·{" "}
          {session.mode === "review" ? "Spaced review" : "Acquisition"}
        </span>
      </div>
      <div className="study-progress" aria-hidden="true">
        <span
          style={{
            width: `${Math.min(
              100,
              (session.mode === "acquire"
                ? session.wordIds.reduce((n, id) => {
                    const p = progress.find((p) => p.id === id);
                    return n + (p?.introduced ? 1 : 0) + (p?.stage ?? 0);
                  }, 0) / Math.max(1, session.wordIds.length * 4)
                : session.completed / Math.max(1, session.wordIds.length)) *
                100,
            )}%`,
          }}
        />
      </div>
      <div className="study-focus">
        <div className="study-label">
          {icon}
          {label}
          {mode === "acquisition" && <span>{task.progress.stage + 1} / 3</span>}
        </div>
        {mode === "practice" && (
          <p className="subtle">
            An unscheduled break between tests. This does not change review
            dates.
          </p>
        )}
        {revealed ? (
          <>
            <div className="target-line">
              <div className="word-heading">
                <h1 className="target-word">{word.lemma}</h1>
              </div>
              <div className="study-phonetics">
                <span className="word-meta">
                  {word.partOfSpeech || "Unspecified part of speech"}
                </span>
                {!word.ipaUS && !word.ipaUK && word.ipa && (
                  <span
                    className="neutral-ipa"
                    title="Dictionary phonetic transcription"
                  >
                    {word.ipa}
                  </span>
                )}
                <Pronunciation
                  key={word.id}
                  word={word}
                  settings={settings}
                  notify={notify}
                />
              </div>
            </div>
            <section className="study-meaning" aria-label="Translation">
              <p className="learning-definition">
                <Definition text={word.easyDefinition} onWord={dictionary} />
              </p>
              {settings.showChinese && word.chineseDefinition && (
                <p className="chinese-meaning" lang="zh-CN">
                  {word.chineseDefinition}
                </p>
              )}
            </section>
            <section className="study-example" aria-label="Example sentence">
              <span className="reading-label">Example</span>
              <blockquote>{word.examples[0] || "暂无例句"}</blockquote>
            </section>
            {!!word.collocations.length && (
              <section className="study-collocations" aria-label="Collocations">
                <span className="reading-label">Collocations</span>
                <div className="chips">
                  {word.collocations.map((c) => (
                    <span className="chip" key={c}>
                      {c}
                    </span>
                  ))}
                </div>
              </section>
            )}
            <section className="study-family" aria-label="Word family">
              <div className="family-heading">
                <span className="reading-label">Word family</span>
                {word.wordFamilySource && (
                  <a
                    href={word.wordFamilySource}
                    target="_blank"
                    rel="noreferrer"
                  >
                    来源 ↗
                  </a>
                )}
              </div>
              {word.familyLinks.length ? (
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
                        : "";
                    return (
                      <button
                        key={link.normalizedLemma}
                        className="chip"
                        onClick={() => dictionary(link.lemma)}
                      >
                        {link.lemma}
                        {pos && <span className="family-pos">{pos}</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="family-empty">暂无已核实的词形家族</p>
              )}
            </section>
            {word.fullDefinitions.length > 1 && (
              <>
                <button className="text-button" onClick={() => setFull(!full)}>
                  {full ? "Less" : "More in this learning group"}
                </button>
                {full &&
                  word.fullDefinitions
                    .filter((d) => d !== word.easyDefinition)
                    .map((d, i) => (
                      <p key={i}>
                        <Definition text={d} onWord={dictionary} />
                      </p>
                    ))}
              </>
            )}
            {word.note && <p className="personal-note">{word.note}</p>}
          </>
        ) : modality === "audio" ? (
          <div className="listen-prompt">
            <Pronunciation
              key={`${word.id}-${task.sequence}`}
              word={word}
              settings={settings}
              notify={notify}
              listening
              onPlayed={(id) => {
                setHeard(true);
                setPlayedPronunciation(id || null);
              }}
            />
            <p className="audio-scope">
              Audio → spelling checks the spoken form, not meaning
              discrimination.
            </p>
            {!speechAvailable() && (
              <p className="subtle">
                An English system voice is required. This test stays pending
                until audio is available.
              </p>
            )}
          </div>
        ) : (
          <>
            <h2 className="recall-prompt">
              {modality === "cloze"
                ? cloze(
                    word.clozeSpec?.sentence ||
                      word.examples.find((e) => cloze(e, word.lemma) !== e) ||
                      "",
                    word.clozeSpec?.target || word.lemma,
                  )
                : word.easyDefinition}
            </h2>
            <span className="word-meta">{word.partOfSpeech}</span>
          </>
        )}
        {!result ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label className="field answer-label">
              {showingWord ? "Type the word once" : "Your answer"}
              <input
                ref={input}
                className="answer-input"
                value={answer}
                maxLength={120}
                onChange={(e) => setAnswer(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                autoCapitalize="none"
                placeholder="Type here…"
                aria-label="Your answer"
              />
            </label>
            <div className="answer-actions">
              <span className="keyboard-hint">Enter ↵</span>
              <button
                className="primary"
                type="submit"
                disabled={
                  busy || !answer.trim() || (modality === "audio" && !heard)
                }
              >
                Check answer <ArrowRight size={17} />
              </button>
            </div>
          </form>
        ) : (
          <div
            className={`answer-result ${result.correct ? "correct" : "incorrect"}`}
            aria-live="polite"
          >
            <div className="result-label">
              {result.correct ? (
                <>
                  <Check size={20} />
                  Correct
                </>
              ) : (
                <>Let’s give this word another try.</>
              )}
            </div>
            {diff && (
              <>
                <div className="diff-line">
                  <span>Your answer</span>
                  <div>
                    {diff.actual.map((p, i) =>
                      p.different ? (
                        <del key={i}>{p.char}</del>
                      ) : (
                        <span key={i}>{p.char}</span>
                      ),
                    )}
                  </div>
                </div>
                <div className="diff-line">
                  <span>Correct spelling</span>
                  <div>
                    {diff.expected.map((p, i) =>
                      p.different ? (
                        <mark key={i}>{p.char}</mark>
                      ) : (
                        <span key={i}>{p.char}</span>
                      ),
                    )}
                  </div>
                </div>
              </>
            )}
            {!result.correct && mode === "acquisition" && (
              <p className="subtle">
                Acquisition restarts at definition recall. All attempts are
                saved.
              </p>
            )}
            {result.correct && result.after && mode === "acquisition" && (
              <p className="subtle">
                Learned. Next review: {result.after.due.toLocaleDateString()}.
              </p>
            )}
            <button ref={next} className="primary" onClick={advance}>
              Continue <ArrowRight size={17} />
            </button>
          </div>
        )}
        <div className="study-bottom">
          <button
            className="text-button"
            aria-label="Notes & entry"
            onClick={() => dictionary(word.lemma)}
            disabled={!showingWord && !result}
          >
            Other meanings · Notes
          </button>
          {modality === "audio" && !heard && (
            <button
              className="text-button"
              disabled={busy}
              onClick={() => void deferAudio()}
            >
              Save this test for later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
