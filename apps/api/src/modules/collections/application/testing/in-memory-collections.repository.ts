import type {
  CollectionAction,
  CustomerSnapshot,
  Invoice,
  InvoiceStatus,
  Payment,
} from '../../domain/types';
import type {
  CollectionsRepository,
  NewActionInput,
  NewPaymentInput,
} from '../ports/collections-repository.port';

/**
 * Implementación en memoria del puerto de persistencia, para tests de
 * los casos de uso. Replica el contrato transaccional del repositorio real.
 */
export class InMemoryCollectionsRepository implements CollectionsRepository {
  private seq = 0;

  constructor(private readonly snapshots: CustomerSnapshot[]) {}

  loadAllSnapshots(): Promise<CustomerSnapshot[]> {
    return Promise.resolve(this.snapshots);
  }

  loadSnapshot(customerId: string): Promise<CustomerSnapshot | null> {
    return Promise.resolve(this.snapshots.find((s) => s.customer.id === customerId) ?? null);
  }

  findInvoice(invoiceId: string): Promise<Invoice | null> {
    for (const snapshot of this.snapshots) {
      const invoice = snapshot.invoices.find((i) => i.id === invoiceId);
      if (invoice) return Promise.resolve(invoice);
    }
    return Promise.resolve(null);
  }

  createAction(input: NewActionInput): Promise<CollectionAction> {
    const snapshot = this.snapshots.find((s) => s.customer.id === input.customerId);
    if (!snapshot) return Promise.reject(new Error('snapshot inexistente'));
    const action: CollectionAction = {
      id: `act-${++this.seq}`,
      customerId: input.customerId,
      invoiceId: input.invoiceId,
      type: input.type,
      notes: input.notes,
      promisedDate: input.promisedDate,
      promiseStatus: input.type === 'payment_promise' ? 'pending' : undefined,
      createdAt: new Date(),
    };
    snapshot.actions.push(action);
    return Promise.resolve(action);
  }

  createPayment(
    input: NewPaymentInput,
    newInvoiceStatus: InvoiceStatus,
    keptPromiseIds: string[],
  ): Promise<Payment> {
    const snapshot = this.snapshots.find((s) => s.invoices.some((i) => i.id === input.invoiceId));
    if (!snapshot) return Promise.reject(new Error('factura inexistente'));

    const payment: Payment = {
      id: `pay-${++this.seq}`,
      invoiceId: input.invoiceId,
      amount: input.amount,
      paidAt: input.paidAt,
    };
    snapshot.payments.push(payment);

    const invoice = snapshot.invoices.find((i) => i.id === input.invoiceId)!;
    invoice.status = newInvoiceStatus;

    for (const action of snapshot.actions) {
      if (keptPromiseIds.includes(action.id)) {
        action.promiseStatus = 'kept';
      }
    }
    return Promise.resolve(payment);
  }
}
