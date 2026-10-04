import { useState } from "react"; // # Preview every import before writing; conflicts preserve existing definitions.
import { Upload } from "../components/PixelIcons";
import {
  parseImport,
  previewImport,
  commitImport,
  type ImportRow,
} from "../import/import";
import type { Lexical } from "../types/model";
import { Modal, Metric } from "../components/ui";
import { assetUrl } from "../utils/assets"; // # Example downloads follow the same deployment base as the app.
export default function ImportWords({
  words,
  onClose,
  notify,
}: {
  words: Lexical[];
  onClose: () => void;
  notify: (s: string) => void;
}) {
  const [rows, setRows] = useState<ImportRow[] | null>(null),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const preview = rows ? previewImport(rows, words) : null;
  return (
    <Modal title="Import vocabulary" onClose={onClose} wide>
      <p>
        CSV or JSON · required field: <b>word</b>
      </p>
      <p className="subtle">
        Optional: definition, chinese（中文释义）, example, deck, tag, note.
      </p>
      <details className="source-details">
        <summary>Multiple meanings & pronunciations</summary>
        <p>
          JSON can include an explicit entries array. CSV also accepts
          partofspeech, ipaus, ipauk, clozetarget, expectedanswer and
          acceptedforms. Existing words gain entries without losing their
          learning history.
        </p>
        <a
          href={assetUrl("examples/lexical-import.json")}
          download="lexigrove-lexical-example.json"
        >
          Download a multiple-meaning example
        </a>
      </details>
      <label className="file-drop">
        <Upload />
        <span>{name || "Choose a CSV or JSON file"}</span>
        <input
          type="file"
          accept=".csv,.json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              setRows(parseImport(await file.text(), file.name));
              setName(file.name);
              setError("");
            } catch (e) {
              setRows(null);
              setError((e as Error).message);
            }
          }}
        />
      </label>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {preview && (
        <>
          <div className="metric-grid import-metrics">
            <Metric label="New" value={preview.added} />
            <Metric label="Existing" value={preview.existing} />
            <Metric label="No definition" value={preview.unknown} />
            <Metric label="Conflicts" value={preview.conflicts} />
          </div>
          <p className="subtle">
            Existing definitions and progress are preserved. Decks and tags are
            merged. Words without a definition and cloze-ready example wait in
            your library.
          </p>
          <div className="import-sample">
            {rows!.slice(0, 6).map((r, i) => (
              <div key={i}>
                <b>{r.word}</b>
                <span>
                  {r.definition ||
                    (r.entries
                      ? `${r.entries.length} entries · ${r.entries.reduce((n, e) => n + e.learningGroups.length, 0)} learning meanings`
                      : "No definition provided")}
                </span>
              </div>
            ))}
            {rows!.length > 6 && <p>+ {rows!.length - 6} more</p>}
          </div>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await commitImport(rows!);
                notify(`Imported ${rows!.length} rows.`);
                onClose();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Import {rows!.length} rows
          </button>
        </>
      )}
    </Modal>
  );
}
