import { defineConfig } from "vitest/config"; // # Keep unit tests separate from browser E2E specifications.
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
