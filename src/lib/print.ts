// Local "PDF" generation via the browser's print dialog (print-to-PDF).
// Opens a self-contained, styled document in a new window and triggers print.
// Stored customer content is escaped at the print-document boundary.

import type { Project, Invoice, CompanyProfile } from "@/domain/types";
import { projectNet, invoiceNet, invoiceTotal } from "@/domain/finance/selectors";

const money = (n: number) =>
  n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export function escapePrintText(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]!);
}

function openPrint(title: string, bodyHtml: string) {
  const w = window.open("", "_blank", "width=820,height=1000");
  if (!w) return false;
  // Disconnect the new same-origin document before writing any stored content.
  w.opener = null;
  w.onload = () => { w.setTimeout(() => w.print(), 250); };
  w.document.write(`<!doctype html><html lang="sq"><head><meta charset="utf-8"><title>${escapePrintText(title)}</title>
  <style>
    *{box-sizing:border-box;font-family:'IBM Plex Sans',system-ui,sans-serif}
    body{margin:0;padding:40px;color:#0f172a;background:#fff;font-size:13px}
    h1{font-family:'Space Grotesk',system-ui,sans-serif;font-size:22px;margin:0 0 4px}
    .muted{color:#64748b}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e2e8f0;padding-bottom:16px;margin-bottom:20px}
    .right{text-align:right}
    table{width:100%;border-collapse:collapse;margin:16px 0}
    th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:1px solid #e2e8f0;padding:8px 6px}
    td{padding:8px 6px;border-bottom:1px solid #f1f5f9}
    .num{text-align:right}
    .totals{width:280px;margin-left:auto;margin-top:12px}
    .totals .row{display:flex;justify-content:space-between;padding:4px 0}
    .totals .grand{background:#eef2ff;font-weight:700;border-radius:8px;padding:10px 12px;margin-top:6px}
    .terms{margin-top:28px;font-size:11px;color:#475569;border-top:1px solid #e2e8f0;padding-top:12px}
    @media print{body{padding:0}}
  </style></head><body>${bodyHtml}
  </body></html>`);
  w.document.close();
  return true;
}

export function printOffer(project: Project, company: CompanyProfile): boolean {
  const net = projectNet(project);
  const vat = net * project.vatRate;
  const rows = project.items
    .map(
      (it, i) => `<tr>
    <td>${escapePrintText(String(i + 1).padStart(2, "0"))}</td>
    <td>${escapePrintText(it.label)}<div class="muted">${escapePrintText(it.widthMm)} × ${escapePrintText(it.heightMm)} mm</div></td>
    <td class="num">${escapePrintText(it.qty)}</td>
    <td class="num">${escapePrintText(money(it.unitPrice))}</td>
    <td class="num">${escapePrintText(money(it.qty * it.unitPrice))}</td>
  </tr>`,
    )
    .join("");
  const body = `
  <div class="head">
    <div><h1>OFERTË</h1><div class="muted">${escapePrintText(project.number)}</div></div>
    <div class="right"><strong>${escapePrintText(company.name)}</strong><div class="muted">${escapePrintText(company.address)}</div><div class="muted">${escapePrintText(company.phone)}</div><div class="muted">NUI ${escapePrintText(company.nui)}</div></div>
  </div>
  <div><strong>Për klientin:</strong> ${escapePrintText(project.clientName)}</div>
  <div class="muted">${escapePrintText(project.profileSystem)} · ${escapePrintText(project.profileColor)}</div>
  <table><thead><tr><th>#</th><th>Përshkrimi</th><th class="num">Sasia</th><th class="num">Çmimi</th><th class="num">Totali</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="5" class="muted">Asnjë pozicion.</td></tr>'}</tbody></table>
  <div class="totals">
    <div class="row"><span class="muted">Nëntotali</span><span>${escapePrintText(money(net))}</span></div>
    <div class="row"><span class="muted">TVSH (${escapePrintText(Math.round(project.vatRate * 100))}%)</span><span>+${escapePrintText(money(vat))}</span></div>
    <div class="grand"><div class="row" style="padding:0"><span>TOTALI</span><span>${escapePrintText(money(net + vat))}</span></div></div>
  </div>
  <div class="terms">${escapePrintText(company.bank)} · IBAN ${escapePrintText(company.iban)}</div>`;
  return openPrint(`Oferta ${project.number}`, body);
}

export function printInvoice(inv: Invoice, company: CompanyProfile): boolean {
  const net = invoiceNet(inv);
  const vat = net * inv.vatRate;
  // Issuer identity is read from the invoice's FROZEN snapshot so re-printing a
  // historical invoice never adopts the org's later details. Fall back to the live
  // profile only for a legacy pre-snapshot invoice ({} snapshot).
  const cs = inv.companySnapshot;
  const issuer = {
    name: cs?.name ?? company.name,
    address: cs?.address ?? company.address,
    nui: cs?.nui ?? company.nui,
    bank: cs?.bank ?? company.bank,
    iban: cs?.iban ?? company.iban,
  };
  const rows = inv.lines
    .map(
      (l) => `<tr><td>${escapePrintText(l.description)}</td><td class="num">${escapePrintText(l.qty)}</td><td class="num">${escapePrintText(money(l.unitPrice))}</td><td class="num">${escapePrintText(money(l.qty * l.unitPrice))}</td></tr>`,
    )
    .join("");
  const body = `
  <div class="head">
    <div><h1>FATURË</h1><div class="muted">${escapePrintText(inv.number)}</div><div class="muted">Ref: ${escapePrintText(inv.reference ?? "—")}</div></div>
    <div class="right"><strong>${escapePrintText(issuer.name)}</strong><div class="muted">${escapePrintText(issuer.address)}</div><div class="muted">NUI ${escapePrintText(issuer.nui)}</div></div>
  </div>
  <div><strong>Klienti:</strong> ${escapePrintText(inv.clientName)}</div>
  <div class="muted">Lëshuar: ${escapePrintText(inv.issuedAt)} · Afati: ${escapePrintText(inv.dueAt)}</div>
  <table><thead><tr><th>Përshkrimi</th><th class="num">Sasia</th><th class="num">Çmimi</th><th class="num">Totali</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="totals">
    <div class="row"><span class="muted">Nëntotali</span><span>${escapePrintText(money(net))}</span></div>
    <div class="row"><span class="muted">TVSH (${escapePrintText(Math.round(inv.vatRate * 100))}%)</span><span>+${escapePrintText(money(vat))}</span></div>
    <div class="grand"><div class="row" style="padding:0"><span>TOTALI</span><span>${escapePrintText(money(invoiceTotal(inv)))}</span></div></div>
  </div>
  <div class="terms">${escapePrintText(issuer.bank)} · IBAN ${escapePrintText(issuer.iban)}</div>`;
  return openPrint(`Fatura ${inv.number}`, body);
}
