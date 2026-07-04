/**
 * Tipos del dominio de cobranza.
 * Este módulo no depende de NestJS, TypeORM ni de ninguna otra infraestructura:
 * es el vocabulario del negocio (ver ARCHITECTURE.md §2.1).
 */

export type CustomerSize = 'small' | 'mid' | 'enterprise';

export interface Customer {
  id: string;
  name: string;
  size: CustomerSize;
  /** Facturación mensual recurrente del cliente, en USD */
  mrr: number;
}

export type InvoiceStatus = 'open' | 'partially_paid' | 'paid' | 'void';

export interface Invoice {
  id: string;
  customerId: string;
  amount: number;
  issuedDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paidAt: Date;
}

export type ActionType = 'call' | 'email' | 'note' | 'payment_promise';
export type PromiseStatus = 'pending' | 'kept' | 'broken';

export interface CollectionAction {
  id: string;
  customerId: string;
  invoiceId?: string;
  type: ActionType;
  notes?: string;
  /** Solo para promesas de pago */
  promisedDate?: Date;
  promiseStatus?: PromiseStatus;
  createdAt: Date;
}

export type Segment = 'al_dia' | 'mora_administrativa' | 'en_riesgo' | 'critico';
export type SuggestedAction = 'none' | 'soft_reminder' | 'call' | 'escalate';

/** Snapshot completo de un cliente: los hechos desde los que se deriva todo juicio */
export interface CustomerSnapshot {
  customer: Customer;
  invoices: Invoice[];
  payments: Payment[];
  actions: CollectionAction[];
}

/** Redondeo a 2 decimales para montos en USD */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Timestamp de la medianoche UTC del día de la fecha (comparaciones a nivel día) */
export function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}
