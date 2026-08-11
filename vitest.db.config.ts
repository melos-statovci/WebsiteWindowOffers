import { defineConfig } from "vitest/config";
import path from "node:path";

// Database integration tests (RLS proof). These require Neon and must be run
// with env loaded:  node --env-file=.env.local ./node_modules/.bin/vitest run --config vitest.db.config.ts
// (wired as `npm run test:db`). Kept separate so `npm test` stays offline.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.dbtest.ts"],
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
