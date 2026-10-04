import type { Lexical, Progress, Attempt, World } from "../types/model"; // # Display observed results; no seeded progress.
import { statistics } from "../statistics/statistics";
import { Metric } from "../components/ui";
import { milestone } from "../world/progression";
export default function Statistics({
  words,
  progress,
  attempts,
  world,
}: {
  words: Lexical[];
  progress: Progress[];
  attempts: Attempt[];
  world: World;
}) {
  const s = statistics(words, progress, attempts);
  const max = Math.max(1, ...s.history.map((h) => h.count));
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Your progress</h1>
          <p>Small efforts, lasting knowledge.</p>
        </div>
      </div>
      <div className="metric-grid">
        <Metric label="Words learned" value={s.learned} />
        <Metric label="Mature words" value={s.mature} />
        <Metric label="Learning senses" value={s.learning} />
        <Metric
          label="Review recall"
          value={s.retention === null ? "—" : `${s.retention}%`}
          detail="Correct scheduled reviews / all scheduled reviews"
        />
      </div>
      <p className="subtle">
        {s.words} distinct words · {s.senses} learning meanings ·{" "}
        {s.learnedSenses} acquired meanings · {s.matureSenses} mature meanings.
        Audio spelling accuracy measures form retrieval.
      </p>
      <div className="stats-grid">
        <section className="panel">
          <div className="section-title">
            <h2>Learning activity</h2>
            <span>LAST 14 DAYS</span>
          </div>
          <div
            className="activity-chart"
            role="img"
            aria-label={s.history
              .map((h) => `${h.date}: ${h.count} attempts`)
              .join(", ")}
          >
            {s.history.map((h) => (
              <div className="bar-column" key={h.date}>
                <span>{h.count || ""}</span>
                <div
                  className="chart-bar"
                  style={{ height: `${Math.max(2, (h.count / max) * 140)}px` }}
                  title={`${h.date}: ${h.count}`}
                />
                <small>{h.date.split(" ")[1]}</small>
              </div>
            ))}
          </div>
          <div className="small-row">
            <span>{s.history[0].date}</span>
            <span>{s.attemptsToday} attempts today</span>
            <span>{s.history[13].date}</span>
          </div>
        </section>
        <section className="panel">
          <h2>Recall by modality</h2>
          <div className="accuracy-list">
            {s.modalities.map((m) => (
              <div key={m.modality}>
                <div>
                  <span>
                    {
                      {
                        definition: "Definition → spelling",
                        audio: "Audio → spelling",
                        cloze: "Cloze recall",
                      }[m.modality]
                    }
                  </span>
                  <b>{m.accuracy === null ? "—" : `${m.accuracy}%`}</b>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${m.accuracy ?? 0}%` }} />
                </div>
                <small>
                  {m.correct} correct · {m.total} attempts
                </small>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Review forecast</h2>
          <div className="forecast-list">
            {s.forecast.map((f) => (
              <div key={f.days}>
                <span>
                  {f.days === 1 ? "Next 24 hours" : `Within ${f.days} days`}
                </span>
                <strong>{f.count}</strong>
              </div>
            ))}
          </div>
          <p className="subtle">
            Cumulative projections from current due dates; future answers will
            change them. {s.due} reviews are due now.
          </p>
        </section>
        <section className="panel">
          <h2>Vocabulary by deck</h2>
          <div className="forecast-list">
            {s.decks.map((d) => (
              <div key={d.name}>
                <span>{d.name}</span>
                <strong>
                  {d.learned}
                  <small> / {d.total}</small>
                </strong>
              </div>
            ))}
          </div>
          <p className="subtle">Shared words may appear in several decks.</p>
        </section>
      </div>
      <div className="metric-grid">
        <Metric label="Reviews today" value={s.reviewsToday} />
        <Metric label="New words today" value={s.newToday} />
        <Metric label="Lapses · 7 days" value={s.recentLapses} />
        <Metric
          label="Aquarium"
          value={milestone("aquarium", world.aquarium).current.name}
        />
      </div>
      <section className="panel history-panel">
        <h2>Recent history</h2>
        {attempts.length ? (
          <div className="history-list">
            {[...attempts]
              .sort((a, b) => b.at - a.at)
              .slice(0, 30)
              .map((a) => (
                <div key={a.id}>
                  <b>{words.find((w) => w.id === a.wordId)?.lemma}</b>
                  <span>
                    {a.mode} · {a.modality}
                  </span>
                  <span>{a.correct ? "Correct" : "Try again"}</span>
                  <time>{new Date(a.at).toLocaleString()}</time>
                </div>
              ))}
          </div>
        ) : (
          <p>No attempts yet.</p>
        )}
      </section>
    </>
  );
}
