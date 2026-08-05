import { describe, it, expect } from "vitest";
import {
  projectNet, projectTotal, invoiceNet, invoiceTotal, clientStats, dashboardStats,
} from "./selectors";
import type { Project, Invoice, Payment } from "@/types";

const mkProject = (over: Partial<Project> = {}): Project => ({
  id: "p1", number: "PRJ-1", title: "t", clientId: "c1", clientName: "C",
  createdAt: "2026-01-01", status: "Pranuar", archived: false, vatRate: 0.18,
  profileSystem: "s", profileColor: "x",
  items: [
    { id: "i1", kind: "Dritare", label: "D", widthMm: 1000, heightMm: 1000, qty: 2, unitPrice: 100 },
    { id: "i2", kind: "Dritare", label: "D", widthMm: 1000, heightMm: 1000, qty: 1, unitPrice: 50 },
  ],
  ...over,
});

const mkInvoice = (over: Partial<Invoice> = {}): Invoice => ({
  id: "f1", number: "FAT-1", clientId: "c1", clientName: "C",
  issuedAt: "2026-01-01", dueAt: "2026-01-15", status: "Dërguar", vatRate: 0.18,
  lines: [{ description: "x", qty: 3, unitPrice: 100 }],
  ...over,
});

describe("project totals", () => {
  it("computes net from items", () => {
    expect(projectNet(mkProject())).toBe(250);
  });
  it("applies vat", () => {
    expect(projectTotal(mkProject())).toBeCloseTo(295, 5);
  });
  it("zero vat = net", () => {
    expect(projectTotal(mkProject({ vatRate: 0 }))).toBe(250);
  });
});

describe("invoice totals", () => {
  it("net + vat", () => {
    expect(invoiceNet(mkInvoice())).toBe(300);
    expect(invoiceTotal(mkInvoice())).toBeCloseTo(354, 5);
  });
});

describe("clientStats", () => {
  const projects = [
    mkProject({ id: "p1", clientId: "c1", status: "Pranuar", vatRate: 0 }), // 250
    mkProject({ id: "p2", clientId: "c1", status: "Refuzuar", vatRate: 0 }),
    mkProject({ id: "p3", clientId: "c2", status: "Pranuar", vatRate: 0 }),
  ];
  const payments: Payment[] = [
    { id: "pay1", clientId: "c1", amount: 100, date: "2026-01-02", method: "x" },
  ];

  it("aggregates offers and debt", () => {
    const s = clientStats("c1", projects, [], payments);
    expect(s.offersTotal).toBe(2);
    expect(s.offersAccepted).toBe(1);
    expect(s.offersRejected).toBe(1);
    expect(s.acceptedValue).toBe(250);
    expect(s.paid).toBe(100);
    expect(s.debt).toBe(150);
    expect(s.paymentsCount).toBe(1);
  });

  it("clamps debt at zero when overpaid", () => {
    const s = clientStats("c1", projects, [], [{ id: "x", clientId: "c1", amount: 999, date: "d", method: "m" }]);
    expect(s.debt).toBe(0);
  });
});

describe("dashboardStats", () => {
  it("sums revenue from accepted, received from payments", () => {
    const projects = [
      mkProject({ id: "p1", clientId: "c1", status: "Pranuar", vatRate: 0 }), // 250
      mkProject({ id: "p2", clientId: "c1", status: "Draft", vatRate: 0 }),
      mkProject({ id: "p3", clientId: "c1", status: "Pranuar", archived: true, vatRate: 0 }), // excluded
    ];
    const payments: Payment[] = [{ id: "pay1", clientId: "c1", amount: 100, date: "d", method: "m" }];
    const s = dashboardStats(projects, payments, [{ id: "c1" }]);
    expect(s.revenue).toBe(250);
    expect(s.received).toBe(100);
    expect(s.pending).toBe(150);
    expect(s.jobsInProduction).toBe(1);
    expect(s.offersThisMonth).toBe(2); // active (non-archived)
    expect(s.clientDebt).toBe(150);
  });
});
