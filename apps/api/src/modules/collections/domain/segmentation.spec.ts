import { segmentCustomer, suggestedActionFor, type SegmentationInput } from './segmentation';

const base: SegmentationInput = {
  maxDaysOverdue: 0,
  overdueAmount: 0,
  hasRecentPayment: false,
  brokenPromises: 0,
  trend: 'unknown',
  consistentLatePayer: false,
};

describe('segmentCustomer', () => {
  it('sin deuda vencida → al_dia, aunque existan señales históricas', () => {
    expect(segmentCustomer(base)).toBe('al_dia');
    expect(segmentCustomer({ ...base, brokenPromises: 2, trend: 'worsening' })).toBe('al_dia');
  });

  it('mora +90 sin pagos recientes → critico (el cliente zombi)', () => {
    expect(
      segmentCustomer({ ...base, maxDaysOverdue: 95, overdueAmount: 5000, hasRecentPayment: false }),
    ).toBe('critico');
  });

  it('mora +90 pero con pagos recientes → en_riesgo, no critico (todavía responde)', () => {
    expect(
      segmentCustomer({ ...base, maxDaysOverdue: 95, overdueAmount: 5000, hasRecentPayment: true }),
    ).toBe('en_riesgo');
  });

  it('promesa incumplida → en_riesgo', () => {
    expect(
      segmentCustomer({ ...base, maxDaysOverdue: 20, overdueAmount: 1000, brokenPromises: 1 }),
    ).toBe('en_riesgo');
  });

  it('tendencia de pago empeorando → en_riesgo (la startup que se está quedando sin caja)', () => {
    expect(
      segmentCustomer({ ...base, maxDaysOverdue: 25, overdueAmount: 800, trend: 'worsening' }),
    ).toBe('en_riesgo');
  });

  it('mora media sin historial consistente → en_riesgo', () => {
    expect(segmentCustomer({ ...base, maxDaysOverdue: 45, overdueAmount: 2000 })).toBe('en_riesgo');
  });

  it('paga tarde pero consistente → mora_administrativa (el enterprise de proceso lento)', () => {
    expect(
      segmentCustomer({
        ...base,
        maxDaysOverdue: 75,
        overdueAmount: 12000,
        consistentLatePayer: true,
        trend: 'stable',
      }),
    ).toBe('mora_administrativa');
  });

  it('mora temprana (≤30 días) sin señales de alarma → mora_administrativa', () => {
    expect(segmentCustomer({ ...base, maxDaysOverdue: 10, overdueAmount: 500 })).toBe(
      'mora_administrativa',
    );
  });
});

describe('suggestedActionFor', () => {
  it.each([
    ['al_dia', 'none'],
    ['mora_administrativa', 'soft_reminder'],
    ['en_riesgo', 'call'],
    ['critico', 'escalate'],
  ] as const)('%s → %s', (segment, action) => {
    expect(suggestedActionFor(segment)).toBe(action);
  });
});
