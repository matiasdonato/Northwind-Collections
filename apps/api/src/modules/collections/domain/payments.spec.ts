import { DomainError } from './errors';
import { applyPayment } from './payments';
import type { Invoice, Payment } from './types';

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

const invoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 'inv-1',
  customerId: 'cust-1',
  amount: 1000,
  issuedDate: d('2026-05-01'),
  dueDate: d('2026-06-01'),
  status: 'open',
  ...overrides,
});

const priorPayment = (amount: number): Payment => ({
  id: 'pay-prev',
  invoiceId: 'inv-1',
  amount,
  paidAt: d('2026-06-10'),
});

describe('applyPayment', () => {
  it('rechaza montos no positivos', () => {
    expect(() => applyPayment(invoice(), [], 0)).toThrow(DomainError);
    expect(() => applyPayment(invoice(), [], -50)).toThrow(DomainError);
  });

  it('rechaza pagos sobre facturas pagadas o anuladas', () => {
    expect(() => applyPayment(invoice({ status: 'paid' }), [], 100)).toThrow(DomainError);
    expect(() => applyPayment(invoice({ status: 'void' }), [], 100)).toThrow(DomainError);
  });

  it('rechaza pagos que superan el saldo pendiente', () => {
    expect(() => applyPayment(invoice(), [priorPayment(400)], 700)).toThrow(DomainError);
  });

  it('un pago parcial deja la factura en partially_paid con el saldo actualizado', () => {
    const result = applyPayment(invoice(), [], 400);
    expect(result).toEqual({ newStatus: 'partially_paid', outstandingAfter: 600 });
  });

  it('un pago por el saldo exacto deja la factura pagada', () => {
    const result = applyPayment(invoice(), [priorPayment(400)], 600);
    expect(result).toEqual({ newStatus: 'paid', outstandingAfter: 0 });
  });
});
