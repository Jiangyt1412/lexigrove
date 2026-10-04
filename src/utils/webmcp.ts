import { db } from "../db/database"; // # Optional agent-facing read uses the same local data as the visible interface.
export function registerVocabularyTool() {
  const ctx = (
    document as Document & {
      modelContext?: {
        registerTool: (tool: unknown, options: unknown) => Promise<void>;
      };
    }
  ).modelContext;
  if (!ctx?.registerTool) return;
  const lifecycle = new AbortController();
  void Promise.resolve(
    ctx.registerTool(
      {
        name: "search_local_vocabulary",
        title: "Search local vocabulary",
        description:
          "Read local English entries without changing learning progress.",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string", maxLength: 120 } },
          required: ["query"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async (input: unknown) => {
          if (
            typeof input !== "object" ||
            input === null ||
            Object.keys(input).length !== 1 ||
            !("query" in input) ||
            typeof input.query !== "string" ||
            input.query.length > 120
          )
            throw Error("Expected a query string, maximum 120 characters.");
          const q = input.query.toLowerCase();
          return (await db.words.toArray())
            .filter((w) =>
              `${w.lemma} ${w.easyDefinition}`.toLowerCase().includes(q),
            )
            .slice(0, 30)
            .map((w) => ({
              word: w.lemma,
              definition: w.easyDefinition,
              decks: w.decks,
            }));
        },
      },
      { signal: lifecycle.signal },
    ),
  ).catch(() => {});
  return () => lifecycle.abort();
}
