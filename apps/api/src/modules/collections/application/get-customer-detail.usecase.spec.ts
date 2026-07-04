import { NotFoundError } from '../domain/errors';
import type { CustomerSnapshot } from '../domain/types';
import { GetCustomerDetailUseCase } from './get-customer-detail.usecase';
import { InMemoryCollectionsRepository } from './testing/in-memory-collections.repository';

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const TODAY = d('2026-07-01');

const snapshot: CustomerSnapshot = {
  customer: { id: 'c1', name: 'Cliente SA', size: 'mid', mrr: 1000 },
  invoices: [
    { id: 'vieja', customerId: 'c1', amount: 1000, issuedDate: d('2026-04-01'), dueDate: d('2026-05-01'), status: 'partially_paid' },
    { id: 'nueva', customerId: 'c1', amount: 500, issuedDate: d('2026-06-20'), dueDate: d('2026-07-20'), status: 'open' },
  ],
  payments: [{ id: 'p1', invoiceId: 'vieja', amount: 400, paidAt: d('2026-06-01') }],
  actions: [
    {
      id: 'promesa-vencida',
      customerId: 'c1',
      type: 'payment_promise',
      promisedDate: d('2026-06-20'),
      promiseStatus: 'pending',
      createdAt: d('2026-06-10T10:00:00Z'),
    },
    {
      id: 'llamada',
      customerId: 'c1',
      type: 'call',
      notes: 'No contesta',
      createdAt: d('2026-06-25T15:00:00Z'),
    },
  ],
};

describe('GetCustomerDetailUseCase', () => {
  const useCase = new GetCustomerDetailUseCase(new InMemoryCollectionsRepository([snapshot]));

  it('rechaza clientes inexistentes', async () => {
    await expect(useCase.execute('nope', TODAY)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('devuelve las facturas con días de mora y saldo pendiente', async () => {
    const detail = await useCase.execute('c1', TODAY);

    const vieja = detail.invoices.find((i) => i.id === 'vieja');
    expect(vieja).toMatchObject({ daysOverdue: 61, outstanding: 600 });

    const nueva = detail.invoices.find((i) => i.id === 'nueva');
    expect(nueva).toMatchObject({ daysOverdue: 0, outstanding: 500 });
  });

  it('devuelve la evaluación completa con el desglose del score', async () => {
    const detail = await useCase.execute('c1', TODAY);

    expect(detail.evaluation.segment).toBe('en_riesgo'); // promesa incumplida
    expect(detail.evaluation.breakdown.length).toBeGreaterThan(0);
  });

  it('el historial llega ordenado del más reciente al más viejo, con el estado efectivo de las promesas', async () => {
    const detail = await useCase.execute('c1', TODAY);

    expect(detail.actions.map((a) => a.id)).toEqual(['llamada', 'promesa-vencida']);
    // estaba persistida como pending, pero la fecha pasó sin pago posterior a su creación
    expect(detail.actions[1].promiseStatus).toBe('broken');
  });
});
