import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import type {
  CollectionsRepository,
  NewActionInput,
  NewPaymentInput,
} from '../application/ports/collections-repository.port';
import type {
  CollectionAction,
  Customer,
  CustomerSnapshot,
  Invoice,
  InvoiceStatus,
  Payment,
} from '../domain/types';
import { CollectionActionEntity } from './entities/collection-action.entity';
import { CustomerEntity } from './entities/customer.entity';
import { InvoiceEntity } from './entities/invoice.entity';
import { PaymentEntity } from './entities/payment.entity';

const toCustomer = (e: CustomerEntity): Customer => ({
  id: e.id,
  name: e.name,
  size: e.size,
  mrr: e.mrr,
});

const toInvoice = (e: InvoiceEntity): Invoice => ({
  id: e.id,
  customerId: e.customerId,
  amount: e.amount,
  issuedDate: e.issuedDate,
  dueDate: e.dueDate,
  status: e.status,
});

const toPayment = (e: PaymentEntity): Payment => ({
  id: e.id,
  invoiceId: e.invoiceId,
  amount: e.amount,
  paidAt: e.paidAt,
});

const toAction = (e: CollectionActionEntity): CollectionAction => ({
  id: e.id,
  customerId: e.customerId,
  invoiceId: e.invoiceId ?? undefined,
  type: e.type,
  notes: e.notes ?? undefined,
  promisedDate: e.promisedDate ?? undefined,
  promiseStatus: e.promiseStatus ?? undefined,
  createdAt: e.createdAt,
});

@Injectable()
export class TypeOrmCollectionsRepository implements CollectionsRepository {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customers: Repository<CustomerEntity>,
    @InjectRepository(InvoiceEntity)
    private readonly invoices: Repository<InvoiceEntity>,
    @InjectRepository(PaymentEntity)
    private readonly payments: Repository<PaymentEntity>,
    @InjectRepository(CollectionActionEntity)
    private readonly actions: Repository<CollectionActionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async loadAllSnapshots(): Promise<CustomerSnapshot[]> {
    // 4 queries planas y agrupado en memoria: a la escala del negocio
    // (cientos de clientes) es más simple y suficiente que joins anidados.
    const [customers, invoices, payments, actions] = await Promise.all([
      this.customers.find(),
      this.invoices.find(),
      this.payments.find(),
      this.actions.find(),
    ]);

    const invoiceCustomer = new Map(invoices.map((i) => [i.id, i.customerId]));
    const snapshots = new Map<string, CustomerSnapshot>(
      customers.map((c) => [
        c.id,
        { customer: toCustomer(c), invoices: [], payments: [], actions: [] },
      ]),
    );

    for (const invoice of invoices) {
      snapshots.get(invoice.customerId)?.invoices.push(toInvoice(invoice));
    }
    for (const payment of payments) {
      const customerId = invoiceCustomer.get(payment.invoiceId);
      if (customerId) snapshots.get(customerId)?.payments.push(toPayment(payment));
    }
    for (const action of actions) {
      snapshots.get(action.customerId)?.actions.push(toAction(action));
    }

    return [...snapshots.values()];
  }

  async loadSnapshot(customerId: string): Promise<CustomerSnapshot | null> {
    const customer = await this.customers.findOneBy({ id: customerId });
    if (!customer) return null;

    const invoices = await this.invoices.findBy({ customerId });
    const invoiceIds = invoices.map((i) => i.id);
    const [payments, actions] = await Promise.all([
      invoiceIds.length ? this.payments.findBy({ invoiceId: In(invoiceIds) }) : Promise.resolve([]),
      this.actions.findBy({ customerId }),
    ]);

    return {
      customer: toCustomer(customer),
      invoices: invoices.map(toInvoice),
      payments: payments.map(toPayment),
      actions: actions.map(toAction),
    };
  }

  async findInvoice(invoiceId: string): Promise<Invoice | null> {
    const invoice = await this.invoices.findOneBy({ id: invoiceId });
    return invoice ? toInvoice(invoice) : null;
  }

  async createAction(input: NewActionInput): Promise<CollectionAction> {
    const saved = await this.actions.save(
      this.actions.create({
        customerId: input.customerId,
        invoiceId: input.invoiceId ?? null,
        type: input.type,
        notes: input.notes ?? null,
        promisedDate: input.promisedDate ?? null,
        promiseStatus: input.type === 'payment_promise' ? 'pending' : null,
      }),
    );
    return toAction(saved);
  }

  async createPayment(
    input: NewPaymentInput,
    newInvoiceStatus: InvoiceStatus,
    keptPromiseIds: string[],
  ): Promise<Payment> {
    // Pago + estado de factura + promesas cumplidas: una sola transacción,
    // nunca pueden divergir (ARCHITECTURE.md §2.4)
    const saved = await this.dataSource.transaction(async (manager) => {
      const payment = await manager.save(
        manager.create(PaymentEntity, {
          invoiceId: input.invoiceId,
          amount: input.amount,
          paidAt: input.paidAt,
        }),
      );
      await manager.update(InvoiceEntity, input.invoiceId, { status: newInvoiceStatus });
      if (keptPromiseIds.length > 0) {
        await manager.update(
          CollectionActionEntity,
          { id: In(keptPromiseIds) },
          { promiseStatus: 'kept' },
        );
      }
      return payment;
    });
    return toPayment(saved);
  }
}
