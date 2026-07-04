import type {
  ActionType,
  CollectionAction,
  CustomerSnapshot,
  Invoice,
  InvoiceStatus,
  Payment,
} from '../../domain/types';

/**
 * Puerto de persistencia del módulo de cobranza.
 * La capa de aplicación depende de esta interfaz; la implementación
 * concreta (TypeORM) vive en infraestructura (inversión de dependencias).
 */

export interface NewActionInput {
  customerId: string;
  invoiceId?: string;
  type: ActionType;
  notes?: string;
  promisedDate?: Date;
}

export interface NewPaymentInput {
  invoiceId: string;
  amount: number;
  paidAt: Date;
}

export interface CollectionsRepository {
  loadAllSnapshots(): Promise<CustomerSnapshot[]>;
  loadSnapshot(customerId: string): Promise<CustomerSnapshot | null>;
  findInvoice(invoiceId: string): Promise<Invoice | null>;
  createAction(input: NewActionInput): Promise<CollectionAction>;
  /**
   * Registra el pago, actualiza el estado de la factura y marca las promesas
   * cumplidas — todo en la misma transacción (ARCHITECTURE.md §2.4).
   */
  createPayment(
    input: NewPaymentInput,
    newInvoiceStatus: InvoiceStatus,
    keptPromiseIds: string[],
  ): Promise<Payment>;
}

/** Token de inyección para NestJS (la interfaz no existe en runtime) */
export const COLLECTIONS_REPOSITORY = 'COLLECTIONS_REPOSITORY';
