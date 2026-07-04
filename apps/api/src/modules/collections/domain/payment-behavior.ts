import { daysBetween } from './aging';

/**
 * Comportamiento histórico de pago: se calcula sobre facturas ya pagadas
 * (fecha de vencimiento vs fecha de pago). Es la señal que permite
 * distinguir al "enterprise de proceso lento" (predecible) de la
 * "startup que se está quedando sin caja" (empeorando).
 */

export interface PaidInvoiceRecord {
  dueDate: Date;
  paidAt: Date;
}

export type PaymentTrend = 'improving' | 'stable' | 'worsening' | 'unknown';

/** Días de atraso de un pago (negativo si pagó antes del vencimiento) */
export function daysLate(record: PaidInvoiceRecord): number {
  return daysBetween(record.dueDate, record.paidAt);
}

const TREND_THRESHOLD_DAYS = 15;
const CONSISTENCY_TOLERANCE_DAYS = 15;

const avg = (values: number[]): number => values.reduce((s, v) => s + v, 0) / values.length;

// Se ordena por vencimiento (el ciclo de facturación), no por fecha de pago:
// un pago puntual reciente puede ser anterior en el tiempo a un pago tardío
// de un ciclo previo, y la tendencia se mide ciclo a ciclo.
const sortByDueDate = (records: PaidInvoiceRecord[]): PaidInvoiceRecord[] =>
  [...records].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

/**
 * Compara los últimos 2 ciclos de facturación contra el historial previo.
 * Requiere al menos 4 registros para opinar.
 */
export function paymentTrend(records: PaidInvoiceRecord[]): PaymentTrend {
  if (records.length < 4) return 'unknown';

  const lateness = sortByDueDate(records).map(daysLate);
  const recent = lateness.slice(-2);
  const base = lateness.slice(0, -2);

  const delta = avg(recent) - avg(base);
  if (delta >= TREND_THRESHOLD_DAYS) return 'worsening';
  if (delta <= -TREND_THRESHOLD_DAYS) return 'improving';
  return 'stable';
}

/**
 * Moroso consistente: paga tarde en promedio, pero con baja dispersión.
 * Es mora "administrativa": molesto para la caja, pero predecible y cobrable.
 */
export function isConsistentLatePayer(records: PaidInvoiceRecord[]): boolean {
  if (records.length < 3) return false;

  const lateness = records.map(daysLate);
  const mean = avg(lateness);
  if (mean <= 0) return false;

  return lateness.every((l) => Math.abs(l - mean) <= CONSISTENCY_TOLERANCE_DAYS);
}
