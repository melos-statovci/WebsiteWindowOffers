import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { paymentOperations, payments } from "@/db/schema/business";
import type { TenantTx } from "@/db/tenant";
import type { AdvancePaymentInput, RecordInvoicePaymentInput } from "@/domain/validation/payment";
import { fail } from "@/server/action";

export type PaymentOperationType = "INVOICE_PAYMENT" | "ADVANCE_PAYMENT";

interface NewPaymentReceipt {
  paymentId: string;
  paidInFull?: boolean;
  credit?: number;
}

export interface IdempotentPaymentResult {
  /** The payment created by the original operation. */
  id: string;
  /** PAYMENT_REMOVED is a tombstoned success: the old command is never rerun. */
  outcome: "RECORDED" | "PAYMENT_REMOVED";
  replayed: boolean;
  paymentExists: boolean;
  paidInFull?: boolean;
  credit?: number;
}

function fingerprint(parts: readonly (string | boolean | null)[]): string {
  // An ordered tuple is the canonical representation. It cannot vary with JSON
  // object key order and contains only validated fields defining the operation.
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

function normalizedMoney(amount: number): string {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

export function invoicePaymentFingerprint(input: RecordInvoicePaymentInput): string {
  return fingerprint([
    "INVOICE_PAYMENT",
    input.invoiceId.toLowerCase(),
    normalizedMoney(input.amount),
    input.date,
    input.method,
    input.note || null,
    input.allowCredit ?? false,
  ]);
}

export function advancePaymentFingerprint(input: AdvancePaymentInput): string {
  return fingerprint([
    "ADVANCE_PAYMENT",
    input.clientId.toLowerCase(),
    normalizedMoney(input.amount),
    input.date,
    input.method,
    input.note || null,
  ]);
}

export async function executeIdempotentPaymentOperation(args: {
  tx: TenantTx;
  organizationId: string;
  operationKey: string;
  operationType: PaymentOperationType;
  requestHash: string;
  execute: () => Promise<NewPaymentReceipt>;
}): Promise<IdempotentPaymentResult> {
  const { tx, organizationId, operationKey, operationType, requestHash } = args;

  // Transaction-local and tenant-key scoped. Collisions in hashtext can only
  // serialize unrelated commands; they cannot merge them because the durable
  // receipt is still matched by the exact (organization_id, operation_key).
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${organizationId}), hashtext(${operationKey}))`,
  );

  const existing = await tx
    .select({
      operationType: paymentOperations.operationType,
      requestHash: paymentOperations.requestHash,
      paymentId: paymentOperations.paymentId,
      paidInFull: paymentOperations.paidInFull,
      credit: paymentOperations.credit,
    })
    .from(paymentOperations)
    .where(
      and(
        eq(paymentOperations.organizationId, organizationId),
        eq(paymentOperations.operationKey, operationKey),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    const receipt = existing[0];
    if (receipt.operationType !== operationType || receipt.requestHash !== requestHash) {
      throw fail("CONFLICT", "Ky çelës operacioni është përdorur për një pagesë tjetër.");
    }

    const payment = await tx
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.organizationId, organizationId), eq(payments.id, receipt.paymentId)))
      .limit(1);
    if (payment.length === 0) {
      return {
        id: receipt.paymentId,
        outcome: "PAYMENT_REMOVED",
        replayed: true,
        paymentExists: false,
      };
    }

    return {
      id: receipt.paymentId,
      outcome: "RECORDED",
      replayed: true,
      paymentExists: true,
      paidInFull: receipt.paidInFull ?? undefined,
      credit: receipt.credit == null ? undefined : Number(receipt.credit),
    };
  }

  const created = await args.execute();
  await tx.insert(paymentOperations).values({
    organizationId,
    operationKey,
    operationType,
    requestHash,
    paymentId: created.paymentId,
    paidInFull: created.paidInFull,
    credit: created.credit == null ? null : normalizedMoney(created.credit),
  });

  return {
    id: created.paymentId,
    outcome: "RECORDED",
    replayed: false,
    paymentExists: true,
    paidInFull: created.paidInFull,
    credit: created.credit,
  };
}
