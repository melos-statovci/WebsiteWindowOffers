import { describe, it, expect, vi } from "vitest";
import { logServerFailure } from "./safe-log";

describe("safe failure diagnostics", () => {
  it("retains safe codes without exposing nested query/credential markers", () => {
    const sink = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      logServerFailure("invoice.create", { message: "SECRET customer password postgres://secret", params: ["PRIVATE NOTE"], cause: { code: "23514", detail: "COOKIE TOKEN", stack: "SECRET" } });
      expect(sink).toHaveBeenCalledWith({ event: "server_failure", operation: "invoice.create", code: "23514" });
      expect(JSON.stringify(sink.mock.calls)).not.toMatch(/SECRET|PRIVATE|COOKIE|TOKEN|postgres:/);
    } finally { sink.mockRestore(); }
  });
  it("does not trust arbitrary error codes", () => {
    const sink = vi.spyOn(console, "error").mockImplementation(() => {});
    try { logServerFailure("auth", { code: "password=secret" }); expect(sink.mock.calls[0][0].code).toBe("UNEXPECTED"); }
    finally { sink.mockRestore(); }
  });
});
