import type { CollectionAction, Payment, PromiseStatus } from './types';
import { startOfUtcDay } from './types';

/**
 * Ciclo de vida de una promesa de pago.
 * "kept" se persiste transaccionalmente al registrar el pago que la cumple;
 * "broken" se deriva del paso del tiempo al momento de leer (una promesa
 * vencida sin pago no requiere ningún job nocturno para considerarse rota).
 */

export function isPromise(action: CollectionAction): boolean {
  return action.type === 'payment_promise' && action.promisedDate != null;
}

function qualifyingPayment(promise: CollectionAction, payments: Payment[]): Payment | undefined {
  const from = startOfUtcDay(promise.createdAt);
  const until = startOfUtcDay(promise.promisedDate!);
  return payments.find((p) => {
    const paidDay = startOfUtcDay(p.paidAt);
    return paidDay >= from && paidDay <= until;
  });
}

export function effectivePromiseStatus(
  promise: CollectionAction,
  customerPayments: Payment[],
  today: Date,
): PromiseStatus {
  if (promise.promiseStatus === 'kept') return 'kept';
  if (qualifyingPayment(promise, customerPayments)) return 'kept';
  if (startOfUtcDay(today) > startOfUtcDay(promise.promisedDate!)) return 'broken';
  return 'pending';
}

/** Ids de las promesas pendientes que un pago en `paidAt` deja cumplidas */
export function promisesKeptByPayment(
  actions: CollectionAction[],
  customerPayments: Payment[],
  paidAt: Date,
): string[] {
  const paidDay = startOfUtcDay(paidAt);
  return actions
    .filter(isPromise)
    .filter((p) => effectivePromiseStatus(p, customerPayments, paidAt) === 'pending')
    .filter((p) => paidDay <= startOfUtcDay(p.promisedDate!))
    .map((p) => p.id);
}

export function brokenPromisesCount(
  actions: CollectionAction[],
  customerPayments: Payment[],
  today: Date,
): number {
  return actions
    .filter(isPromise)
    .filter((p) => effectivePromiseStatus(p, customerPayments, today) === 'broken').length;
}

export function hasActivePromise(
  actions: CollectionAction[],
  customerPayments: Payment[],
  today: Date,
): boolean {
  return actions
    .filter(isPromise)
    .some((p) => effectivePromiseStatus(p, customerPayments, today) === 'pending');
}
