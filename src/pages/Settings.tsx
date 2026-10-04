import { useEffect, useState } from "react"; // # Settings persist immediately; destructive operations require explicit confirmation.
import { Download, Upload, ShieldCheck } from "../components/PixelIcons";
import { type Settings as Preferences, defaultSettings } from "../types/model";
import { db, saveSettings, initialize } from "../db/database";
import {
  exportBackup,
  parseBackup,
  restoreBackup,
  type Backup,
} from "../backup/backup";
import { starterWords } from "../vocabulary/seed";
import { Confirm } from "../components/ui";
import {
  englishVoices,
  selectVoice,
  pronounce,
  voiceMatchesAccent,
} from "../speech/speech"; // # Show only voices actually supplied by this browser.
export default function Settings({
  settings,
  notify,
  onReset,
}: {
  settings: Preferences;
  notify: (s: string) => void;
  onReset: () => void;
}) {
  const [restore, setRestore] = useState<Backup | null>(null),
    [reset, setReset] = useState(false),
    [resetText, setResetText] = useState(""),
    [busy, setBusy] = useState(false),
    [storage, setStorage] = useState("");
  const save = (patch: Partial<Preferences>) =>
    saveSettings(patch).catch((e) => notify(e.message));
  const [voices, setVoices] = useState(englishVoices),
    [testingVoice, setTestingVoice] = useState(false);
  useEffect(() => {
    const refresh = () => setVoices(englishVoices());
    if (typeof speechSynthesis !== "undefined")
      speechSynthesis.addEventListener("voiceschanged", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    refresh();
    return () => {
      if (typeof speechSynthesis !== "undefined")
        speechSynthesis.removeEventListener("voiceschanged", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);
  const accentVoices = voices.filter((v) =>
    voiceMatchesAccent(v, settings.accent),
  ); // # Voice choices correspond to the selected country label.
  const activeVoice = selectVoice(voices, settings, navigator.onLine, true);
  const automaticVoice = selectVoice(
    voices,
    { ...settings, voiceURI: "" },
    navigator.onLine,
    true,
  );
  async function testVoice() {
    setTestingVoice(true);
    try {
      await pronounce(
        starterWords.find((w) => w.lemma === "analysis") ?? starterWords[0],
        { ...settings, audioPreference: "local" },
        { strictAccent: true },
      );
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setTestingVoice(false);
    }
  }
  async function restoreNow() {
    setBusy(true);
    try {
      await exportBackup();
      await restoreBackup(restore);
      setRestore(null);
      notify(
        "Backup restored. A safety copy of your previous data was downloaded.",
      );
      onReset();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Settings & data</h1>
          <p>Your learning, your pace.</p>
        </div>
      </div>
      <div className="settings-columns">
        <section className="panel">
          <h2>Learning</h2>
          <label className="setting-row">
            <span>New words per day</span>
            <input
              type="number"
              min={1}
              max={200}
              aria-label="New words per day"
              value={settings.dailyTarget}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (n >= 1 && n <= 200) void save({ dailyTarget: n });
              }}
            />
          </label>
          <div className="target-presets">
            {[10, 20, 30, 50].map((n) => (
              <button
                key={n}
                className={
                  settings.dailyTarget === n ? "chip selected" : "chip"
                }
                onClick={() => save({ dailyTarget: n })}
              >
                {n}
              </button>
            ))}
          </div>
          <label className="setting-row">
            <span>
              Desired retention <small>Applies to future scheduling</small>
            </span>
            <select
              value={settings.retention}
              onChange={(e) => save({ retention: Number(e.target.value) })}
            >
              {[0.8, 0.85, 0.9, 0.95, 0.97].map((v) => (
                <option key={v} value={v}>
                  {Math.round(v * 100)}%
                </option>
              ))}
            </select>
          </label>
          <label className="setting-row">
            <span>Short definition by default</span>
            <input
              type="checkbox"
              checked={settings.easyDefault}
              onChange={(e) => save({ easyDefault: e.target.checked })}
            />
          </label>
          <label className="setting-row chinese-setting" lang="zh-CN">
            <span>
              显示中文释义 <small>辅助理解当前英文义项</small>
            </span>
            <input
              type="checkbox"
              checked={settings.showChinese}
              onChange={(e) => save({ showChinese: e.target.checked })}
            />
          </label>
          <h2 className="settings-subheading">Pronunciation</h2>
          <label className="setting-row">
            <span>Accent</span>
            <select
              aria-label="Accent"
              value={settings.accent}
              onChange={(e) =>
                save({
                  accent: e.target.value as Preferences["accent"],
                  voiceURI: "",
                })
              }
            >
              <option value="US">🇺🇸 US English</option>
              <option value="UK">🇬🇧 UK English</option>
            </select>
          </label>
          <label className="setting-row">
            <span>Voice</span>
            <select
              aria-label="Voice"
              value={settings.voiceURI ?? ""}
              onChange={(e) => save({ voiceURI: e.target.value })}
            >
              <option value="">
                Automatic{automaticVoice ? ` · ${automaticVoice.name}` : ""}
              </option>
              {!!settings.voiceURI &&
                !accentVoices.some((v) => v.voiceURI === settings.voiceURI) && (
                  <option value={settings.voiceURI}>
                    Saved voice unavailable
                  </option>
                )}
              {accentVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} · {v.lang}
                  {v.localService ? "" : " · online"}
                </option>
              ))}
            </select>
          </label>
          <div className="actions">
            <button
              className="secondary"
              disabled={testingVoice || !activeVoice}
              onClick={() => void testVoice()}
            >
              {testingVoice ? "Playing…" : "Test voice"}
            </button>
          </div>
          {!activeVoice && voices.length > 0 && (
            <p className="subtle" lang="zh-CN">
              {settings.accent === "US" ? "美音" : "英音"}语音未安装
            </p>
          )}
          <label className="setting-row">
            <span>Speed</span>
            <select
              value={settings.speed}
              onChange={(e) =>
                save({ speed: Number(e.target.value) as Preferences["speed"] })
              }
            >
              {[0.75, 1, 1.25].map((v) => (
                <option key={v} value={v}>
                  {v}×
                </option>
              ))}
            </select>
          </label>
          <label className="setting-row">
            <span>Pronounce correct answers</span>
            <input
              type="checkbox"
              checked={settings.autoPronounce}
              onChange={(e) => save({ autoPronounce: e.target.checked })}
            />
          </label>
          <label className="setting-row">
            <span>Audio preference</span>
            <select
              value={settings.audioPreference}
              onChange={(e) =>
                save({
                  audioPreference: e.target
                    .value as Preferences["audioPreference"],
                })
              }
            >
              <option value="local">System voice</option>
              <option value="human">Open recording first</option>
            </select>
          </label>
          <details className="source-details">
            <summary>Voice availability</summary>
            <p>
              Automatic selection avoids character and sound-effect voices.
              Choose a voice and use Test voice to compare it. If the requested
              accent is unavailable, another English voice is used. Some system
              voices need internet. No recordings are bundled. An unavailable
              audio acquisition test remains pending. Country-labelled playback
              buttons require a matching US or UK voice and report when it is
              unavailable.
            </p>
          </details>
        </section>
        <div>
          <section className="panel">
            <h2>Your world</h2>
            <label className="setting-row">
              <span>Theme</span>
              <select
                value={settings.theme}
                onChange={(e) =>
                  save({ theme: e.target.value as Preferences["theme"] })
                }
              >
                <option value="day">Cozy day</option>
                <option value="night">Cozy night</option>
                <option value="system">Follow system</option>
              </select>
            </label>
            <label className="setting-row">
              <span>Environment</span>
              <select
                value={settings.world}
                onChange={(e) =>
                  save({ world: e.target.value as Preferences["world"] })
                }
              >
                <option value="farm">Garden</option>
                <option value="ocean">Aquarium</option>
                <option value="mixed">Both worlds</option>
                <option value="off">No decoration</option>
              </select>
            </label>
            <label className="setting-row">
              <span>
                Season <small>Auto: local northern-hemisphere calendar</small>
              </span>
              <select
                aria-label="Season"
                value={settings.season}
                onChange={(e) =>
                  save({ season: e.target.value as Preferences["season"] })
                }
              >
                {["auto", "spring", "summer", "autumn", "winter"].map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className="setting-row">
              <span>Environment animation</span>
              <select
                aria-label="Environment animation"
                value={settings.environmentAnimation}
                onChange={(e) =>
                  save({
                    environmentAnimation: e.target
                      .value as Preferences["environmentAnimation"],
                    reduceEffects: false,
                  })
                }
              >
                {["full", "reduced", "static"].map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className="setting-row">
              <span>Reduce decorative effects</span>
              <input
                type="checkbox"
                checked={settings.reduceEffects}
                onChange={(e) => save({ reduceEffects: e.target.checked })}
              />
            </label>
            <label className="setting-row">
              <span>Show attributed word images</span>
              <input
                type="checkbox"
                checked={settings.showImages}
                onChange={(e) => save({ showImages: e.target.checked })}
              />
            </label>
          </section>
          <section className="panel data-panel">
            <h2>
              <ShieldCheck size={20} />
              Your data
            </h2>
            <p>
              Stored in this browser. Keep a backup before changing browsers,
              domains, or clearing site data.
            </p>
            <div className="actions wrap">
              <button
                className="primary"
                onClick={() =>
                  exportBackup()
                    .then(() =>
                      notify("Backup downloaded. Keep it somewhere safe."),
                    )
                    .catch((e) => notify(e.message))
                }
              >
                <Download size={16} />
                Export backup
              </button>
              <label className="secondary file-button">
                <Upload size={16} />
                Restore
                <input
                  type="file"
                  accept=".json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setRestore(parseBackup(await file.text()));
                    } catch {
                      notify(
                        "Invalid or unsupported backup. Your current data is unchanged.",
                      );
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <p className="subtle">
              Last export:{" "}
              {settings.lastBackup
                ? new Date(settings.lastBackup).toLocaleString()
                : "not yet"}
            </p>
            <button
              className="text-button"
              onClick={async () => {
                try {
                  const granted = await navigator.storage?.persist?.();
                  const estimate = await navigator.storage?.estimate?.();
                  setStorage(
                    `${granted ? "Persistent storage granted." : "Persistence not granted; export backups regularly."}${estimate?.usage ? ` Approx. ${(estimate.usage / 1024 / 1024).toFixed(1)} MB used.` : ""}`,
                  );
                } catch {
                  setStorage("Storage persistence is unavailable.");
                }
              }}
            >
              Request persistent storage
            </button>
            {storage && <p className="subtle">{storage}</p>}
          </section>
          <section className="panel">
            <h2>Install Lexigrove</h2>
            <p>
              In Chrome or Edge, use the install icon in the address bar. The
              offline app is ready after its first complete load.
            </p>
            <details className="source-details">
              <summary>About & licences</summary>
              <p>
                Application: MIT. Original pixel assets: CC0. Selected
                Wiktionary definitions and IPA via Kaikki: CC BY-SA 4.0. A
                60-word starter set, not a complete NGSL or NAWL list. Chinese
                hints are project-authored adaptations of those selected senses,
                not independently reviewed dictionary translations.
              </p>
              <a
                href="https://en.wiktionary.org/wiki/Wiktionary:Copyrights"
                target="_blank"
                rel="noreferrer"
              >
                Dictionary licence
              </a>
            </details>
          </section>
          <button
            className="text-button danger-text"
            onClick={() => setReset(true)}
          >
            Reset all local data
          </button>
        </div>
      </div>
      {restore && (
        <Confirm
          title="Restore this backup?"
          onClose={() => setRestore(null)}
          onConfirm={() => {
            if (!busy) void restoreNow();
          }}
        >
          Replace this browser’s data with {restore.words.length} words and{" "}
          {restore.attempts.length} attempts from{" "}
          {new Date(restore.exportedAt).toLocaleString()}? A safety backup
          downloads first. Keep that file before continuing.
        </Confirm>
      )}
      {reset && (
        <Confirm
          title="Reset all local data?"
          danger
          onClose={() => {
            setReset(false);
            setResetText("");
          }}
          onConfirm={async () => {
            if (resetText !== "RESET") {
              notify("Type RESET to confirm.");
              return;
            }
            try {
              await exportBackup();
              await db.transaction("rw", db.tables, async () => {
                await Promise.all(db.tables.map((t) => t.clear()));
                await db.settings.put(defaultSettings);
                await db.world.put({ id: "world", garden: 0, aquarium: 0 });
              });
              await initialize(starterWords);
              setReset(false);
              onReset();
              notify("Data reset. A safety backup was downloaded.");
            } catch (e) {
              notify((e as Error).message);
            }
          }}
        >
          <span>
            Deletes all local learning history and personal entries. A safety
            backup downloads first.
          </span>
          <label className="field">
            Type RESET
            <input
              value={resetText}
              onChange={(e) => setResetText(e.target.value)}
            />
          </label>
        </Confirm>
      )}
    </>
  );
}
