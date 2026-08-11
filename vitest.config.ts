import { defineConfig } from "vitest/config";
import path from "node:path";

// Default unit-test config. Pure, fast, offline. Database integration tests
// (*.dbtest.ts) are excluded here and run via vitest.db.config.ts instead, so
// `npm test` never requires Neon.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/*.dbtest.ts"],
    environment: "node",
  },
});
