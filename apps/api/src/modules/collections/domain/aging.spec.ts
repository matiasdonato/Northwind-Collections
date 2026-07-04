import { bucketForDays, buildAgingReport, daysOverdue, outstandingAmount } from './aging';
import type { Invoice, Payment } from './types';

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const TODAY = d('2026-07-01');

let seq = 0;
const invoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: `inv-${++seq}`,
  customerId: 'cust-1',
  amount: 1000,
  issuedDate: d('2026-05-01'),
  dueDate: d('2026-06-01'),
  status: 'open',
  ...overrides,
});

const payment = (invoiceId: string, amount: number, paidAt: Date = TODAY): Payment => ({
  id: `pay-${++seq}`,
  invoiceId,
  amount,
  paidAt,
});

describe('daysOverdue', () => {
  it('es 0 si la factura vence en el futuro', () => {
    expect(daysOverdue(invoice({ dueDate: d('2026-07-15') }), TODAY)).toBe(0);
  });

  it('es 0 si la factura vence hoy (todavía no está en mora)', () => {
    expect(daysOverdue(invoice({ dueDate: TODAY }), TODAY)).toBe(0);
  });

  it('cuenta los días transcurridos desde el vencimiento', () => {
    expect(daysOverdue(invoice({ dueDate: d('2026-06-01') }), TODAY)).toBe(30);
  });

  it('es 0 para facturas pagadas o anuladas aunque la fecha haya pasado', () => {
    expect(daysOverdue(invoice({ status: 'paid' }), TODAY)).toBe(0);
    expect(daysOverdue(invoice({ status: 'void' }), TODAY)).toBe(0);
  });
});

describe('outstandingAmount', () => {
  it('es el monto completo si no hay pagos', () => {
    expect(outstandingAmount(invoice({ id: 'a', amount: 1500 }), [])).toBe(1500);
  });

  it('descuenta los pagos parciales', () => {
    const inv = invoice({ id: 'a', amount: 1000 });
    expect(outstandingAmount(inv, [payment('a', 400)])).toBe(600);
  });

  it('es 0 cuando los pagos cubren el total', () => {
    const inv = invoice({ id: 'a', amount: 1000 });
    expect(outstandingAmount(inv, [payment('a', 400), payment('a', 600)])).toBe(0);
  });

  it('ignora pagos de otras facturas', () => {
    const inv = invoice({ id: 'a', amount: 1000 });
    expect(outstandingAmount(inv, [payment('otra', 999)])).toBe(1000);
  });
});

describe('bucketForDays', () => {
  it.each([
    [1, '0-30'],
    [30, '0-30'],
    [31, '31-60'],
    [60, '31-60'],
    [61, '61-90'],
    [90, '61-90'],
    [91, '90+'],
    [250, '90+'],
  ])('%i días de mora → bucket %s', (days, expected) => {
    expect(bucketForDays(days as number)).toBe(expected);
  });
});

describe('buildAgingReport', () => {
  it('agrupa el saldo pendiente por bucket y cuenta facturas y clientes distintos', () => {
    const invoices = [
      invoice({ id: 'a', customerId: 'c1', amount: 1000, dueDate: d('2026-06-21') }), // 10 días
      invoice({ id: 'b', customerId: 'c2', amount: 500, dueDate: d('2026-06-11') }), // 20 días
      invoice({ id: 'c', customerId: 'c2', amount: 2000, dueDate: d('2026-03-01') }), // 122 días
    ];
    const payments = [payment('a', 300)];

    const report = buildAgingReport(invoices, payments, TODAY);

    expect(report.buckets['0-30']).toEqual({ amount: 1200, invoiceCount: 2, customerCount: 2 });
    expect(report.buckets['31-60']).toEqual({ amount: 0, invoiceCount: 0, customerCount: 0 });
    expect(report.buckets['61-90']).toEqual({ amount: 0, invoiceCount: 0, customerCount: 0 });
    expect(report.buckets['90+']).toEqual({ amount: 2000, invoiceCount: 1, customerCount: 1 });
    expect(report.totalOverdue).toBe(3200);
  });

  it('excluye facturas al día, pagadas y con saldo cubierto', () => {
    const invoices = [
      invoice({ dueDate: d('2026-08-01') }), // vence en el futuro
      invoice({ status: 'paid' }), // ya pagada
      invoice({ id: 'saldada', amount: 500 }), // vencida pero saldada por pagos
    ];
    const report = buildAgingReport(invoices, [payment('saldada', 500)], TODAY);

    expect(report.totalOverdue).toBe(0);
    expect(report.buckets['0-30'].invoiceCount).toBe(0);
  });
});
