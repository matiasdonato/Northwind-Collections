import type { AgingBucket } from './aging';
import { bucketForDays, daysBetween, daysOverdue, outstandingAmount } from './aging';
import type { PaidInvoiceRecord, PaymentTrend } from './payment-behavior';
import { isConsistentLatePayer, paymentTrend } from './payment-behavior';
import { brokenPromisesCount, hasActivePromise } from './promises';
import { computePriority } from './priority';
import type { ScoreBreakdownItem } from './risk-scoring';
import { scoreCustomer } from './risk-scoring';
import { segmentCustomer, suggestedActionFor } from './segmentation';
import type { CustomerSnapshot, Segment, SuggestedAction } from './types';
import { round2 } from './types';

/**
 * Evaluación integral de un cliente: compone todos los juicios derivados
 * (mora, comportamiento, promesas, segmento, score, prioridad) a partir
 * de los hechos del snapshot. Es la función que alimenta la cola de
 * trabajo y el detalle de cliente.
 */

export interface CustomerEvaluation {
  segment: Segment;
  score: number;
  breakdown: ScoreBreakdownItem[];
  suggestedAction: SuggestedAction;
  priority: number;
  overdueAmount: number;
  maxDaysOverdue: number;
  /** Bucket de la factura más antigua en mora; null si está al día */
  bucket: AgingBucket | null;
  trend: PaymentTrend;
  brokenPromises: number;
  hasActivePromise: boolean;
}

const RECENT_PAYMENT_WINDOW_DAYS = 90;

function paidRecords(snapshot: CustomerSnapshot): PaidInvoiceRecord[] {
  return snapshot.invoices
    .filter((invoice) => invoice.status === 'paid')
    .map((invoice) => {
      const invoicePayments = snapshot.payments.filter((p) => p.invoiceId === invoice.id);
      if (invoicePayments.length === 0) return null;
      const lastPaidAt = invoicePayments.reduce(
        (max, p) => (p.paidAt > max ? p.paidAt : max),
        invoicePayments[0].paidAt,
      );
      return { dueDate: invoice.dueDate, paidAt: lastPaidAt };
    })
    .filter((record): record is PaidInvoiceRecord => record !== null);
}

export function evaluateCustomer(snapshot: CustomerSnapshot, today: Date): CustomerEvaluation {
  const { customer, invoices, payments, actions } = snapshot;

  let overdueAmount = 0;
  let maxDaysOverdue = 0;
  for (const invoice of invoices) {
    const days = daysOverdue(invoice, today);
    if (days <= 0) continue;
    const outstanding = outstandingAmount(invoice, payments);
    if (outstanding <= 0) continue;
    overdueAmount = round2(overdueAmount + outstanding);
    maxDaysOverdue = Math.max(maxDaysOverdue, days);
  }

  const records = paidRecords(snapshot);
  const trend = paymentTrend(records);
  const consistentLatePayer = isConsistentLatePayer(records);
  const hasRecentPayment = payments.some((p) => {
    const age = daysBetween(p.paidAt, today);
    return age >= 0 && age <= RECENT_PAYMENT_WINDOW_DAYS;
  });
  const broken = brokenPromisesCount(actions, payments, today);
  const activePromise = hasActivePromise(actions, payments, today);

  const segment = segmentCustomer({
    maxDaysOverdue,
    overdueAmount,
    hasRecentPayment,
    brokenPromises: broken,
    trend,
    consistentLatePayer,
  });
  const { score, breakdown } = scoreCustomer({
    maxDaysOverdue,
    overdueAmount,
    mrr: customer.mrr,
    brokenPromises: broken,
    trend,
  });
  const priority = computePriority({ score, overdueAmount, hasActivePromise: activePromise });

  return {
    segment,
    score,
    breakdown,
    suggestedAction: suggestedActionFor(segment),
    priority,
    overdueAmount,
    maxDaysOverdue,
    bucket: maxDaysOverdue > 0 ? bucketForDays(maxDaysOverdue) : null,
    trend,
    brokenPromises: broken,
    hasActivePromise: activePromise,
  };
}
