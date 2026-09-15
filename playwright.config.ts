import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://localhost:3000", browserName: "chromium", trace: "off", screenshot: "off" },
  // Run against the production build; environment is supplied by test:browser.
  webServer: { command: "npm run start", url: "http://localhost:3000", reuseExistingServer: false, timeout: 60_000 },
});
