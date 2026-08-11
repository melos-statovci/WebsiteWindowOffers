import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Domain boundary: src/domain is the pure, framework-free business layer.
  // Dependency direction must be APP/SERVER -> DOMAIN, never DOMAIN -> APP.
  // Domain code must stay usable by both the browser and a future server, so it
  // may not import React, Zustand, Next.js, the store, the DOM-bound printer,
  // components, or reference browser globals.
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "Domain must stay framework-free (no React)." },
            { name: "react-dom", message: "Domain must stay framework-free (no React DOM)." },
            { name: "zustand", message: "Domain must not depend on the state library." },
            { name: "@/lib/store", message: "Domain must not import the Zustand store (APP -> DOMAIN only)." },
            { name: "@/lib/print", message: "Domain must not import DOM-bound printing." },
          ],
          patterns: [
            { group: ["next", "next/*"], message: "Domain must stay framework-free (no Next.js)." },
            { group: ["@/components/*", "@/components/**"], message: "Domain must not import UI components." },
            { group: ["@/lib/store", "@/lib/print"], message: "Domain must not import app-only modules." },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "window", message: "Domain must not touch browser globals." },
        { name: "document", message: "Domain must not touch browser globals." },
        { name: "localStorage", message: "Domain must not touch browser storage." },
        { name: "sessionStorage", message: "Domain must not touch browser storage." },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
