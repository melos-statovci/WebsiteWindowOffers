import { test, expect } from "@playwright/test";
import { printInvoice, printOffer } from "../../src/lib/print";
import type { CompanyProfile, Invoice, Project } from "../../src/domain/types";

const hostile = `</title></td><script>globalThis.__printProbe=1</script><img src=x onerror="globalThis.__printProbe=2">'" &amp;`;
const company: CompanyProfile = {
  name: hostile, address: hostile, phone: hostile, email: hostile, nui: hostile,
  vatNo: hostile, postalCode: hostile, city: hostile, bank: hostile, swift: hostile, iban: hostile,
  marginDefault: 0, vatDefault: 0.18,
};
const project: Project = {
  id: "synthetic", number: hostile, title: hostile, clientId: "synthetic", clientName: hostile,
  createdAt: "2026-09-14", status: "Draft", archived: false, profileSystem: hostile, profileColor: hostile,
  vatRate: 0.18, items: [{ id: "synthetic", kind: "Dritare", label: hostile, widthMm: 1000, heightMm: 1200, qty: 1, unitPrice: 10 }],
};
const invoice: Invoice = {
  id: "synthetic", number: hostile, reference: hostile, clientId: "synthetic", clientName: hostile,
  issuedAt: "2026-09-14", dueAt: "2026-09-15", status: "Draft", vatRate: 0.18,
  companySnapshot: { name: hostile, address: hostile, nui: hostile, bank: hostile, iban: hostile },
  lines: [{ description: hostile, qty: 1, unitPrice: 10 }],
};

for (const kind of ["offer", "invoice"] as const) {
  test(`RC-03 ${kind}: stored hostile text stays inert in the browser parser`, async ({ page }) => {
    let html = "";
    const popup = { opener: {}, onload: null, document: { write: (value: string) => { html = value; }, close: () => {} } };
    const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", { configurable: true, value: { open: () => popup } });
    try {
      expect(kind === "offer" ? printOffer(project, company) : printInvoice(invoice, company)).toBe(true);
    } finally {
      if (previous) Object.defineProperty(globalThis, "window", previous);
      else Reflect.deleteProperty(globalThis, "window");
    }
    expect(popup.opener).toBeNull();
    await page.setContent(html);
    expect(await page.evaluate(() => Reflect.get(globalThis, "__printProbe"))).toBeUndefined();
    await expect(page.locator("script, img, [onerror], [onload]")).toHaveCount(0);
    await expect(page.locator("body")).toContainText(hostile);
    expect(await page.title()).toContain(hostile);
    expect(await page.locator("body").innerText()).not.toMatch(/5.vjet|2.vjet|50%/i);
  });
}
