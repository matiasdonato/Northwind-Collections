import { daysLate, isConsistentLatePayer, paymentTrend } from './payment-behavior';

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const rec = (dueDate: string, paidAt: string) => ({ dueDate: d(dueDate), paidAt: d(paidAt) });

describe('daysLate', () => {
  it('es positivo cuando pagó después del vencimiento', () => {
    expect(daysLate(rec('2026-06-01', '2026-06-11'))).toBe(10);
  });

  it('es negativo cuando pagó antes del vencimiento', () => {
    expect(daysLate(rec('2026-06-10', '2026-06-08'))).toBe(-2);
  });
});

describe('paymentTrend', () => {
  it('es unknown con menos de 4 pagos históricos', () => {
    expect(paymentTrend([])).toBe('unknown');
    expect(paymentTrend([rec('2026-01-01', '2026-01-10')])).toBe('unknown');
    expect(
      paymentTrend([
        rec('2026-01-01', '2026-01-10'),
        rec('2026-02-01', '2026-02-10'),
        rec('2026-03-01', '2026-03-10'),
      ]),
    ).toBe('unknown');
  });

  it('es worsening cuando los últimos pagos son 15+ días más tardíos que el historial', () => {
    const records = [
      rec('2026-01-01', '2026-01-11'), // 10 días tarde
      rec('2026-02-01', '2026-02-13'), // 12
      rec('2026-03-01', '2026-03-12'), // 11
      rec('2026-04-01', '2026-05-11'), // 40
      rec('2026-05-01', '2026-06-15'), // 45
    ];
    expect(paymentTrend(records)).toBe('worsening');
  });

  it('es improving cuando los últimos pagos son 15+ días más puntuales', () => {
    const records = [
      rec('2026-01-01', '2026-02-10'), // 40
      rec('2026-02-01', '2026-03-18'), // 45
      rec('2026-03-01', '2026-04-12'), // 42
      rec('2026-04-01', '2026-04-06'), // 5
      rec('2026-05-01', '2026-05-03'), // 2
    ];
    expect(paymentTrend(records)).toBe('improving');
  });

  it('es stable cuando el comportamiento se mantiene', () => {
    const records = [
      rec('2026-01-01', '2026-03-12'), // 70
      rec('2026-02-01', '2026-04-17'), // 75
      rec('2026-03-01', '2026-05-12'), // 72
      rec('2026-04-01', '2026-06-14'), // 74
      rec('2026-05-01', '2026-07-11'), // 71
    ];
    expect(paymentTrend(records)).toBe('stable');
  });
});

describe('isConsistentLatePayer', () => {
  it('requiere al menos 3 pagos históricos', () => {
    expect(isConsistentLatePayer([rec('2026-01-01', '2026-03-12'), rec('2026-02-01', '2026-04-15')])).toBe(false);
  });

  it('detecta al que paga tarde pero de forma predecible (el enterprise de 70-75 días)', () => {
    const records = [
      rec('2026-01-01', '2026-03-12'), // 70
      rec('2026-02-01', '2026-04-17'), // 75
      rec('2026-03-01', '2026-05-12'), // 72
    ];
    expect(isConsistentLatePayer(records)).toBe(true);
  });

  it('rechaza comportamiento errático', () => {
    const records = [
      rec('2026-01-01', '2026-01-06'), // 5
      rec('2026-02-01', '2026-04-22'), // 80
      rec('2026-03-01', '2026-03-31'), // 30
    ];
    expect(isConsistentLatePayer(records)).toBe(false);
  });

  it('rechaza a quien paga en término (no es moroso consistente)', () => {
    const records = [
      rec('2026-01-01', '2025-12-30'), // -2
      rec('2026-02-01', '2026-02-02'), // 1
      rec('2026-03-01', '2026-03-01'), // 0
    ];
    expect(isConsistentLatePayer(records)).toBe(false);
  });
});
