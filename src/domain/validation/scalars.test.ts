import { describe, it, expect } from "vitest";
import { windowConfigSchema } from "./project";
import { validCommercialTotal } from "./commercial";
import { isCalendarDate, monetaryValue } from "./scalars";
import { recordInvoicePaymentSchema } from "./payment";
import { defaultPricingCatalog } from "../pricing/defaults";
import { pricingCatalogSchema } from "./pricing";

describe("semantic numeric/calendar boundaries", () => {
  it.each(["2026-02-30", "2025-02-29", "1900-02-29", "2026-04-31", "0000-01-01", "2026-13-01"])("rejects impossible date %s", (date) => expect(isCalendarDate(date)).toBe(false));
  it.each(["2024-02-29", "2000-02-29", "2026-12-31"])("accepts calendar date %s", (date) => expect(isCalendarDate(date)).toBe(true));
  it("rejects fractional cents, nonfinite and extreme amounts", () => {
    for (const n of [0.001, 1.234, Infinity, NaN, 1e308]) expect(monetaryValue.safeParse(n).success).toBe(false);
    expect(monetaryValue.safeParse(12.34).success).toBe(true);
  });
  it("does not let sub-cent receipts become zero payments", () => {
    expect(recordInvoicePaymentSchema.safeParse({ invoiceId: "00000000-0000-4000-8000-000000000001", amount: 0.001, date: "2026-09-11", method: "cash" }).success).toBe(false);
  });
  it("rejects finite prices that would overflow calculation", () => {
    const catalog = defaultPricingCatalog(); catalog.profilePriceRows[0].white = 1e308;
    expect(pricingCatalogSchema.safeParse(catalog).success).toBe(false);
  });
});


describe("explicit catalog and computed-money semantics", () => {
  it("rejects duplicate catalog identifiers", () => {
    const catalog = defaultPricingCatalog(); catalog.glass.push({ ...catalog.glass[0] });
    expect(pricingCatalogSchema.safeParse(catalog).success).toBe(false);
  });
  it.each(["Infinity", "1e308", "-1", "nonsense"])("rejects invalid numeric bead price %s", (price) => {
    const catalog = defaultPricingCatalog(); catalog.accessoryParams["Llajsne bardhë (€/m)"] = price;
    expect(pricingCatalogSchema.safeParse(catalog).success).toBe(false);
  });
  it("refuses unknown fixed catalog choices instead of manufacturing fallback products", () => {
    const config = { productType: "Dritare", modelType: "njeshe", widthMm: 1000, heightMm: 1200, systemId: "s1", color: "white", mechanismId: "invented", glassId: "g1", roleta: false, shtesa: [], openings: {} };
    expect(windowConfigSchema.safeParse(config).success).toBe(false);
    expect(windowConfigSchema.safeParse({ ...config, mechanismId: "Roto NX", doorModel: "invented" }).success).toBe(false);
  });
  it("rejects nonfinite or unrepresentable commercial totals", () => {
    for (const total of [Infinity, NaN, 1e308, 10_000_000_000, -1]) expect(validCommercialTotal(total)).toBe(false);
    expect(validCommercialTotal(9_999_999_999.99)).toBe(true);
  });
});
