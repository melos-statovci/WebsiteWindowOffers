// Shared domain layer — pure, framework-free business logic usable by both the
// browser and (later) the server. Nothing here may import React, Zustand,
// Next.js, the store, or browser globals (enforced via ESLint; see eslint.config).
//
// Prefer importing directly from the submodules (e.g. "@/domain/finance") where
// that makes the dependency direction clearer; this barrel exists for
// convenience and discoverability.

export * from "@/domain/types";
export * from "@/domain/pricing/types";
export * from "@/domain/finance/selectors";
export * from "@/domain/configurator/window-calc";
export * from "@/domain/backup/backup";
