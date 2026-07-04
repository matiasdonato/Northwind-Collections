import { scoreCustomer, type ScoringInput } from './risk-scoring';

const base: ScoringInput = {
  maxDaysOverdue: 0,
  overdueAmount: 0,
  mrr: 1000,
  brokenPromises: 0,
  trend: 'unknown',
};

const factorPoints = (input: ScoringInput, factor: string): number => {
  const item = scoreCustomer(input).breakdown.find((b) => b.factor === factor);
  if (!item) throw new Error(`factor ${factor} no está en el breakdown`);
  return item.points;
};

describe('scoreCustomer', () => {
  it('un cliente sin mora tiene score 0', () => {
    expect(scoreCustomer(base).score).toBe(0);
  });

  describe('factor días de mora (máx. 40)', () => {
    it('escala linealmente hasta saturar a los 90 días', () => {
      expect(factorPoints({ ...base, maxDaysOverdue: 45, overdueAmount: 100 }, 'days_overdue')).toBe(20);
      expect(factorPoints({ ...base, maxDaysOverdue: 90, overdueAmount: 100 }, 'days_overdue')).toBe(40);
      expect(factorPoints({ ...base, maxDaysOverdue: 200, overdueAmount: 100 }, 'days_overdue')).toBe(40);
    });
  });

  describe('factor exposición (máx. 25)', () => {
    it('satura cuando la deuda vencida llega a 3× el MRR', () => {
      expect(factorPoints({ ...base, maxDaysOverdue: 1, overdueAmount: 3000, mrr: 1000 }, 'exposure')).toBe(25);
      expect(factorPoints({ ...base, maxDaysOverdue: 1, overdueAmount: 9999, mrr: 1000 }, 'exposure')).toBe(25);
    });

    it('a mitad de la referencia otorga la mitad de los puntos', () => {
      expect(factorPoints({ ...base, maxDaysOverdue: 1, overdueAmount: 1500, mrr: 1000 }, 'exposure')).toBe(13);
    });

    it('sin MRR de referencia, cualquier deuda vencida es exposición máxima', () => {
      expect(factorPoints({ ...base, maxDaysOverdue: 1, overdueAmount: 200, mrr: 0 }, 'exposure')).toBe(25);
    });
  });

  describe('factor promesas incumplidas (máx. 20)', () => {
    it('suma 10 puntos por promesa rota, con tope en 2', () => {
      expect(factorPoints({ ...base, maxDaysOverdue: 1, overdueAmount: 100, brokenPromises: 1 }, 'broken_promises')).toBe(10);
      expect(factorPoints({ ...base, maxDaysOverdue: 1, overdueAmount: 100, brokenPromises: 2 }, 'broken_promises')).toBe(20);
      expect(factorPoints({ ...base, maxDaysOverdue: 1, overdueAmount: 100, brokenPromises: 5 }, 'broken_promises')).toBe(20);
    });
  });

  describe('factor tendencia (máx. 15)', () => {
    it('solo puntúa cuando el comportamiento empeora', () => {
      expect(factorPoints({ ...base, maxDaysOverdue: 1, overdueAmount: 100, trend: 'worsening' }, 'trend')).toBe(15);
      expect(factorPoints({ ...base, maxDaysOverdue: 1, overdueAmount: 100, trend: 'stable' }, 'trend')).toBe(0);
      expect(factorPoints({ ...base, maxDaysOverdue: 1, overdueAmount: 100, trend: 'improving' }, 'trend')).toBe(0);
    });
  });

  it('el peor caso alcanza exactamente 100', () => {
    const worst = scoreCustomer({
      maxDaysOverdue: 120,
      overdueAmount: 50000,
      mrr: 1000,
      brokenPromises: 3,
      trend: 'worsening',
    });
    expect(worst.score).toBe(100);
  });

  it('el score es la suma del breakdown y cada factor explica su razón', () => {
    const result = scoreCustomer({
      maxDaysOverdue: 45,
      overdueAmount: 1500,
      mrr: 1000,
      brokenPromises: 1,
      trend: 'worsening',
    });
    const sum = result.breakdown.reduce((acc, item) => acc + item.points, 0);
    expect(result.score).toBe(sum);
    for (const item of result.breakdown) {
      expect(item.reason.length).toBeGreaterThan(0);
      expect(item.points).toBeLessThanOrEqual(item.maxPoints);
    }
  });
});
