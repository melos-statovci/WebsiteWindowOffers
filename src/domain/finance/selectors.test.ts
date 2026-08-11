import { describe, it, expect } from "vitest";
import {
  projectNet, projectTotal, invoiceNet, invoiceTotal,
  invoicePaid, invoiceOutstanding, invoicePaymentState,
  clientStats, dashboardStats,
} from "./selectors";
import type { Project, Invoice, Payment } from "@/domain/types";

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

describe("invoice totals & balances", () => {
  it("net + total", () => {
    expect(invoiceNet(mkInvoice())).toBe(300);
    expect(invoiceTotal(mkInvoice())).toBeCloseTo(354, 5);
  });

  it("invoicePaid only counts payments linked to that invoice", () => {
    const payments: Payment[] = [
      { id: "a", clientId: "c1", invoiceId: "f1", amount: 100, date: "d", method: "m" },
      { id: "b", clientId: "c1", invoiceId: "OTHER", amount: 999, date: "d", method: "m" },
      { id: "c", clientId: "c1", amount: 50, date: "d", method: "m" }, // advance, no invoice
    ];
    expect(invoicePaid("f1", payments)).toBe(100);
  });

  it("outstanding = total − paid, clamped at 0", () => {
    const inv = mkInvoice(); // total 354
    expect(invoiceOutstanding(inv, [{ id: "a", clientId: "c1", invoiceId: "f1", amount: 100, date: "d", method: "m" }])).toBeCloseTo(254, 5);
    expect(invoiceOutstanding(inv, [{ id: "a", clientId: "c1", invoiceId: "f1", amount: 999, date: "d", method: "m" }])).toBe(0);
  });

  it("draft & cancelled invoices carry no outstanding balance", () => {
    expect(invoiceOutstanding(mkInvoice({ status: "Draft" }), [])).toBe(0);
    expect(invoiceOutstanding(mkInvoice({ status: "Anuluar" }), [])).toBe(0);
  });

  it("derives payment state", () => {
    const inv = mkInvoice(); // total 354
    const pay = (amount: number): Payment[] => [{ id: "a", clientId: "c1", invoiceId: "f1", amount, date: "d", method: "m" }];
    expect(invoicePaymentState(inv, [])).toBe("unpaid");
    expect(invoicePaymentState(inv, pay(100))).toBe("partial");
    expect(invoicePaymentState(inv, pay(354))).toBe("paid");
    expect(invoicePaymentState(inv, pay(400))).toBe("overpaid");
    expect(invoicePaymentState(mkInvoice({ status: "Draft" }), pay(100))).toBe("draft");
    expect(invoicePaymentState(mkInvoice({ status: "Anuluar" }), pay(100))).toBe("cancelled");
  });
});

describe("clientStats — invoice-based debt", () => {
  const projects = [
    mkProject({ id: "p1", clientId: "c1", status: "Pranuar", vatRate: 0 }), // acceptedValue 250
    mkProject({ id: "p2", clientId: "c1", status: "Refuzuar", vatRate: 0 }),
  ];

  it("debt comes from outstanding invoices, not accepted offers", () => {
    // Accepted offer worth 250, but a 100-total invoice with a 40 payment.
    const invoices = [mkInvoice({ id: "f1", clientId: "c1", vatRate: 0, lines: [{ description: "x", qty: 1, unitPrice: 100 }] })];
    const payments: Payment[] = [{ id: "a", clientId: "c1", invoiceId: "f1", amount: 40, date: "d", method: "m" }];
    const s = clientStats("c1", projects, invoices, payments);
    expect(s.acceptedValue).toBe(250);
    expect(s.invoicedTotal).toBe(100);
    expect(s.outstanding).toBe(60);
    expect(s.paid).toBe(40);
    expect(s.debt).toBe(60); // NOT 210 (acceptedValue − paid)
  });

  it("advance payments become credit and offset debt", () => {
    const invoices = [mkInvoice({ id: "f1", clientId: "c1", vatRate: 0, lines: [{ description: "x", qty: 1, unitPrice: 100 }] })];
    const payments: Payment[] = [{ id: "adv", clientId: "c1", amount: 30, date: "d", method: "m" }]; // no invoiceId
    const s = clientStats("c1", projects, invoices, payments);
    expect(s.advancePaid).toBe(30);
    expect(s.credit).toBe(30);
    expect(s.debt).toBe(70); // 100 outstanding − 30 credit
    expect(s.availableCredit).toBe(0);
  });

  it("overpayment and pure advances surface as available credit", () => {
    const invoices = [mkInvoice({ id: "f1", clientId: "c1", vatRate: 0, lines: [{ description: "x", qty: 1, unitPrice: 100 }] })];
    const payments: Payment[] = [{ id: "a", clientId: "c1", invoiceId: "f1", amount: 130, date: "d", method: "m" }];
    const s = clientStats("c1", projects, invoices, payments);
    expect(s.outstanding).toBe(0);
    expect(s.credit).toBe(30); // overpayment
    expect(s.debt).toBe(0);
    expect(s.availableCredit).toBe(30);
  });

  it("draft invoices are not receivable", () => {
    const invoices = [mkInvoice({ id: "f1", clientId: "c1", status: "Draft", vatRate: 0, lines: [{ description: "x", qty: 1, unitPrice: 100 }] })];
    const s = clientStats("c1", projects, invoices, []);
    expect(s.invoicedTotal).toBe(0);
    expect(s.outstanding).toBe(0);
    expect(s.debt).toBe(0);
  });

  it("payments pointing at a deleted invoice count as advances (no orphaned money)", () => {
    const s = clientStats("c1", projects, [], [{ id: "x", clientId: "c1", invoiceId: "gone", amount: 25, date: "d", method: "m" }]);
    expect(s.advancePaid).toBe(25);
    expect(s.paid).toBe(25);
  });
});

describe("dashboardStats", () => {
  const projects = [
    mkProject({ id: "p1", clientId: "c1", status: "Pranuar", vatRate: 0, createdAt: "2026-08-02" }), // 250
    mkProject({ id: "p2", clientId: "c1", status: "Draft", vatRate: 0, createdAt: "2026-08-05" }),
    mkProject({ id: "p3", clientId: "c1", status: "Pranuar", archived: true, vatRate: 0 }), // excluded
  ];
  const invoices = [
    mkInvoice({ id: "f1", clientId: "c1", vatRate: 0, lines: [{ description: "x", qty: 1, unitPrice: 200 }] }), // total 200
    mkInvoice({ id: "f2", clientId: "c1", status: "Draft", vatRate: 0, lines: [{ description: "x", qty: 1, unitPrice: 500 }] }), // draft → excluded
  ];
  const payments: Payment[] = [{ id: "a", clientId: "c1", invoiceId: "f1", amount: 80, date: "d", method: "m" }];
  const now = new Date("2026-08-11T00:00:00Z");

  it("uses invoice-based receivables and shared debt source", () => {
    const s = dashboardStats(projects, invoices, payments, [{ id: "c1" }], now);
    expect(s.acceptedCount).toBe(1);
    expect(s.acceptedValue).toBe(250);
    expect(s.invoicedTotal).toBe(200); // draft excluded
    expect(s.received).toBe(80);
    expect(s.outstanding).toBe(120); // 200 − 80
    expect(s.outstandingCount).toBe(1);
    expect(s.clientDebt).toBe(120);
    expect(s.offersThisMonth).toBe(2); // 2 active offers created in Aug 2026
  });
});
