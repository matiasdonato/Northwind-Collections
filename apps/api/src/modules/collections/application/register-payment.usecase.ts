import { daysBetween } from '../domain/aging';
import { DomainError, NotFoundError } from '../domain/errors';
import { applyPayment } from '../domain/payments';
import { promisesKeptByPayment } from '../domain/promises';
import type { InvoiceStatus, Payment } from '../domain/types';
import type { CollectionsRepository } from './ports/collections-repository.port';

export interface RegisterPaymentInput {
  invoiceId: string;
  amount: number;
  /** Por defecto, hoy */
  paidAt?: Date;
}

export interface RegisterPaymentResult {
  payment: Payment;
  invoiceStatus: InvoiceStatus;
  outstandingAfter: number;
  keptPromiseIds: string[];
}

export class RegisterPaymentUseCase {
  constructor(private readonly repository: CollectionsRepository) {}

  async execute(input: RegisterPaymentInput, today: Date = new Date()): Promise<RegisterPaymentResult> {
    const invoice = await this.repository.findInvoice(input.invoiceId);
    if (!invoice) throw new NotFoundError('Factura');

    const paidAt = input.paidAt ?? today;
    if (daysBetween(today, paidAt) > 0) {
      throw new DomainError('La fecha de pago no puede ser futura');
    }

    const snapshot = await this.repository.loadSnapshot(invoice.customerId);
    if (!snapshot) throw new NotFoundError('Cliente');

    // Reglas del dominio: valida el monto y decide el nuevo estado de la factura
    const application = applyPayment(invoice, snapshot.payments, input.amount);
    const keptPromiseIds = promisesKeptByPayment(snapshot.actions, snapshot.payments, paidAt);

    const payment = await this.repository.createPayment(
      { invoiceId: invoice.id, amount: input.amount, paidAt },
      application.newStatus,
      keptPromiseIds,
    );

    return {
      payment,
      invoiceStatus: application.newStatus,
      outstandingAfter: application.outstandingAfter,
      keptPromiseIds,
    };
  }
}
