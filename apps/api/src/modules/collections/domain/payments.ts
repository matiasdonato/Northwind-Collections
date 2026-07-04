import { outstandingAmount } from './aging';
import { DomainError } from './errors';
import type { Invoice, Payment } from './types';
import { round2 } from './types';

export interface PaymentApplication {
  newStatus: 'partially_paid' | 'paid';
  outstandingAfter: number;
}

/**
 * Valida y aplica un pago sobre una factura.
 * No muta nada: devuelve el nuevo estado que la infraestructura debe
 * persistir en la misma transacción que el pago (ver ARCHITECTURE.md §2.4).
 */
export function applyPayment(
  invoice: Invoice,
  priorPayments: Payment[],
  amount: number,
): PaymentApplication {
  if (invoice.status === 'paid' || invoice.status === 'void') {
    throw new DomainError(
      `La factura ya está ${invoice.status === 'paid' ? 'pagada' : 'anulada'}: no admite pagos`,
    );
  }
  if (!(amount > 0)) {
    throw new DomainError('El monto del pago debe ser mayor a cero');
  }

  const outstanding = outstandingAmount(invoice, priorPayments);
  if (amount > outstanding) {
    throw new DomainError(
      `El pago (${amount}) supera el saldo pendiente de la factura (${outstanding})`,
    );
  }

  const outstandingAfter = round2(outstanding - amount);
  return {
    newStatus: outstandingAfter === 0 ? 'paid' : 'partially_paid',
    outstandingAfter,
  };
}
