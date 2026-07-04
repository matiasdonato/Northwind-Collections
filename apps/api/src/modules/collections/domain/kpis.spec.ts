import { computeKpis } from './kpis';
import type { CustomerSnapshot } from './types';

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const TODAY = d('2026-07-01');

const snapshots: CustomerSnapshot[] = [
  {
    customer: { id: 'c1', name: 'Sana SRL', size: 'mid', mrr: 1000 },
    invoices: [
      // pagada: emitida 01/06, vencía 15/06, se pagó el 20/06
      { id: 'i1', customerId: 'c1', amount: 3000, issuedDate: d('2026-06-01'), dueDate: d('2026-06-15'), status: 'paid' },
      // abierta pero no vencida
      { id: 'i2', customerId: 'c1', amount: 1000, issuedDate: d('2026-06-20'), dueDate: d('2026-07-20'), status: 'open' },
    ],
    payments: [{ id: 'p1', invoiceId: 'i1', amount: 3000, paidAt: d('2026-06-20') }],
    actions: [],
  },
  {
    customer: { id: 'c2', name: 'Morosa SA', size: 'small', mrr: 500 },
    invoices: [
      // vencida hace 30 días
      { id: 'i3', customerId: 'c2', amount: 2000, issuedDate: d('2026-05-15'), dueDate: d('2026-06-01'), status: 'open' },
    ],
    payments: [],
    actions: [
      {
        id: 'a1',
        customerId: 'c2',
        type: 'payment_promise',
        promisedDate: d('2026-07-05'),
        promiseStatus: 'pending',
        createdAt: d('2026-06-28'),
      },
    ],
  },
];

describe('computeKpis', () => {
  it('calcula el total por cobrar, el vencido y el porcentaje de mora por monto', () => {
    const kpis = computeKpis(snapshots, TODAY);
    expect(kpis.totalReceivable).toBe(3000); // 1000 no vencida + 2000 vencida
    expect(kpis.totalOverdue).toBe(2000);
    expect(kpis.overduePercentage).toBe(66.67);
    expect(kpis.customersInArrears).toBe(1);
  });

  it('calcula el DSO sobre la facturación de los últimos 90 días', () => {
    // Facturado en 90 días: 3000 + 1000 + 2000 = 6000 → venta diaria 66.67
    // DSO = por cobrar / venta diaria = 3000 / (6000/90) = 45 días
    expect(computeKpis(snapshots, TODAY).dso).toBe(45);
  });

  it('resume las promesas de pago activas con el monto vencido comprometido', () => {
    const kpis = computeKpis(snapshots, TODAY);
    expect(kpis.activePromises).toEqual({ count: 1, amount: 2000 });
  });

  it('sin cartera devuelve todo en 0 (sin divisiones por cero)', () => {
    const kpis = computeKpis([], TODAY);
    expect(kpis.totalReceivable).toBe(0);
    expect(kpis.overduePercentage).toBe(0);
    expect(kpis.dso).toBe(0);
  });
});
