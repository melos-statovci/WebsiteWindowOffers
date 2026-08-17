// Invoice action cores. Each composes the Phase 3 spine (createAction): Zod
// validation -> auth -> trusted active org -> canonical permission -> withOrg RLS
// transaction -> typed result -> revalidate. The tenant is ALWAYS ctx.organizationId
// (session-derived); any org id in input is ignored and RLS + the composite FKs
// are the backstop.
//
// HISTORICAL DOCUMENT: on creation the invoice FREEZES a client snapshot
// (name + fiscal fields) and its lines. Later changes to the live client/project
// never rewrite it. Totals are DERIVED from the stored lines (selectors); the
// browser never supplies an authoritative total.
//
// MONEY AUTHORITY: createInvoiceFromProject loads the authoritative project items
// from Postgres and snapshots THEIR prices — a browser cannot inject a line price
// or total. createManualInvoice accepts user-entered line prices (legitimate for
// ad-hoc invoices) but recomputes all totals server-side and validates every field.

import { and, asc, eq, sql } from "drizzle-orm";
import { invoices, invoiceLines, projects, projectItems, clients, payments, organizationProfiles } from "@/db/schema/business";
import { organization } from "@/db/auth-schema";
import {
  invoiceFromProjectSchema,
  invoiceManualSchema,
  invoiceStatusSchema,
  invoiceDeleteSchema,
} from "@/domain/validation/invoice";
import { createAction, fail } from "@/server/action";
import { can } from "@/server/authz";
import type { TenantTx } from "@/db/tenant";
import type { InvoiceClientSnapshot, InvoiceCompanySnapshot } from "@/domain/types";

const currentYear = () => new Date().getFullYear();

/** Detect a specific FK/constraint violation across drizzle's wrapped error. */
function isConstraintViolation(e: unknown, name: string): boolean {
  const node = e as { constraint?: string; message?: string; cause?: unknown } | null;
  if (!node) return false;
  if (node.constraint === name) return true;
  if (typeof node.message === "string" && node.message.includes(name)) return true;
  return isConstraintViolation(node.cause, name);
}

interface LineSnapshot {
  description: string;
  qty: number;
  unitPrice: string; // numeric column value (2dp string)
  sourceProjectItemId: string | null;
}

/**
 * Concurrency-safe, tenant-scoped invoice number: serialize per-org with an
 * advisory lock, then take the next suffix for the current year. The
 * UNIQUE(org, number) index is the hard backstop. Mirrors the proven Phase 6
 * project numbering.
 */
async function nextInvoiceNumber(tx: TenantTx, orgId: string): Promise<string> {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext('invoices_number'), hashtext(${orgId}))`,
  );
  const year = currentYear();
  const prefix = `FAT-${year}-`;
  const existing = await tx
    .select({ number: invoices.number })
    .from(invoices)
    .where(and(eq(invoices.organizationId, orgId), sql`${invoices.number} like ${prefix + "%"}`));
  let maxN = 0;
  for (const r of existing) {
    const m = r.number.match(/(\d+)$/);
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
  }
  return `${prefix}${String(maxN + 1).padStart(3, "0")}`;
}

/** Load a client (active org) and freeze its fiscal identity onto the invoice. */
async function clientSnapshot(
  tx: TenantTx,
  orgId: string,
  clientId: string,
): Promise<{ name: string; snapshot: InvoiceClientSnapshot }> {
  const rows = await tx
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.organizationId, orgId)))
    .limit(1);
  if (rows.length === 0) throw fail("VALIDATION", "Klienti nuk i përket organizatës aktive.");
  const c = rows[0];
  const snapshot: InvoiceClientSnapshot = {
    name: c.name,
    type: (c.type as InvoiceClientSnapshot["type"]) ?? "Privat",
    nui: c.nui ?? undefined,
    address: c.address ?? undefined,
    city: c.city ?? undefined,
    email: c.email ?? undefined,
    phone: c.phone ?? undefined,
  };
  return { name: c.name, snapshot };
}

/**
 * Freeze the ISSUER identity from the authoritative server sources
 * (organization.name + the org's organization_profiles row). Never the browser.
 * Missing profile fields simply stay undefined in the snapshot.
 */
async function companySnapshot(tx: TenantTx, orgId: string): Promise<InvoiceCompanySnapshot> {
  const orgRows = await tx
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);
  const profRows = await tx
    .select()
    .from(organizationProfiles)
    .where(eq(organizationProfiles.organizationId, orgId))
    .limit(1);
  const p = profRows[0];
  return {
    name: orgRows[0]?.name ?? undefined,
    address: p?.address ?? undefined,
    city: p?.city ?? undefined,
    postalCode: p?.postalCode ?? undefined,
    phone: p?.phone ?? undefined,
    email: p?.businessEmail ?? undefined,
    nui: p?.nui ?? undefined,
    vatNo: p?.vatNo ?? undefined,
    bank: p?.bank ?? undefined,
    swift: p?.swift ?? undefined,
    iban: p?.iban ?? undefined,
  };
}

/** Insert an invoice header + its lines atomically; returns the new invoice id. */
async function insertInvoice(
  tx: TenantTx,
  values: {
    orgId: string;
    clientId: string;
    projectId: string | null;
    clientName: string;
    clientSnapshot: InvoiceClientSnapshot;
    companySnapshot: InvoiceCompanySnapshot;
    reference: string | null;
    issuedAt: string;
    dueAt: string;
    status: string;
    vatRate: number;
    lines: LineSnapshot[];
  },
): Promise<string> {
  const number = await nextInvoiceNumber(tx, values.orgId);
  let invId: string;
  try {
    const rows = await tx
      .insert(invoices)
      .values({
        organizationId: values.orgId,
        clientId: values.clientId,
        projectId: values.projectId,
        number,
        clientName: values.clientName,
        clientSnapshot: values.clientSnapshot,
        companySnapshot: values.companySnapshot,
        reference: values.reference,
        issuedAt: values.issuedAt,
        dueAt: values.dueAt,
        status: values.status,
        vatRate: values.vatRate.toString(),
      })
      .returning({ id: invoices.id });
    invId = rows[0].id;
  } catch (e) {
    if (isConstraintViolation(e, "invoices_org_client_fk")) {
      throw fail("VALIDATION", "Klienti nuk i përket organizatës aktive.");
    }
    if (isConstraintViolation(e, "invoices_org_project_fk")) {
      throw fail("VALIDATION", "Projekti nuk i përket organizatës aktive.");
    }
    throw e;
  }
  if (values.lines.length > 0) {
    await tx.insert(invoiceLines).values(
      values.lines.map((l, i) => ({
        organizationId: values.orgId,
        invoiceId: invId,
        description: l.description,
        qty: l.qty,
        unitPrice: l.unitPrice,
        sourceProjectItemId: l.sourceProjectItemId,
        sortOrder: i,
      })),
    );
  }
  return invId;
}

// ---------------------------------------------------------------------------
// Create — from an existing project/offer (server-authoritative money)
// ---------------------------------------------------------------------------
export const createInvoiceFromProjectAction = createAction({
  input: invoiceFromProjectSchema,
  permission: { invoice: ["create"] },
  revalidate: ["/invoices", "/dashboard"],
  handler: async ({ input, ctx, tx }) => {
    const orgId = ctx.organizationId;
    // Authoritative project (active org only).
    const projRows = await tx
      .select({
        id: projects.id,
        clientId: projects.clientId,
        number: projects.number,
        vatRate: projects.vatRate,
      })
      .from(projects)
      .where(and(eq(projects.id, input.projectId), eq(projects.organizationId, orgId)))
      .limit(1);
    if (projRows.length === 0) throw fail("NOT_FOUND", "Projekti nuk u gjet.");
    const project = projRows[0];

    // Authoritative items -> snapshot lines (browser cannot influence price).
    const items = await tx
      .select()
      .from(projectItems)
      .where(and(eq(projectItems.projectId, project.id), eq(projectItems.organizationId, orgId)))
      .orderBy(asc(projectItems.sortOrder), asc(projectItems.createdAt), asc(projectItems.id));
    if (items.length === 0) throw fail("RULE_VIOLATION", "Oferta nuk ka artikuj për t'u faturuar.");

    const lines: LineSnapshot[] = items.map((it) => ({
      description: `${it.label} · ${it.widthMm}×${it.heightMm}mm`,
      qty: it.qty,
      unitPrice: Number(it.unitPrice).toFixed(2),
      sourceProjectItemId: it.id,
    }));

    const { name, snapshot } = await clientSnapshot(tx, orgId, project.clientId);
    const company = await companySnapshot(tx, orgId);
    const id = await insertInvoice(tx, {
      orgId,
      clientId: project.clientId,
      projectId: project.id,
      clientName: name,
      clientSnapshot: snapshot,
      companySnapshot: company,
      reference: project.number,
      issuedAt: input.issuedAt,
      dueAt: input.dueAt,
      status: input.status ?? "Dërguar",
      // Bill at the rate the offer was priced at (authoritative), not a browser value.
      vatRate: Number(project.vatRate),
      lines,
    });
    return { id };
  },
});

// ---------------------------------------------------------------------------
// Create — manual/ad-hoc (user-entered lines, server-validated totals)
// ---------------------------------------------------------------------------
export const createManualInvoiceAction = createAction({
  input: invoiceManualSchema,
  permission: { invoice: ["create"] },
  revalidate: ["/invoices", "/dashboard"],
  handler: async ({ input, ctx, tx }) => {
    const orgId = ctx.organizationId;
    const { name, snapshot } = await clientSnapshot(tx, orgId, input.clientId);
    const company = await companySnapshot(tx, orgId);
    const lines: LineSnapshot[] = input.lines.map((l) => ({
      description: l.description,
      qty: l.qty,
      unitPrice: l.unitPrice.toFixed(2),
      sourceProjectItemId: null,
    }));
    const id = await insertInvoice(tx, {
      orgId,
      clientId: input.clientId,
      projectId: null,
      clientName: name,
      clientSnapshot: snapshot,
      companySnapshot: company,
      reference: input.reference?.trim() ? input.reference.trim() : null,
      issuedAt: input.issuedAt,
      dueAt: input.dueAt,
      status: input.status ?? "Draft",
      vatRate: input.vatRate,
      lines,
    });
    return { id };
  },
});

// ---------------------------------------------------------------------------
// Status / delete
// ---------------------------------------------------------------------------
export const setInvoiceStatusAction = createAction({
  input: invoiceStatusSchema,
  permission: { invoice: ["update"] },
  revalidate: ["/invoices", "/dashboard"],
  handler: async ({ input, ctx, tx }) => {
    // Cancelling (Anuluar) is a distinct capability, mirroring project:accept.
    if (input.status === "Anuluar" && !can(ctx.role, { invoice: ["cancel"] })) {
      throw fail("FORBIDDEN", "Nuk keni leje për të anuluar fatura.");
    }
    const rows = await tx
      .update(invoices)
      .set({ status: input.status, updatedAt: new Date() })
      .where(and(eq(invoices.id, input.id), eq(invoices.organizationId, ctx.organizationId)))
      .returning({ id: invoices.id });
    if (rows.length === 0) throw fail("NOT_FOUND", "Fatura nuk u gjet.");
    return { id: rows[0].id };
  },
});

// Invoice deletion is DELIBERATELY narrow. An invoice is a historical accounting
// document: destroying an issued/paid one — or one with payments — is not a normal
// workflow and (via the payments SET NULL FK) would silently convert real payments
// into generic client credit. So a hard delete is permitted ONLY for a Draft or
// already-Cancelled invoice that has NO payments linked. To remove an issued
// invoice, CANCEL it (setInvoiceStatus -> Anuluar). The payments SET NULL FK
// remains a defensive fallback, never the intended path. Server-enforced — hiding
// the UI button is not sufficient.
export const deleteInvoiceAction = createAction({
  input: invoiceDeleteSchema,
  permission: { invoice: ["delete"] },
  revalidate: ["/invoices", "/dashboard"],
  handler: async ({ input, ctx, tx }) => {
    const orgId = ctx.organizationId;
    const rows = await tx
      .select({ id: invoices.id, status: invoices.status })
      .from(invoices)
      .where(and(eq(invoices.id, input.id), eq(invoices.organizationId, orgId)))
      .limit(1)
      .for("update");
    if (rows.length === 0) throw fail("NOT_FOUND", "Fatura nuk u gjet.");
    const status = rows[0].status;

    const payRows = await tx
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.invoiceId, input.id), eq(payments.organizationId, orgId)))
      .limit(1);
    if (payRows.length > 0) {
      throw fail(
        "RULE_VIOLATION",
        "Fatura ka pagesa të lidhura. Hiqni pagesat ose anuloni faturën në vend që ta fshini.",
      );
    }
    if (status !== "Draft" && status !== "Anuluar") {
      throw fail("RULE_VIOLATION", "Faturat e lëshuara duhet të anulohen, jo të fshihen.");
    }

    // Lines cascade via the composite FK.
    await tx.delete(invoices).where(and(eq(invoices.id, input.id), eq(invoices.organizationId, orgId)));
    return { id: input.id };
  },
});
