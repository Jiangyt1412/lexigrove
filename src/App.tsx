import { useEffect, useMemo, useState, type CSSProperties } from "react"; // # Subscribe to persistent local state, including cross-tab changes.
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
  ShieldCheck,
  Sun,
  Moon,
  CloudOff,
  X,
} from "./components/PixelIcons";
import { db, initialize, saveSettings } from "./db/database";
import { starterWords } from "./vocabulary/seed";
import { defaultSettings, type Session } from "./types/model";
import { startSession } from "./learning/engine";
import { statistics } from "./statistics/statistics";
import { Empty } from "./components/ui";
import { Dictionary } from "./dictionary/Dictionary";
import Vocabulary, { WordEditor } from "./pages/Vocabulary";
import ImportWords from "./pages/ImportWords";
import Study from "./pages/Study";
import Statistics from "./pages/Statistics";
import Settings from "./pages/Settings";
import World from "./world/World";
import { CoastalToday } from "./world/CoastalWorld"; // # One continuous scene replaces the dashboard garden and aquarium cards.
import { resolveSeason } from "./world/environment";
import { registerVocabularyTool } from "./utils/webmcp";
import { warmStarterAudio } from "./speech/audio-cache";
import { assetUrl } from "./utils/assets"; // # Shared interior scenery follows the deployment base and the selected season.
import { learningUnits } from "./vocabulary/lexicon"; // # Scene labels count eligible words rather than promising words absent from the library.
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
  const settings = useMemo(
    () => ({ ...defaultSettings, ...preferences }),
    [preferences],
  ); // # Background counters and service-worker updates must not restart the same word's automatic audio.
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
    const warm = () => {
      if ("serviceWorker" in navigator)
        void navigator.serviceWorker.ready.then(() => warmStarterAudio());
    };
    warm();
    window.addEventListener("online", warm);
    return () => window.removeEventListener("online", warm);
  }, []); // # Install the small app shell first; audio warming is bounded and yields to real playback.
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
  const units = useMemo(() => learningUnits(words), [words]);
  const continuingWords = new Set(
    progress
      .filter((p) => p.introduced && !p.card && !p.known && !p.suspended)
      .map((p) => p.wordId || p.id),
  ).size;
  const availableNew = new Set(
    progress
      .filter(
        (p) =>
          !p.introduced &&
          !p.card &&
          !p.known &&
          !p.suspended &&
          units.some((w) => w.id === p.id && w.easyDefinition),
      )
      .map((p) => p.wordId || p.id),
  ).size;
  const activeNew = Math.min(
      availableNew,
      Math.max(0, settings.dailyTarget - s.newToday - continuingWords),
    ),
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
      className={`app-shell coastal-shell ${page === "Study" ? `study-mode ${settings.world === "off" ? "study-calm" : ""}` : ""}`}
      style={
        {
          "--village-scenery": `url("${assetUrl(`assets/coastal/coast-${resolveSeason(settings.season)}.webp`)}")`,
        } as CSSProperties
      }
    >
      {page !== "Study" && (
        <aside className="world-navigation" aria-label="Village signpost">
          <a
            className="village-brand"
            href="#today"
            aria-label="Lexigrove home"
            onClick={(e) => {
              e.preventDefault();
              go("Today");
            }}
          >
            <Sprout size={27} />
          </a>
          <nav aria-label="Main navigation">
            {nav.map(({ page: p, icon: Icon }) => (
              <button
                key={p}
                className={`village-nav-item ${page === p ? "active" : ""}`}
                aria-label={
                  p === "Personal words"
                    ? "My words"
                    : p === "Difficult words"
                      ? "Tricky words"
                      : p
                }
                aria-current={page === p ? "page" : undefined}
                title={p}
                onClick={() => go(p)}
              >
                <Icon size={23} />
                <span>
                  {p === "Personal words"
                    ? "My words"
                    : p === "Difficult words"
                      ? "Tricky words"
                      : p}
                </span>
                {p === "Today" && s.due > 0 && (
                  <b className="village-due">{s.due}</b>
                )}
              </button>
            ))}
            <button
              className={`village-nav-item ${page === "Settings & data" ? "active" : ""}`}
              aria-label="Settings & data"
              title="Settings & data"
              onClick={() => go("Settings & data")}
            >
              <SettingsIcon size={23} />
              <span>Settings & data</span>
            </button>
          </nav>
        </aside>
      )}
      <main className="main">
        {page !== "Study" && (
          <div className="village-weather" aria-label="World status">
            <span>
              {online ? <ShieldCheck size={13} /> : <CloudOff size={13} />}{" "}
              {online ? "Saved locally" : "Offline"}
            </span>
            <button
              aria-label="Toggle day and night theme"
              title="Toggle day and night theme"
              onClick={() =>
                saveSettings({ theme: themeNight ? "day" : "night" })
              }
            >
              {themeNight ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        )}
        <div
          className={`page ${page === "Study" ? "study-container" : page === "Today" ? "today-page" : page === "My world" ? "world-page" : "village-interior"}`}
        >
          {!ready ? (
            <Empty title="Opening your library…" />
          ) : page === "Today" ? (
            <CoastalToday
              settings={settings}
              world={world}
              progress={progress}
              stats={s}
              activeNew={activeNew}
              sessionActive={!!session && session.wordIds.length > 0}
              date={clock}
              onStudy={() => study(s.due ? "review" : "acquire")}
              onResume={() => go("Study")}
              onLibrary={() => go("Vocabulary")}
              onWorld={() => go("My world")}
              onStatistics={() => go("Statistics")}
              onData={() => go("Settings & data")}
            />
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
