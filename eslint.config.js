import js from "@eslint/js"; // # Standard correctness rules.
import ts from "typescript-eslint"; // # TypeScript-aware linting.
import globals from "globals"; // # Browser and Node environments.
export default ts.config(
  { ignores: ["dist", "node_modules", "playwright-report", "test-results"] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
);
