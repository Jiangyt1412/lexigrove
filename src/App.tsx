import { useEffect, useState } from "react"; // # Subscribe to persistent local state, including cross-tab changes.
import { useLiveQuery } from "dexie-react-hooks";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  BookOpen,
  Sprout,
  ChartNoAxesCombined,
  Settings as SettingsIcon,
  House,
  Star,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  Sun,
  Moon,
  CloudOff,
  Download,
  X,
} from "./components/PixelIcons";
import { db, initialize, saveSettings } from "./db/database";
import { starterWords } from "./vocabulary/seed";
import { defaultSettings, type Session } from "./types/model";
import { startSession } from "./learning/engine";
import { statistics } from "./statistics/statistics";
import { Metric, Empty } from "./components/ui";
import { Dictionary } from "./dictionary/Dictionary";
import Vocabulary, { WordEditor } from "./pages/Vocabulary";
import ImportWords from "./pages/ImportWords";
import Study from "./pages/Study";
import Statistics from "./pages/Statistics";
import Settings from "./pages/Settings";
import World from "./world/World";
import { LivingScene } from "./world/LivingScene"; // # Original marine scenery connects the home screen to the study view.
import { resolveSeason } from "./world/environment";
import { registerVocabularyTool } from "./utils/webmcp";
type Page =
  | "Today"
  | "Vocabulary"
  | "My world"
  | "Difficult words"
  | "Personal words"
  | "Statistics"
  | "Settings & data"
  | "Study";
const nav = [
  { page: "Today", icon: House },
  { page: "Vocabulary", icon: BookOpen },
  { page: "My world", icon: Sprout },
  { page: "Difficult words", icon: Star },
  { page: "Personal words", icon: Plus },
  { page: "Statistics", icon: ChartNoAxesCombined },
] as const;
const routes: Record<Page, string> = {
  Today: "today",
  Vocabulary: "vocabulary",
  "My world": "world",
  "Difficult words": "difficult",
  "Personal words": "personal",
  Statistics: "statistics",
  "Settings & data": "settings",
  Study: "study",
}; // # Hash routes also work when GitHub Pages serves the app from a repository subpath.
function currentPage(): Page {
  return (
    (Object.keys(routes) as Page[]).find(
      (p) => routes[p] === location.hash.slice(1),
    ) ?? "Today"
  );
} // # A reload or browser Back returns to the saved view without changing the session.
export default function App() {
  const [page, setPage] = useState<Page>(currentPage),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false),
    [toast, setToast] = useState(""),
    [dictionary, setDictionary] = useState<string | null>(null),
    [edit, setEdit] = useState<string | null>(null),
    [importing, setImporting] = useState(false),
    [online, setOnline] = useState(navigator.onLine),
    [clock, setClock] = useState(Date.now());
  const sw = useRegisterSW({
    onRegisterError: (e) =>
      setToast(`Offline setup needs another online load: ${e.message}`),
  });
  useEffect(() => {
    initialize(starterWords)
      .then(() => setReady(true))
      .catch((e) => setError(`Could not open local data: ${e.message}`));
    const network = () => setOnline(navigator.onLine);
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    const timer = setInterval(() => setClock(Date.now()), 30000);
    return () => {
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
      clearInterval(timer);
    };
  }, []);
  const words = useLiveQuery(() => db.words.toArray(), [], []),
    progress = useLiveQuery(() => db.progress.toArray(), [], []),
    attempts = useLiveQuery(() => db.attempts.toArray(), [], []),
    preferences = useLiveQuery(() => db.settings.get("settings")),
    session = useLiveQuery(() => db.sessions.get("active")),
    world = useLiveQuery(() => db.world.get("world")) ?? {
      id: "world" as const,
      garden: 0,
      aquarium: 0,
    };
  const settings = { ...defaultSettings, ...preferences }; // # Fill newly introduced preferences after old backup restoration.
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        settings.theme === "night" ||
        (settings.theme === "system" && media.matches)
          ? "night"
          : "day";
      document.documentElement.dataset.season = resolveSeason(settings.season);
      document.documentElement.dataset.motion = settings.reduceEffects
        ? "reduced"
        : settings.environmentAnimation === "full"
          ? "normal"
          : settings.environmentAnimation;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [
    settings.theme,
    settings.reduceEffects,
    settings.season,
    settings.environmentAnimation,
  ]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 7000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(registerVocabularyTool, []);
  useEffect(() => {
    const route = () => {
      setPage(currentPage());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", route);
    return () => window.removeEventListener("hashchange", route);
  }, []); // # Native browser navigation retains the same persistent learning session.
  const s = statistics(words, progress, attempts, clock);
  const go = (next: Page) => {
    setPage(next);
    location.hash = routes[next];
    window.scrollTo(0, 0);
  };
  async function study(mode: Session["mode"], ids?: string[]) {
    try {
      await startSession(mode, ids);
      go("Study");
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  const activeNew = Math.max(0, settings.dailyTarget - s.newToday),
    themeNight =
      settings.theme === "night" ||
      (settings.theme === "system" &&
        matchMedia("(prefers-color-scheme: dark)").matches);
  if (error)
    return (
      <main className="error-boundary">
        <h1>Your data could not be opened.</h1>
        <p>{error}</p>
        <p>Do not clear browser storage. Try reopening this page.</p>
        <button className="primary" onClick={() => location.reload()}>
          Retry
        </button>
      </main>
    );
  return (
    <div
      className={`app-shell ${page === "Study" ? `study-mode ${settings.world === "off" ? "study-calm" : ""}` : ""}`}
    >
      {page !== "Study" && (
        <aside className="sidebar">
          <a
            className="brand"
            href="#today"
            onClick={(e) => {
              e.preventDefault();
              go("Today");
            }}
          >
            <img src={assetUrl("favicon.svg")} alt="" />
            <span>lexigrove</span>
          </a>
          <nav aria-label="Main navigation">
            {nav.map(({ page: p, icon: Icon }) => (
              <button
                key={p}
                className={`nav-item ${page === p ? "active" : ""}`}
                aria-current={page === p ? "page" : undefined}
                onClick={() => go(p)}
              >
                <Icon size={20} />
                <span>
                  {p === "Personal words"
                    ? "My words"
                    : p === "Difficult words"
                      ? "Tricky words"
                      : p}
                </span>
                {p === "Today" && s.due > 0 && (
                  <b className="nav-count">{s.due}</b>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-pixel">
              <svg viewBox="0 0 32 32">
                <use href={assetUrl("assets/original/sprites.svg#books")} />
              </svg>
              <span>One word. One discovery.</span>
            </div>
            <button
              className={`nav-item ${page === "Settings & data" ? "active" : ""}`}
              onClick={() => go("Settings & data")}
            >
              <SettingsIcon size={20} />
              <span>Settings & data</span>
            </button>
            <div className="local-note">
              <ShieldCheck size={14} />
              Saved on this device
            </div>
          </div>
        </aside>
      )}
      <main className="main">
        {page !== "Study" && (
          <header className="topbar">
            <span>
              <b>{page}</b>
            </span>
            <div>
              <span className="badge">
                {online ? <ShieldCheck size={13} /> : <CloudOff size={13} />}{" "}
                {online ? "Local-first" : "Offline"}
              </span>
              <button
                className="icon-button"
                aria-label="Toggle day and night theme"
                onClick={() =>
                  saveSettings({ theme: themeNight ? "day" : "night" })
                }
              >
                {themeNight ? <Sun size={19} /> : <Moon size={19} />}
              </button>
            </div>
          </header>
        )}
        <div
          className={`page ${page === "Study" ? "study-container" : page === "Today" ? "today-page" : ""}`}
        >
          {!ready ? (
            <Empty title="Opening your library…" />
          ) : page === "Today" ? (
            <>
              <div className="page-heading">
                <h1>A little world, growing with you.</h1>
                <span className="date-label">
                  {new Date(clock).toLocaleDateString("en", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              {settings.world !== "off" && (
                <div
                  className={`home-worlds ${settings.world === "mixed" ? "both-worlds" : ""}`}
                >
                  <LivingScene
                    kind={settings.world === "ocean" ? "aquarium" : "garden"}
                    count={
                      settings.world === "ocean" ? world.aquarium : world.garden
                    }
                    settings={settings}
                    progress={progress}
                    hero
                    onInspect={() => go("My world")}
                  />
                  {settings.world === "mixed" && (
                    <LivingScene
                      kind="aquarium"
                      count={world.aquarium}
                      settings={settings}
                      progress={progress}
                      onInspect={() => go("My world")}
                    />
                  )}
                </div>
              )}
              <div className="today-strip">
                <Metric
                  label="Reviews due"
                  value={s.due}
                  detail={s.overdue ? `${s.overdue} overdue` : undefined}
                />
                <Metric label="New words" value={s.due ? 0 : activeNew} />
                <Metric label="Words learned" value={s.learned} />
                <Metric
                  label="Review recall"
                  value={s.retention === null ? "—" : `${s.retention}%`}
                />
              </div>
              <div className="home-bottom">
                <section className="study-launch">
                  <div>
                    <span className="eyebrow">TODAY’S FIELD NOTES</span>
                    <h2>
                      {s.due
                        ? "Revisit your discoveries."
                        : activeNew
                          ? "Discover a few new words."
                          : "Your daily target is complete."}
                    </h2>
                    {s.overdue >= 50 && (
                      <p>
                        {s.overdue} overdue · New words pause while you catch
                        up.
                      </p>
                    )}
                    <span className="subtle">
                      {s.due
                        ? `About ${Math.ceil(s.due * 0.4)} minutes`
                        : `${settings.dailyTarget} words / day`}
                    </span>
                  </div>
                  <div className="launch-actions">
                    <button
                      className="primary"
                      disabled={!s.due && !activeNew && !s.learning}
                      onClick={() => study(s.due ? "review" : "acquire")}
                    >
                      {s.due
                        ? "Start review"
                        : s.learning
                          ? "Continue learning"
                          : "Start learning"}
                      <ArrowRight size={18} />
                    </button>
                    {session && session.wordIds.length > 0 && (
                      <button
                        className="text-button"
                        onClick={() => go("Study")}
                      >
                        Resume session
                      </button>
                    )}
                  </div>
                </section>
                {settings.world === "mixed" && (
                  <button
                    className="aquarium-teaser"
                    onClick={() => go("My world")}
                  >
                    <svg className="teaser-fish" viewBox="0 0 32 32">
                      <use
                        href={assetUrl(
                          `assets/original/sprites.svg#${world.aquarium ? "fish-blue" : "shell"}`,
                        )}
                      />
                    </svg>
                    <span>
                      <small>MEMORY AQUARIUM</small>
                      <b>
                        {world.aquarium
                          ? `${world.aquarium} lasting memories`
                          : "Quiet waters."}
                      </b>
                    </span>
                    <ArrowUpRight size={19} />
                  </button>
                )}
              </div>
              <div className="home-footer">
                <button
                  className="text-button"
                  onClick={() => go("Vocabulary")}
                >
                  Explore {words.length} words <ArrowUpRight size={14} />
                </button>
                <button
                  className="text-button"
                  onClick={() => go("Settings & data")}
                >
                  <Download size={14} />
                  {settings.lastBackup ? "Manage backups" : "Save a backup"}
                </button>
              </div>
            </>
          ) : page === "Study" ? (
            <Study
              words={words}
              progress={progress}
              session={session}
              settings={settings}
              dictionary={setDictionary}
              onExit={() => go("Today")}
              notify={setToast}
            />
          ) : ["Vocabulary", "Personal words", "Difficult words"].includes(
              page,
            ) ? (
            <Vocabulary
              words={words}
              progress={progress}
              showChinese={settings.showChinese}
              view={
                page === "Personal words"
                  ? "personal"
                  : page === "Difficult words"
                    ? "difficult"
                    : "all"
              }
              dictionary={setDictionary}
              onAdd={() => setEdit("")}
              onImport={() => setImporting(true)}
              onPractice={(ids) => study("practice", ids)}
              notify={setToast}
            />
          ) : page === "My world" ? (
            <World
              world={world}
              settings={settings}
              progress={progress}
              notify={setToast}
            />
          ) : page === "Statistics" ? (
            <Statistics
              words={words}
              progress={progress}
              attempts={attempts}
              world={world}
            />
          ) : (
            <Settings
              settings={settings}
              notify={setToast}
              onReset={() => go("Today")}
            />
          )}
        </div>
      </main>
      {dictionary !== null && (
        <Dictionary
          initial={dictionary}
          words={words}
          progress={progress}
          settings={settings}
          onClose={() => setDictionary(null)}
          onEdit={(word) => {
            setDictionary(null);
            setEdit(word);
          }}
          notify={setToast}
        />
      )}
      {edit !== null && (
        <WordEditor
          initial={edit}
          entry={words.find(
            (w) => w.normalizedWord === edit.trim().toLowerCase(),
          )}
          onClose={() => setEdit(null)}
          notify={setToast}
        />
      )}
      {importing && (
        <ImportWords
          words={words}
          onClose={() => setImporting(false)}
          notify={setToast}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {sw.needRefresh[0] && (
        <div className="update-banner">
          <span>An update is ready. Finish this answer first.</span>
          <button
            className="secondary"
            onClick={() => sw.updateServiceWorker(true)}
          >
            Update
          </button>
          <button
            className="text-button"
            onClick={() => sw.needRefresh[1](false)}
          >
            Later
          </button>
        </div>
      )}
    </div>
  );
}
import { assetUrl } from "./utils/assets"; // # Public asset paths share Vite's configured deployment base.
