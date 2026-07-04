import { computePriority } from './priority';

describe('computePriority', () => {
  it('prioriza riesgo × monto: un cliente grande en riesgo supera a un zombi chico', () => {
    const zombiChico = computePriority({ score: 90, overdueAmount: 200, hasActivePromise: false });
    const grandeEnRiesgo = computePriority({ score: 70, overdueAmount: 15000, hasActivePromise: false });
    expect(grandeEnRiesgo).toBeGreaterThan(zombiChico);
  });

  it('una promesa de pago vigente baja la prioridad (ya fue gestionado, corresponde esperar)', () => {
    const sinPromesa = computePriority({ score: 80, overdueAmount: 5000, hasActivePromise: false });
    const conPromesa = computePriority({ score: 80, overdueAmount: 5000, hasActivePromise: true });
    expect(conPromesa).toBeLessThan(sinPromesa);
    expect(conPromesa).toBeGreaterThan(0);
  });

  it('sin deuda vencida la prioridad es 0', () => {
    expect(computePriority({ score: 0, overdueAmount: 0, hasActivePromise: false })).toBe(0);
  });
});
