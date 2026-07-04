import { DomainError, NotFoundError } from '../domain/errors';
import type { CustomerSnapshot } from '../domain/types';
import { RegisterActionUseCase } from './register-action.usecase';
import { InMemoryCollectionsRepository } from './testing/in-memory-collections.repository';

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const TODAY = d('2026-07-01');

const buildSnapshot = (): CustomerSnapshot => ({
  customer: { id: 'c1', name: 'Cliente SA', size: 'mid', mrr: 1000 },
  invoices: [
    { id: 'i1', customerId: 'c1', amount: 1000, issuedDate: d('2026-05-01'), dueDate: d('2026-06-01'), status: 'open' },
  ],
  payments: [],
  actions: [],
});

describe('RegisterActionUseCase', () => {
  let snapshot: CustomerSnapshot;
  let useCase: RegisterActionUseCase;

  beforeEach(() => {
    snapshot = buildSnapshot();
    useCase = new RegisterActionUseCase(new InMemoryCollectionsRepository([snapshot]));
  });

  it('rechaza clientes inexistentes', async () => {
    await expect(
      useCase.execute({ customerId: 'nope', type: 'call' }, TODAY),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('registra una gestión simple (llamada con notas)', async () => {
    const action = await useCase.execute(
      { customerId: 'c1', type: 'call', notes: 'Se compromete a revisar la factura' },
      TODAY,
    );

    expect(action.type).toBe('call');
    expect(action.promiseStatus).toBeUndefined();
    expect(snapshot.actions).toHaveLength(1);
  });

  it('permite asociar la gestión a una factura del cliente', async () => {
    const action = await useCase.execute(
      { customerId: 'c1', invoiceId: 'i1', type: 'email' },
      TODAY,
    );
    expect(action.invoiceId).toBe('i1');
  });

  it('rechaza facturas que no pertenecen al cliente', async () => {
    await expect(
      useCase.execute({ customerId: 'c1', invoiceId: 'ajena', type: 'email' }, TODAY),
    ).rejects.toBeInstanceOf(DomainError);
  });

  describe('promesas de pago', () => {
    it('exige fecha comprometida', async () => {
      await expect(
        useCase.execute({ customerId: 'c1', type: 'payment_promise' }, TODAY),
      ).rejects.toBeInstanceOf(DomainError);
    });

    it('rechaza fechas comprometidas en el pasado', async () => {
      await expect(
        useCase.execute(
          { customerId: 'c1', type: 'payment_promise', promisedDate: d('2026-06-20') },
          TODAY,
        ),
      ).rejects.toBeInstanceOf(DomainError);
    });

    it('una promesa válida nace pendiente', async () => {
      const action = await useCase.execute(
        { customerId: 'c1', type: 'payment_promise', promisedDate: d('2026-07-10') },
        TODAY,
      );
      expect(action.promiseStatus).toBe('pending');
    });

    it('rechaza fecha comprometida en gestiones que no son promesas', async () => {
      await expect(
        useCase.execute({ customerId: 'c1', type: 'note', promisedDate: d('2026-07-10') }, TODAY),
      ).rejects.toBeInstanceOf(DomainError);
    });
  });
});
