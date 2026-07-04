import type { PaymentTrend } from './payment-behavior';
import type { Segment, SuggestedAction } from './types';

/**
 * Segmentación por reglas explicables, mapeada a los arquetipos reales
 * del negocio (ver DECISIONS.md, Decisión 4). Las reglas se evalúan en orden.
 */

export interface SegmentationInput {
  maxDaysOverdue: number;
  overdueAmount: number;
  /** ¿Registró algún pago en los últimos 90 días? */
  hasRecentPayment: boolean;
  brokenPromises: number;
  trend: PaymentTrend;
  consistentLatePayer: boolean;
}

const CRITICAL_DAYS = 90;
const RISK_DAYS = 30;

export function segmentCustomer(input: SegmentationInput): Segment {
  // 1. Sin deuda vencida no hay nada que gestionar
  if (input.overdueAmount <= 0) return 'al_dia';

  // 2. El zombi: mora profunda y sin señales de vida (ningún pago reciente)
  if (input.maxDaysOverdue > CRITICAL_DAYS && !input.hasRecentPayment) return 'critico';

  // 3. Señales de deterioro: promesa incumplida, comportamiento empeorando,
  //    o mora media/alta sin un patrón consistente que la explique
  if (
    input.brokenPromises > 0 ||
    input.trend === 'worsening' ||
    (input.maxDaysOverdue > RISK_DAYS && !input.consistentLatePayer)
  ) {
    return 'en_riesgo';
  }

  // 4. Mora temprana o moroso consistente y predecible
  return 'mora_administrativa';
}

const ACTION_BY_SEGMENT: Record<Segment, SuggestedAction> = {
  al_dia: 'none',
  mora_administrativa: 'soft_reminder',
  en_riesgo: 'call',
  critico: 'escalate',
};

export function suggestedActionFor(segment: Segment): SuggestedAction {
  return ACTION_BY_SEGMENT[segment];
}
