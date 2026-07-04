import { DomainError, NotFoundError } from '../domain/errors';
import type { CustomerSnapshot } from '../domain/types';
import { RegisterPaymentUseCase } from './register-payment.usecase';
import { InMemoryCollectionsRepository } from './testing/in-memory-collections.repository';

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const TODAY = d('2026-07-01');

const buildSnapshot = (): CustomerSnapshot => ({
  customer: { id: 'c1', name: 'Cliente SA', size: 'mid', mrr: 1000 },
  invoices: [
    { id: 'i1', customerId: 'c1', amount: 1000, issuedDate: d('2026-05-01'), dueDate: d('2026-06-01'), status: 'open' },
  ],
  payments: [],
  actions: [
    {
      id: 'promesa-1',
      customerId: 'c1',
      type: 'payment_promise',
      promisedDate: d('2026-07-10'),
      promiseStatus: 'pending',
      createdAt: d('2026-06-25'),
    },
  ],
});

describe('RegisterPaymentUseCase', () => {
  let snapshot: CustomerSnapshot;
  let repository: InMemoryCollectionsRepository;
  let useCase: RegisterPaymentUseCase;

  beforeEach(() => {
    snapshot = buildSnapshot();
    repository = new InMemoryCollectionsRepository([snapshot]);
    useCase = new RegisterPaymentUseCase(repository);
  });

  it('rechaza pagos sobre facturas inexistentes', async () => {
    await expect(
      useCase.execute({ invoiceId: 'nope', amount: 100 }, TODAY),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rechaza pagos que superan el saldo (regla del dominio)', async () => {
    await expect(
      useCase.execute({ invoiceId: 'i1', amount: 1500 }, TODAY),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it('rechaza fechas de pago futuras', async () => {
    await expect(
      useCase.execute({ invoiceId: 'i1', amount: 100, paidAt: d('2026-07-15') }, TODAY),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it('un pago parcial persiste el pago y deja la factura en partially_paid', async () => {
    const result = await useCase.execute({ invoiceId: 'i1', amount: 400 }, TODAY);

    expect(result.invoiceStatus).toBe('partially_paid');
    expect(result.outstandingAfter).toBe(600);
    expect(snapshot.payments).toHaveLength(1);
    expect(snapshot.invoices[0].status).toBe('partially_paid');
  });

  it('un pago total marca la factura pagada y cumple la promesa vigente', async () => {
    const result = await useCase.execute({ invoiceId: 'i1', amount: 1000 }, TODAY);

    expect(result.invoiceStatus).toBe('paid');
    expect(result.keptPromiseIds).toEqual(['promesa-1']);
    expect(snapshot.invoices[0].status).toBe('paid');
    expect(snapshot.actions[0].promiseStatus).toBe('kept');
  });

  it('usa la fecha de hoy cuando no se indica fecha de pago', async () => {
    const result = await useCase.execute({ invoiceId: 'i1', amount: 100 }, TODAY);
    expect(result.payment.paidAt).toEqual(TODAY);
  });
});
