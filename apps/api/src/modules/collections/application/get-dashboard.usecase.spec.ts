import type { CustomerSnapshot } from '../domain/types';
import { GetDashboardUseCase } from './get-dashboard.usecase';
import { InMemoryCollectionsRepository } from './testing/in-memory-collections.repository';

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const TODAY = d('2026-07-01');

const snapshots: CustomerSnapshot[] = [
  {
    customer: { id: 'sana', name: 'Sana SRL', size: 'mid', mrr: 800 },
    invoices: [
      { id: 's1', customerId: 'sana', amount: 800, issuedDate: d('2026-06-20'), dueDate: d('2026-07-20'), status: 'open' },
    ],
    payments: [],
    actions: [],
  },
  {
    customer: { id: 'zombi', name: 'Zombi SA', size: 'small', mrr: 200 },
    invoices: [
      { id: 'z1', customerId: 'zombi', amount: 600, issuedDate: d('2026-02-01'), dueDate: d('2026-03-01'), status: 'open' },
    ],
    payments: [],
    actions: [],
  },
  {
    customer: { id: 'grande', name: 'Grande Corp', size: 'enterprise', mrr: 5000 },
    invoices: [
      { id: 'g1', customerId: 'grande', amount: 15000, issuedDate: d('2026-04-15'), dueDate: d('2026-05-15'), status: 'open' },
    ],
    payments: [],
    actions: [],
  },
];

describe('GetDashboardUseCase', () => {
  const useCase = new GetDashboardUseCase(new InMemoryCollectionsRepository(snapshots));

  it('compone KPIs, aging y composición por segmento en una sola vista', async () => {
    const dashboard = await useCase.execute(TODAY);

    expect(dashboard.kpis.totalOverdue).toBe(15600);
    expect(dashboard.kpis.customersInArrears).toBe(2);

    expect(dashboard.aging.buckets['31-60'].amount).toBe(15000);
    expect(dashboard.aging.buckets['90+'].amount).toBe(600);

    const bySegment = Object.fromEntries(dashboard.segments.map((s) => [s.segment, s]));
    expect(bySegment['al_dia'].customerCount).toBe(1);
    expect(bySegment['en_riesgo']).toMatchObject({ customerCount: 1, overdueAmount: 15000 });
    expect(bySegment['critico']).toMatchObject({ customerCount: 1, overdueAmount: 600 });
  });

  it('siempre devuelve los 4 segmentos, aunque estén vacíos', async () => {
    const dashboard = await useCase.execute(TODAY);
    expect(dashboard.segments).toHaveLength(4);
    expect(dashboard.segments.map((s) => s.segment)).toEqual([
      'al_dia',
      'mora_administrativa',
      'en_riesgo',
      'critico',
    ]);
  });
});
