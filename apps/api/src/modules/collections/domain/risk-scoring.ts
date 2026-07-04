import type { PaymentTrend } from './payment-behavior';

/**
 * Score de riesgo 0-100 por reglas explicables (DECISIONS.md, Decisión 3).
 * Cada factor devuelve sus puntos junto con la razón: el usuario de finanzas
 * siempre puede ver POR QUÉ un cliente tiene el score que tiene.
 *
 * Pesos: días de mora 40 / exposición 25 / promesas rotas 20 / tendencia 15.
 */

export interface ScoringInput {
  maxDaysOverdue: number;
  overdueAmount: number;
  mrr: number;
  brokenPromises: number;
  trend: PaymentTrend;
}

export interface ScoreBreakdownItem {
  factor: string;
  points: number;
  maxPoints: number;
  reason: string;
}

export interface RiskScore {
  score: number;
  breakdown: ScoreBreakdownItem[];
}

const DAYS_SATURATION = 90;
const EXPOSURE_MRR_MULTIPLE = 3;
const POINTS_PER_BROKEN_PROMISE = 10;
const MAX_BROKEN_PROMISES_COUNTED = 2;

function daysFactor(input: ScoringInput): ScoreBreakdownItem {
  const ratio = Math.min(input.maxDaysOverdue / DAYS_SATURATION, 1);
  return {
    factor: 'days_overdue',
    points: Math.round(ratio * 40),
    maxPoints: 40,
    reason:
      input.maxDaysOverdue > 0
        ? `Factura más antigua con ${input.maxDaysOverdue} días de mora (satura a los ${DAYS_SATURATION})`
        : 'Sin facturas vencidas',
  };
}

function exposureFactor(input: ScoringInput): ScoreBreakdownItem {
  let ratio: number;
  if (input.overdueAmount <= 0) {
    ratio = 0;
  } else if (input.mrr <= 0) {
    // Sin MRR de referencia no se puede relativizar: exposición máxima
    ratio = 1;
  } else {
    ratio = Math.min(input.overdueAmount / (EXPOSURE_MRR_MULTIPLE * input.mrr), 1);
  }
  return {
    factor: 'exposure',
    points: Math.round(ratio * 25),
    maxPoints: 25,
    reason:
      input.overdueAmount > 0
        ? `USD ${input.overdueAmount} vencidos sobre un MRR de USD ${input.mrr} (satura a ${EXPOSURE_MRR_MULTIPLE}× el MRR)`
        : 'Sin deuda vencida',
  };
}

function brokenPromisesFactor(input: ScoringInput): ScoreBreakdownItem {
  const counted = Math.min(input.brokenPromises, MAX_BROKEN_PROMISES_COUNTED);
  return {
    factor: 'broken_promises',
    points: counted * POINTS_PER_BROKEN_PROMISE,
    maxPoints: MAX_BROKEN_PROMISES_COUNTED * POINTS_PER_BROKEN_PROMISE,
    reason:
      input.brokenPromises > 0
        ? `${input.brokenPromises} promesa(s) de pago incumplida(s)`
        : 'Sin promesas incumplidas',
  };
}

function trendFactor(input: ScoringInput): ScoreBreakdownItem {
  const reasons: Record<PaymentTrend, string> = {
    worsening: 'Paga cada vez más tarde: señal de deterioro',
    improving: 'Comportamiento de pago mejorando',
    stable: 'Comportamiento de pago estable',
    unknown: 'Sin historial suficiente para evaluar tendencia',
  };
  return {
    factor: 'trend',
    points: input.trend === 'worsening' ? 15 : 0,
    maxPoints: 15,
    reason: reasons[input.trend],
  };
}

export function scoreCustomer(input: ScoringInput): RiskScore {
  const breakdown = [
    daysFactor(input),
    exposureFactor(input),
    brokenPromisesFactor(input),
    trendFactor(input),
  ];
  const score = Math.min(
    100,
    breakdown.reduce((sum, item) => sum + item.points, 0),
  );
  return { score, breakdown };
}
