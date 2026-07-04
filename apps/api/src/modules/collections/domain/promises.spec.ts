import {
  brokenPromisesCount,
  effectivePromiseStatus,
  hasActivePromise,
  promisesKeptByPayment,
} from './promises';
import type { CollectionAction, Payment } from './types';

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const TODAY = d('2026-07-01');

let seq = 0;
const promiseAction = (overrides: Partial<CollectionAction> = {}): CollectionAction => ({
  id: `act-${++seq}`,
  customerId: 'cust-1',
  type: 'payment_promise',
  promisedDate: d('2026-07-10'),
  promiseStatus: 'pending',
  createdAt: d('2026-06-25'),
  ...overrides,
});

const payment = (paidAt: Date): Payment => ({
  id: `pay-${++seq}`,
  invoiceId: 'inv-1',
  amount: 100,
  paidAt,
});

describe('effectivePromiseStatus', () => {
  it('es pending mientras la promesa está vigente y no hay pago', () => {
    expect(effectivePromiseStatus(promiseAction(), [], TODAY)).toBe('pending');
  });

  it('es kept si hubo un pago entre la creación y la fecha prometida', () => {
    const status = effectivePromiseStatus(promiseAction(), [payment(d('2026-06-28'))], TODAY);
    expect(status).toBe('kept');
  });

  it('es broken si la fecha prometida pasó sin pagos', () => {
    const expired = promiseAction({ promisedDate: d('2026-06-28') });
    expect(effectivePromiseStatus(expired, [], TODAY)).toBe('broken');
  });

  it('es broken si el pago llegó después de la fecha prometida', () => {
    const expired = promiseAction({ promisedDate: d('2026-06-27') });
    expect(effectivePromiseStatus(expired, [payment(d('2026-06-30'))], TODAY)).toBe('broken');
  });

  it('respeta el estado kept ya persistido', () => {
    const kept = promiseAction({ promiseStatus: 'kept', promisedDate: d('2026-06-20') });
    expect(effectivePromiseStatus(kept, [], TODAY)).toBe('kept');
  });

  it('ignora pagos anteriores a la creación de la promesa', () => {
    const status = effectivePromiseStatus(promiseAction(), [payment(d('2026-06-20'))], TODAY);
    expect(status).toBe('pending');
  });
});

describe('promisesKeptByPayment', () => {
  it('devuelve las promesas pendientes cuya fecha límite cubre el pago', () => {
    const vigente = promiseAction({ id: 'vigente' });
    const vencida = promiseAction({ id: 'vencida', promisedDate: d('2026-06-28') });
    const yaKept = promiseAction({ id: 'kept', promiseStatus: 'kept' });

    const keptIds = promisesKeptByPayment([vigente, vencida, yaKept], [], TODAY);

    expect(keptIds).toEqual(['vigente']);
  });

  it('ignora acciones que no son promesas', () => {
    const llamada = promiseAction({ type: 'call', promisedDate: undefined });
    expect(promisesKeptByPayment([llamada], [], TODAY)).toEqual([]);
  });
});

describe('brokenPromisesCount / hasActivePromise', () => {
  it('cuenta las promesas incumplidas', () => {
    const actions = [
      promiseAction({ promisedDate: d('2026-06-10') }), // rota
      promiseAction({ promisedDate: d('2026-06-15') }), // rota
      promiseAction(), // vigente
    ];
    expect(brokenPromisesCount(actions, [], TODAY)).toBe(2);
  });

  it('detecta si hay una promesa vigente', () => {
    expect(hasActivePromise([promiseAction()], [], TODAY)).toBe(true);
    expect(hasActivePromise([promiseAction({ promisedDate: d('2026-06-10') })], [], TODAY)).toBe(false);
    expect(hasActivePromise([], [], TODAY)).toBe(false);
  });
});
