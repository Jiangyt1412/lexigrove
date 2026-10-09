import { useEffect, useRef, useState } from "react"; // # Hold the visible task through feedback while database writes commit.
import {
  ArrowRight,
  Check,
  ArrowLeft,
  Headphones,
  BookOpen,
  TextCursorInput,
  Sprout,
  Star,
  X,
} from "../components/PixelIcons";
import type {
  Lexical,
  Progress,
  Session,
  Settings,
  Attempt,
  RecognitionChoice,
} from "../types/model";
import { normalize } from "../types/model";
import {
  nextTask,
  submitTask,
  deferAudioTask,
  cloze,
  dueWords,
  selectReviewChoice,
  type Task,
} from "../learning/engine";
import {
  pronounce,
  speechAvailable,
  stopPronunciation,
  isPlaybackCancelled,
} from "../speech/speech";
import { Definition, Empty } from "../components/ui";
import { characterDiff } from "../utils/diff";
import { Pronunciation } from "../components/Pronunciation"; // # Hide all spelling and IPA inside listening prompts.
import { hydrateWord } from "../vocabulary/lexicon"; // # Family links open their own lexical entries instead of borrowing the current word's POS.
import { assetUrl } from "../utils/assets"; // # Scene assets resolve through the current root or GitHub Pages base path.
import { resolveSeason } from "../world/environment"; // # Environmental changes remain independent of learning records.
import { PixelResident } from "../components/PixelResident"; // # Detailed frame animation stays outside the lexical reading surface.
import { NotebookDecor } from "../components/NotebookDecor";
import { WorldSprite } from "../world/CoastalWorld";
import { Dictionary } from "../dictionary/Dictionary"; // # Confirmation uses the same readable details and the exact scheduled learning meaning.

function StudyRoom({
  settings,
  feedback,
  review,
  matureResidents,
}: {
  settings: Settings;
  feedback?: Attempt | null;
  review: boolean;
  matureResidents: number;
}) {
  return (
    <div
      className={`study-room ${review ? "review-aquarium-room" : "learning-wood-room"}`}
      aria-hidden="true"
      data-visible={settings.world !== "off"}
      data-mature-residents={review ? matureResidents : undefined}
    >
      <img
        className="study-room-art"
        src={assetUrl(
          `assets/reference/${review ? "aquarium-v1" : "study-room-v2"}.webp`,
        )}
        alt=""
      />
      <div className="room-light" />
      {review ? (
        <>
          <div className="review-water-life">
            {Array.from(
              {
                length: Math.min(
                  8,
                  matureResidents ? Math.ceil(Math.sqrt(matureResidents)) : 0,
                ),
              },
              (_, i) => (
                <WorldSprite
                  key={i}
                  name={i % 2 ? "reef-fish" : "fish"}
                  className="study-room-motion review-fish"
                  style={{
                    left: `${8 + ((i * 7) % 20)}%`,
                    top: `${23 + ((i * 13) % 35)}%`,
                    animationDelay: `-${i * 2.7}s`,
                  }}
                />
              ),
            )}
            {[0, 1, 2, 3, 4].map((i) => (
              <i
                key={i}
                className="study-room-motion review-air-bubble"
                style={{
                  left: `${8 + i * 6}%`,
                  top: `${36 + ((i * 11) % 29)}%`,
                  animationDelay: `-${i * 2.9}s`,
                }}
              />
            ))}
          </div>
          <PixelResident
            kind="diver"
            action={feedback?.correct ? "wave" : "idle"}
            className="review-diver"
          />
          <div className="review-mature-label">
            <span>Mature vocabulary</span>
            <strong>{matureResidents} words</strong>
          </div>
        </>
      ) : (
        <div className="room-window-air">
          <span className="study-room-motion room-window-glint" />
          {resolveSeason(settings.season) !== "winter" && (
            <PixelResident
              kind="butterfly"
              className="study-room-motion room-window-butterfly"
            />
          )}
        </div>
      )}
      <div className="room-companion">
        <PixelResident kind="cat" className="room-cat-tail" />
      </div>
      <div
        className={`study-bird ${feedback?.correct ? "bird-celebrating" : ""}`}
        key={feedback?.id ?? "quiet-bird"}
      >
        <PixelResident
          kind="bird"
          action={feedback?.correct ? "cheer" : "idle"}
        />
        {feedback?.correct && (
          <div className="bird-reward">
            <span>Nice!</span>
            <Star size={15} />
            <Star size={10} />
          </div>
        )}
      </div>
      <div className="room-season-accent" />
    </div>
  );
} // # A scheduled review uses a different aquarium room; earned residents still come only from actual progress.

const CHOICES: { value: RecognitionChoice; label: string; hint: string }[] = [
  { value: "known", label: "认识", hint: "确认后完成本次复习" },
  { value: "unsure", label: "不确定", hint: "释义输入 → 听写" },
  { value: "unknown", label: "不认识", hint: "展示抄写 → 释义输入 → 听写" },
];
type Props = {
  words: Lexical[];
  progress: Progress[];
  session?: Session;
  settings: Settings;
  dictionary: (word: string) => void;
  onExit: () => void;
  notify: (message: string) => void;
  matureResidents: number; // # The visual projection reads the earned world without touching the learning engine.
};
export default function Study({
  words,
  progress,
  session,
  settings,
  dictionary,
  onExit,
  notify,
  matureResidents,
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
  const [audioError, setAudioError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false),
    [draftChoice, setDraftChoice] = useState<RecognitionChoice | null>(null),
    [pendingAdvance, setPendingAdvance] = useState(false);
  const savedDraft = task ? session?.recall?.groups[task.word.id] : undefined;
  useEffect(() => {
    if (!task || task.modality !== "recognition" || result) return;
    if (savedDraft?.phase === "draft") {
      setDraftChoice(savedDraft.choice);
      setDetailsOpen(true);
    }
  }, [task, savedDraft?.phase, savedDraft?.choice, result]); // # Reopening a saved session restores its draft; unrelated note/settings updates do not reopen a closed sheet.
  useEffect(() => {
    if (pendingAdvance && task && session && session.completed > task.sequence)
      advance();
  }, [pendingAdvance, task, session]); // # Wait for the committed database snapshot before loading the next task.
  useEffect(() => {
    if (typeof speechSynthesis === "undefined") return;
    const update = () => setVoiceTick((n) => n + 1);
    speechSynthesis.addEventListener("voiceschanged", update);
    return () => speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);
  useEffect(() => {
    if (!task && session)
      setTask(
        nextTask(
          session,
          words,
          progress,
          words.some((w) => speechAvailable(w, settings)),
        ),
      );
  }, [task, session, words, progress, voiceTick, settings]);
  useEffect(() => {
    if (
      !task ||
      !settings.autoPronounce ||
      (!result && !["copy", "audio"].includes(task.modality))
    )
      return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void pronounce(task.word, settings, {
        strictAccent: true,
        signal: controller.signal,
      })
        .then((played) => {
          if (
            !controller.signal.aborted &&
            task.modality === "audio" &&
            !result
          ) {
            setHeard(true);
            setPlayedPronunciation(played.pronunciationId);
          }
        })
        .catch((error: Error) => {
          if (!isPlaybackCancelled(error) && !controller.signal.aborted)
            setAudioError(error.message);
        });
    }, 0); // # New-word/listening prompts play once, then every submitted answer plays once; definition/cloze prompts never disclose the target early.
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [task, result, settings]);
  useEffect(() => () => stopPronunciation(), []);
  useEffect(() => {
    if (task && session && task.sessionToken !== session.token) {
      advance();
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
    stopPronunciation();
    setTask(null);
    setAnswer("");
    setResult(null);
    setHeard(false);
    setPlayedPronunciation(null);
    setAudioError("");
    setDetailsOpen(false);
    setDraftChoice(null);
    setPendingAdvance(false);
    setFull(!settings.easyDefault);
    token.current = crypto.randomUUID();
  }
  async function choose(choice: RecognitionChoice) {
    if (!task || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await selectReviewChoice(task, choice);
      setDraftChoice(choice);
      setDetailsOpen(true);
    } catch (e) {
      notify((e as Error).message);
      advance();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function confirmChoice() {
    if (!task || !draftChoice || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      stopPronunciation();
      const saved = await submitTask(task, draftChoice, token.current);
      setResult(saved);
      setDetailsOpen(false);
      setPendingAdvance(true);
    } catch (e) {
      notify((e as Error).message);
      advance();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  } // # Only confirmation commits the chosen branch; changing draft options creates no review history.
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
      <div
        className="study-page cozy-study"
        data-season={resolveSeason(settings.season)}
        data-scene={session.mode === "review" ? "aquarium" : "study"}
      >
        <StudyRoom
          settings={settings}
          review={session.mode === "review"}
          matureResidents={matureResidents}
        />
        <div className="session-complete study-notebook">
          <div className="completion-mark">
            <Check size={36} />
          </div>
          <h1>
            {pending ? "Acquisition is saved." : "A little more learned."}
          </h1>
          <p>
            {pending
              ? "Your unfinished words are saved. Resume when you’re ready."
              : `${session.completed} attempts saved. You can return whenever you’re ready.`}
          </p>
          <button className="primary" onClick={onExit}>
            Back to your grove <ArrowRight size={17} />
          </button>
        </div>
      </div>
    );
  }
  const { word, mode, modality } = task;
  const showingWord = modality === "copy";
  const recognition = modality === "recognition";
  const revealed = showingWord || (!recognition && result !== null); // # Recognition reveals only the spelling until an option opens its details.
  const icon =
    modality === "audio" ? (
      <Headphones size={19} />
    ) : modality === "cloze" ? (
      <TextCursorInput size={19} />
    ) : (
      <BookOpen size={19} />
    );
  const label = recognition
    ? "认识这个词吗？"
    : modality === "copy" && mode === "review"
      ? "重新认识这个词"
      : mode === "intro"
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
  const stepModes =
    mode === "review"
      ? task.reviewTotal === 3
        ? ["copy", "definition", "audio"]
        : ["definition", "audio"]
      : ["copy", "definition", "audio"];
  const currentStep =
    mode === "review" ? (task.reviewStep ?? 0) : task.progress.stage;
  const stepIndex = result
    ? result.correct
      ? currentStep + 1
      : mode === "review"
        ? currentStep + 1
        : 0
    : currentStep;
  const failedStep = result && !result.correct ? currentStep : -1;
  return (
    <div
      className="study-page cozy-study"
      data-season={resolveSeason(settings.season)}
      data-scene={session.mode === "review" ? "aquarium" : "study"}
      data-feedback={
        result ? (result.correct ? "correct" : "incorrect") : "idle"
      }
    >
      <StudyRoom
        settings={settings}
        feedback={result}
        review={session.mode === "review"}
        matureResidents={matureResidents}
      />
      <NotebookDecor />
      <div className="study-notebook">
        <div className="study-top">
          <button
            className="text-button"
            onClick={() => {
              stopPronunciation();
              onExit();
            }}
          >
            <ArrowLeft size={17} />
            Save & leave
          </button>
          <span>
            {session.mode === "review"
              ? `本组复习 ${Object.values(session.recall?.groups ?? {}).filter((g) => g.phase === "complete").length} / ${session.wordIds.length}`
              : session.mode === "acquire"
                ? `本组学习 ${session.wordIds.filter((id) => progress.find((p) => p.id === id)?.card).length} / ${session.wordIds.length}`
                : `练习已完成 ${session.completed} 题`}
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
                      return n + (p?.stage ?? 0);
                    }, 0) / Math.max(1, session.wordIds.length * 3)
                  : session.mode === "review"
                    ? Object.values(session.recall?.groups ?? {}).reduce(
                        (n, g) => n + Number(g.phase === "complete"),
                        0,
                      ) / Math.max(1, session.wordIds.length)
                    : session.completed / Math.max(1, session.wordIds.length)) *
                  100,
              )}%`,
            }}
          >
            <Sprout size={15} />
          </span>
        </div>
        {session.mode === "review" && settings.world !== "off" && (
          <button
            className="aquarium-book-close"
            aria-label="Save and leave review"
            onClick={() => {
              stopPronunciation();
              onExit();
            }}
          >
            <X size={17} />
          </button>
        )}{" "}
        {/* # Keep the painted close tab outside the scrollable reading surface; it saves the same pending review as the top return control. */}
        <div className="study-focus">
          <div className="notebook-binding" aria-hidden="true" />
          {result?.correct && (
            <div
              key={result.id}
              className="notebook-success"
              aria-hidden="true"
            >
              <Sprout size={23} />
              <Star size={13} />
              <Star size={9} />
            </div>
          )}
          <div className="study-label">
            {icon}
            {label}
            {(mode === "intro" || mode === "acquisition") && (
              <span>{task.progress.stage + 1} / 3</span>
            )}
            {mode === "review" && !recognition && (
              <span>
                {(task.reviewStep ?? 0) + 1} / {task.reviewTotal ?? 2}
              </span>
            )}
          </div>
          {!recognition && mode !== "practice" && (
            <ol className="notebook-steps" aria-label="Word learning steps">
              {stepModes.map((step, i) => (
                <li
                  key={step}
                  className={
                    i === failedStep
                      ? "restarted"
                      : i < stepIndex
                        ? "completed"
                        : i === stepIndex
                          ? "current"
                          : "waiting"
                  }
                  aria-current={i === stepIndex ? "step" : undefined}
                  aria-label={`${i + 1} / ${stepModes.length} · ${step === "copy" ? "展示抄写" : step === "audio" ? "听写" : "释义输入"} · ${i === failedStep ? "未通过，记录保留" : i < stepIndex ? "已完成" : i === stepIndex ? "当前步骤" : "尚未进行"}`}
                >
                  {step === "copy" ? (
                    <Sprout size={19} />
                  ) : step === "audio" ? (
                    <Headphones size={19} />
                  ) : (
                    <BookOpen size={19} />
                  )}
                  <span>
                    {step === "copy"
                      ? "展示"
                      : step === "audio"
                        ? "听写"
                        : "释义"}
                  </span>
                  <span className="step-mark">
                    {i === failedStep ? "↺" : i < stepIndex ? "✓" : i + 1}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {mode === "practice" && (
            <p className="subtle">
              An unscheduled break between tests. This does not change review
              dates.
            </p>
          )}
          {recognition ? (
            <div className="recognition-word">
              <h1 className="target-word">{word.lemma}</h1>
            </div>
          ) : revealed ? (
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
                    onPlayed={() => setAudioError("")}
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
              <div className="notebook-extras">
                {!!word.collocations.length && (
                  <details
                    className="study-collocations notebook-disclosure"
                    aria-label="Collocations"
                  >
                    <summary>
                      <BookOpen size={15} /> Collocations
                    </summary>
                    <div className="chips">
                      {word.collocations.map((c) => (
                        <span className="chip" key={c}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </details>
                )}
                <details
                  className="study-family notebook-disclosure"
                  aria-label="Word family"
                >
                  <summary>
                    <Sprout size={15} /> Word family
                  </summary>
                  <div className="family-heading">
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
                </details>
                <button
                  type="button"
                  className="notebook-detail-tab"
                  aria-label="Notes & entry"
                  onClick={() => dictionary(word.lemma)}
                >
                  <BookOpen size={15} /> Other meanings
                </button>
              </div>
              {word.fullDefinitions.length > 1 && (
                <>
                  <button
                    className="text-button"
                    onClick={() => setFull(!full)}
                  >
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
                  setAudioError("");
                }}
              />
              <p className="audio-scope">
                Audio → spelling checks the spoken form, not meaning
                discrimination.
              </p>
              {!speechAvailable(word, settings) && (
                <p className="subtle">
                  当前口音没有可用录音或系统语音。听写会保留，点击另一口音可手动播放。
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
                  : settings.showChinese && word.chineseDefinition
                    ? word.chineseDefinition
                    : word.easyDefinition}
              </h2>
              {modality === "definition" &&
                settings.showChinese &&
                word.chineseDefinition && (
                  <p className="translation-support">{word.easyDefinition}</p>
                )}
              <span className="word-meta">{word.partOfSpeech}</span>
              {modality === "cloze" && (
                <p className="cloze-hint">
                  <Definition text={word.easyDefinition} onWord={dictionary} />
                  <br />
                  填入适合句子的词形。
                </p>
              )}
            </>
          )}
          {audioError && (
            <p className="audio-feedback" role="status">
              {audioError}
            </p>
          )}
          {recognition ? (
            <div
              className="recognition-choices"
              role="group"
              aria-label="熟悉程度"
            >
              {CHOICES.map((choice) => (
                <button
                  key={choice.value}
                  className={`recognition-option ${choice.value}`}
                  disabled={busy || pendingAdvance}
                  onClick={() => void choose(choice.value)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          ) : !result ? (
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
              {!result.correct &&
                (mode === "intro" || mode === "acquisition") && (
                  <p className="subtle">
                    学习从展示抄写重新开始，之前的记录已保存。
                  </p>
                )}
              {result.correct && result.after && mode === "acquisition" && (
                <p className="subtle">
                  Learned. Next review: {result.after.due.toLocaleDateString()}.
                </p>
              )}
              {mode === "review" && (
                <p className="subtle" lang="zh-CN">
                  {result.rating === null
                    ? "本题已保存，完成本组后安排下次复习。"
                    : `本组已完成。${result.rating === 1 ? "本次遗忘或考核有错，将安排较近的复习。" : "考核已完成。"} 下次复习：${result.after!.due.toLocaleString()}`}
                </p>
              )}
              <button ref={next} className="primary" onClick={advance}>
                Continue <ArrowRight size={17} />
              </button>
            </div>
          )}
          {!recognition && !revealed && (
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
          )}
        </div>
      </div>
      {detailsOpen && recognition && draftChoice && (
        <Dictionary
          key={`${task.sessionToken}-${word.id}-${task.sequence}`}
          initial={word.lemma}
          words={words}
          progress={progress}
          settings={settings}
          notify={notify}
          onClose={() => setDetailsOpen(false)}
          onEdit={dictionary}
          reviewConfirmation={{
            learningSenseId: word.learningSenseId,
            footer: (
              <div className="review-confirmation" lang="zh-CN">
                <p>核对释义后，可以修改刚才的选择。</p>
                <div
                  className="review-choice-row"
                  role="group"
                  aria-label="修改熟悉程度"
                >
                  {CHOICES.map((choice) => (
                    <button
                      key={choice.value}
                      className={`review-choice ${draftChoice === choice.value ? "selected" : ""}`}
                      aria-pressed={draftChoice === choice.value}
                      disabled={busy}
                      onClick={() => void choose(choice.value)}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
                <p className="review-next-step">
                  {CHOICES.find((c) => c.value === draftChoice)?.hint}
                </p>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => void confirmChoice()}
                >
                  确认并继续 <ArrowRight size={17} />
                </button>
              </div>
            ),
          }}
        />
      )}
    </div>
  );
}
