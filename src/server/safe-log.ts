const PG_CODES = new Set(["23505", "23503", "23514", "22003", "22007", "22008", "22P02", "40001", "40P01", "57014", "08006", "53300", "42501"]);

export function logServerFailure(operation: string, error: unknown): void {
  let current: unknown = error;
  let code = "UNEXPECTED";
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth++) {
    const candidate = current as { code?: unknown; cause?: unknown };
    if (typeof candidate.code === "string" && PG_CODES.has(candidate.code)) {
      code = candidate.code;
      break;
    }
    current = candidate.cause;
  }
  // Operation is a compile-time call-site label, never customer input.
  console.error({ event: "server_failure", operation, code });
}
