import type { Invoice, InvoiceStatus, Payment } from './types';
import { round2, startOfUtcDay } from './types';

export const MS_PER_DAY = 86_400_000;

const UNPAID_STATUSES: InvoiceStatus[] = ['open', 'partially_paid'];

/** Días completos entre dos fechas, a nivel día (puede ser negativo) */
export function daysBetween(from: Date, to: Date): number {
  return Math.floor((startOfUtcDay(to) - startOfUtcDay(from)) / MS_PER_DAY);
}

/**
 * Días de mora de una factura. Una factura está en mora desde el día
 * siguiente a su vencimiento (supuesto documentado en DECISIONS.md).
 * Facturas pagadas o anuladas nunca están en mora.
 */
export function daysOverdue(invoice: Invoice, today: Date): number {
  if (!UNPAID_STATUSES.includes(invoice.status)) return 0;
  return Math.max(0, daysBetween(invoice.dueDate, today));
}

/** Saldo pendiente de una factura, descontando sus pagos */
export function outstandingAmount(invoice: Invoice, payments: Payment[]): number {
  const paid = payments
    .filter((p) => p.invoiceId === invoice.id)
    .reduce((sum, p) => sum + p.amount, 0);
  return Math.max(0, round2(invoice.amount - paid));
}

export type AgingBucket = '0-30' | '31-60' | '61-90' | '90+';

export const AGING_BUCKETS: AgingBucket[] = ['0-30', '31-60', '61-90', '90+'];

export function bucketForDays(days: number): AgingBucket {
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

export interface AgingBucketSummary {
  amount: number;
  invoiceCount: number;
  customerCount: number;
}

export interface AgingReport {
  buckets: Record<AgingBucket, AgingBucketSummary>;
  totalOverdue: number;
}

/** Reporte de antigüedad de la deuda vencida, agrupado por bucket */
export function buildAgingReport(invoices: Invoice[], payments: Payment[], today: Date): AgingReport {
  const buckets = Object.fromEntries(
    AGING_BUCKETS.map((b) => [b, { amount: 0, invoiceCount: 0, customerCount: 0 }]),
  ) as Record<AgingBucket, AgingBucketSummary>;
  const customersPerBucket = new Map<AgingBucket, Set<string>>(
    AGING_BUCKETS.map((b) => [b, new Set<string>()]),
  );

  let totalOverdue = 0;
  for (const invoice of invoices) {
    const days = daysOverdue(invoice, today);
    if (days <= 0) continue;
    const outstanding = outstandingAmount(invoice, payments);
    if (outstanding <= 0) continue;

    const bucket = bucketForDays(days);
    buckets[bucket].amount = round2(buckets[bucket].amount + outstanding);
    buckets[bucket].invoiceCount += 1;
    customersPerBucket.get(bucket)!.add(invoice.customerId);
    totalOverdue = round2(totalOverdue + outstanding);
  }

  for (const bucket of AGING_BUCKETS) {
    buckets[bucket].customerCount = customersPerBucket.get(bucket)!.size;
  }

  return { buckets, totalOverdue };
}
