import { evaluateCustomer } from './customer-status';
import type { CustomerSnapshot } from './types';

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const TODAY = d('2026-07-01');

describe('evaluateCustomer (composición de los arquetipos del negocio)', () => {
  it('cliente sano: sin mora, score 0, fuera de la cola', () => {
    const snapshot: CustomerSnapshot = {
      customer: { id: 'c1', name: 'Sana SRL', size: 'mid', mrr: 800 },
      invoices: [
        { id: 'i1', customerId: 'c1', amount: 800, issuedDate: d('2026-06-20'), dueDate: d('2026-07-20'), status: 'open' },
      ],
      payments: [],
      actions: [],
    };
    const evaluation = evaluateCustomer(snapshot, TODAY);

    expect(evaluation.segment).toBe('al_dia');
    expect(evaluation.score).toBe(0);
    expect(evaluation.priority).toBe(0);
    expect(evaluation.overdueAmount).toBe(0);
    expect(evaluation.suggestedAction).toBe('none');
    expect(evaluation.bucket).toBeNull();
  });

  it('el zombi: +90 días sin pagos → critico, escalar', () => {
    const snapshot: CustomerSnapshot = {
      customer: { id: 'c2', name: 'Zombi SA', size: 'small', mrr: 400 },
      invoices: [
        { id: 'i1', customerId: 'c2', amount: 1200, issuedDate: d('2026-02-15'), dueDate: d('2026-03-15'), status: 'open' },
        { id: 'i2', customerId: 'c2', amount: 400, issuedDate: d('2026-04-15'), dueDate: d('2026-05-15'), status: 'open' },
      ],
      payments: [],
      actions: [],
    };
    const evaluation = evaluateCustomer(snapshot, TODAY);

    expect(evaluation.segment).toBe('critico');
    expect(evaluation.suggestedAction).toBe('escalate');
    expect(evaluation.maxDaysOverdue).toBe(108);
    expect(evaluation.overdueAmount).toBe(1600);
    expect(evaluation.bucket).toBe('90+');
    expect(evaluation.score).toBeGreaterThanOrEqual(60);
  });

  it('el enterprise de proceso lento: paga a ~72 días consistente → mora_administrativa', () => {
    const paidLate = (n: number, issued: string, due: string, paid: string) => ({
      invoice: {
        id: `i${n}`,
        customerId: 'c3',
        amount: 10000,
        issuedDate: d(issued),
        dueDate: d(due),
        status: 'paid' as const,
      },
      payment: { id: `p${n}`, invoiceId: `i${n}`, amount: 10000, paidAt: d(paid) },
    });
    const history = [
      paidLate(1, '2025-11-01', '2025-12-01', '2026-02-09'), // 70 días tarde
      paidLate(2, '2025-12-01', '2026-01-01', '2026-03-17'), // 75
      paidLate(3, '2026-01-01', '2026-02-01', '2026-04-14'), // 72
    ];
    const snapshot: CustomerSnapshot = {
      customer: { id: 'c3', name: 'Enterprise Corp', size: 'enterprise', mrr: 10000 },
      invoices: [
        ...history.map((h) => h.invoice),
        // factura vigente, vencida hace 75 días: su ciclo normal
        { id: 'i9', customerId: 'c3', amount: 12000, issuedDate: d('2026-03-17'), dueDate: d('2026-04-17'), status: 'open' },
      ],
      payments: history.map((h) => h.payment),
      actions: [],
    };
    const evaluation = evaluateCustomer(snapshot, TODAY);

    expect(evaluation.segment).toBe('mora_administrativa');
    expect(evaluation.suggestedAction).toBe('soft_reminder');
  });

  it('la startup en problemas: mora media con promesa incumplida → en_riesgo', () => {
    const snapshot: CustomerSnapshot = {
      customer: { id: 'c4', name: 'Startup SpA', size: 'small', mrr: 900 },
      invoices: [
        { id: 'i1', customerId: 'c4', amount: 900, issuedDate: d('2026-04-15'), dueDate: d('2026-05-15'), status: 'open' },
      ],
      payments: [],
      actions: [
        {
          id: 'a1',
          customerId: 'c4',
          type: 'payment_promise',
          promisedDate: d('2026-06-10'),
          promiseStatus: 'pending',
          createdAt: d('2026-06-01'),
        },
      ],
    };
    const evaluation = evaluateCustomer(snapshot, TODAY);

    expect(evaluation.segment).toBe('en_riesgo');
    expect(evaluation.suggestedAction).toBe('call');
    expect(evaluation.brokenPromises).toBe(1);
    expect(evaluation.hasActivePromise).toBe(false);
  });

  it('una promesa vigente queda visible y amortigua la prioridad', () => {
    const withPromise = (promisedDate: Date | undefined): CustomerSnapshot => ({
      customer: { id: 'c5', name: 'Prometedora SL', size: 'mid', mrr: 2000 },
      invoices: [
        { id: 'i1', customerId: 'c5', amount: 4000, issuedDate: d('2026-04-01'), dueDate: d('2026-05-01'), status: 'open' },
      ],
      payments: [],
      actions: promisedDate
        ? [
            {
              id: 'a1',
              customerId: 'c5',
              type: 'payment_promise',
              promisedDate,
              promiseStatus: 'pending',
              createdAt: d('2026-06-28'),
            },
          ]
        : [],
    });

    const sin = evaluateCustomer(withPromise(undefined), TODAY);
    const con = evaluateCustomer(withPromise(d('2026-07-08')), TODAY);

    expect(con.hasActivePromise).toBe(true);
    expect(con.priority).toBeLessThan(sin.priority);
  });
});
