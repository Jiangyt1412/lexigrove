import { defineConfig } from "@playwright/test"; // # Fresh browser contexts use a different origin from the user's development session.
const basePath = process.env.TEST_BASE_PATH || "/"; // # Exercise the same app on a GitHub Pages project subpath.
const outputDir =
  process.env.TEST_OUT_DIR === "pages" ? "../lexigrove-pages-build" : "dist"; // # Test the separate Pages artifact without changing the user's root preview.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: `http://127.0.0.1:4173${basePath}`,
    viewport: { width: 1440, height: 1000 },
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run preview -- --port 4173 --outDir ${outputDir}`,
    env: { VITE_BASE_PATH: basePath }, // # Preview must mount the artifact at its build-time base too.
    url: `http://127.0.0.1:4173${basePath}`,
    reuseExistingServer: false,
    timeout: 30000,
  },
  reporter: [["list"], ["json", { outputFile: "test-results/report.json" }]],
});
