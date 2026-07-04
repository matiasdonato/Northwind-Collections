import { daysOverdue, outstandingAmount } from '../domain/aging';
import type { CustomerEvaluation } from '../domain/customer-status';
import { evaluateCustomer } from '../domain/customer-status';
import { NotFoundError } from '../domain/errors';
import { effectivePromiseStatus, isPromise } from '../domain/promises';
import type { CollectionAction, Customer, Invoice } from '../domain/types';
import type { CollectionsRepository } from './ports/collections-repository.port';

export interface InvoiceDetail extends Invoice {
  daysOverdue: number;
  outstanding: number;
}

export interface CustomerDetail {
  customer: Customer;
  evaluation: CustomerEvaluation;
  invoices: InvoiceDetail[];
  /** Historial de gestiones, de la más reciente a la más vieja,
   *  con el estado efectivo de las promesas al día de hoy */
  actions: CollectionAction[];
}

export class GetCustomerDetailUseCase {
  constructor(private readonly repository: CollectionsRepository) {}

  async execute(customerId: string, today: Date = new Date()): Promise<CustomerDetail> {
    const snapshot = await this.repository.loadSnapshot(customerId);
    if (!snapshot) throw new NotFoundError('Cliente');

    const invoices = snapshot.invoices
      .map((invoice) => ({
        ...invoice,
        daysOverdue: daysOverdue(invoice, today),
        outstanding: outstandingAmount(invoice, snapshot.payments),
      }))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    const actions = snapshot.actions
      .map((action) =>
        isPromise(action)
          ? { ...action, promiseStatus: effectivePromiseStatus(action, snapshot.payments, today) }
          : action,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      customer: snapshot.customer,
      evaluation: evaluateCustomer(snapshot, today),
      invoices,
      actions,
    };
  }
}
