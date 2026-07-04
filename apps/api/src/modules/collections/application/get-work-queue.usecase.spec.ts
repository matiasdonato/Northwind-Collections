import type { CustomerSnapshot } from '../domain/types';
import { GetWorkQueueUseCase } from './get-work-queue.usecase';
import { InMemoryCollectionsRepository } from './testing/in-memory-collections.repository';

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const TODAY = d('2026-07-01');

const snapshots: CustomerSnapshot[] = [
  {
    // al día: no debe aparecer en la cola
    customer: { id: 'sana', name: 'Sana SRL', size: 'mid', mrr: 800 },
    invoices: [
      { id: 's1', customerId: 'sana', amount: 800, issuedDate: d('2026-06-20'), dueDate: d('2026-07-20'), status: 'open' },
    ],
    payments: [],
    actions: [],
  },
  {
    // zombi chico: mora profunda, poca plata
    customer: { id: 'zombi', name: 'Zombi SA', size: 'small', mrr: 200 },
    invoices: [
      { id: 'z1', customerId: 'zombi', amount: 600, issuedDate: d('2026-02-01'), dueDate: d('2026-03-01'), status: 'open' },
    ],
    payments: [],
    actions: [],
  },
  {
    // grande en riesgo: mora media, mucha plata → debe encabezar la cola
    customer: { id: 'grande', name: 'Grande Corp', size: 'enterprise', mrr: 5000 },
    invoices: [
      { id: 'g1', customerId: 'grande', amount: 15000, issuedDate: d('2026-04-15'), dueDate: d('2026-05-15'), status: 'open' },
    ],
    payments: [],
    actions: [],
  },
];

describe('GetWorkQueueUseCase', () => {
  const useCase = new GetWorkQueueUseCase(new InMemoryCollectionsRepository(snapshots));

  it('incluye solo clientes con deuda vencida, ordenados por prioridad descendente', async () => {
    const queue = await useCase.execute({}, TODAY);

    expect(queue.map((i) => i.customerId)).toEqual(['grande', 'zombi']);
    expect(queue[0].priority).toBeGreaterThan(queue[1].priority);
  });

  it('cada ítem trae lo que la analista necesita para decidir', async () => {
    const [first] = await useCase.execute({}, TODAY);

    expect(first.name).toBe('Grande Corp');
    expect(first.segment).toBe('en_riesgo');
    expect(first.suggestedAction).toBe('call');
    expect(first.overdueAmount).toBe(15000);
    expect(first.maxDaysOverdue).toBe(47);
    expect(first.bucket).toBe('31-60');
    expect(first.lastAction).toBeNull();
  });

  it('filtra por segmento', async () => {
    const queue = await useCase.execute({ segment: 'critico' }, TODAY);
    expect(queue.map((i) => i.customerId)).toEqual(['zombi']);
  });

  it('filtra por bucket de antigüedad', async () => {
    const queue = await useCase.execute({ bucket: '90+' }, TODAY);
    expect(queue.map((i) => i.customerId)).toEqual(['zombi']);
  });

  it('busca por nombre (sin distinguir mayúsculas)', async () => {
    const queue = await useCase.execute({ search: 'grande' }, TODAY);
    expect(queue.map((i) => i.customerId)).toEqual(['grande']);
  });
});
