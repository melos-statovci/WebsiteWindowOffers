import { describe, it, expect } from "vitest";
import { validateBackup, SCHEMA_VERSION } from "./backup";

const validBackup = () => ({
  version: SCHEMA_VERSION,
  clients: [{ id: "c1", name: "Client", type: "Privat", createdAt: "2026-01-01" }],
  projects: [{ id: "p1", clientId: "c1", items: [], number: "PRJ-1", title: "t", status: "Draft", vatRate: 0.18 }],
  invoices: [{ id: "f1", clientId: "c1", lines: [], vatRate: 0.18, number: "FAT-1", status: "Draft", issuedAt: "d", dueAt: "d", clientName: "Client" }],
  payments: [{ id: "pay1", clientId: "c1", amount: 100, date: "d", method: "m" }],
});

describe("validateBackup", () => {
  it("accepts a valid current-version backup", () => {
    const res = validateBackup(validBackup());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.clients).toHaveLength(1);
      expect(res.data.version).toBe(SCHEMA_VERSION);
    }
  });

  it("rejects non-objects", () => {
    expect(validateBackup(null).ok).toBe(false);
    expect(validateBackup(42).ok).toBe(false);
    expect(validateBackup("nope").ok).toBe(false);
    expect(validateBackup([]).ok).toBe(false);
  });

  it("rejects missing core collections", () => {
    const { clients, ...noClients } = validBackup();
    void clients;
    expect(validateBackup(noClients).ok).toBe(false);
  });

  it("rejects wrong types in collections", () => {
    expect(validateBackup({ ...validBackup(), clients: "oops" }).ok).toBe(false);
    expect(validateBackup({ ...validBackup(), projects: [{ id: "p1" }] }).ok).toBe(false); // missing items array
    expect(validateBackup({ ...validBackup(), payments: [{ id: "x", clientId: "c1", amount: "lots" }] }).ok).toBe(false);
    expect(validateBackup({ ...validBackup(), invoices: [{ id: "f1", clientId: "c1", lines: [] }] }).ok).toBe(false); // missing vatRate
  });

  it("rejects a newer schema version", () => {
    const res = validateBackup({ ...validBackup(), version: SCHEMA_VERSION + 1 });
    expect(res.ok).toBe(false);
  });

  it("migrates a v1 backup (no version field)", () => {
    const { version, ...v1 } = validBackup();
    void version;
    const res = validateBackup(v1);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.migratedFrom).toBe(1);
      expect(res.data.version).toBe(SCHEMA_VERSION);
    }
  });

  it("strips unknown keys so they cannot overwrite store internals", () => {
    const res = validateBackup({ ...validBackup(), addClient: "malicious", __proto__polluted: true, foo: 1 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect("addClient" in res.data).toBe(false);
      expect("foo" in res.data).toBe(false);
    }
  });

  it("optional collections may be absent", () => {
    const res = validateBackup({
      version: SCHEMA_VERSION,
      clients: validBackup().clients,
      projects: validBackup().projects,
    });
    expect(res.ok).toBe(true);
  });
});
