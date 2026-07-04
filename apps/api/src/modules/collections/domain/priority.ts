import { round2 } from './types';

/**
 * Prioridad en la cola de trabajo: riesgo × plata en juego.
 * Un zombi de USD 200 no debe desplazar a un cliente en riesgo de USD 15.000.
 * Una promesa vigente amortigua la prioridad: ya fue gestionado,
 * corresponde esperar a la fecha comprometida.
 */

export interface PriorityInput {
  score: number;
  overdueAmount: number;
  hasActivePromise: boolean;
}

const ACTIVE_PROMISE_DAMPENER = 0.25;

export function computePriority(input: PriorityInput): number {
  const base = input.score * input.overdueAmount;
  return round2(input.hasActivePromise ? base * ACTIVE_PROMISE_DAMPENER : base);
}
