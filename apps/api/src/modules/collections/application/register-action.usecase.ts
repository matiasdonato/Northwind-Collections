import { daysBetween } from '../domain/aging';
import { DomainError, NotFoundError } from '../domain/errors';
import type { ActionType, CollectionAction } from '../domain/types';
import type { CollectionsRepository } from './ports/collections-repository.port';

export interface RegisterActionInput {
  customerId: string;
  invoiceId?: string;
  type: ActionType;
  notes?: string;
  promisedDate?: Date;
}

export class RegisterActionUseCase {
  constructor(private readonly repository: CollectionsRepository) {}

  async execute(input: RegisterActionInput, today: Date = new Date()): Promise<CollectionAction> {
    const snapshot = await this.repository.loadSnapshot(input.customerId);
    if (!snapshot) throw new NotFoundError('Cliente');

    if (input.invoiceId && !snapshot.invoices.some((i) => i.id === input.invoiceId)) {
      throw new DomainError('La factura indicada no pertenece al cliente');
    }

    if (input.type === 'payment_promise') {
      if (!input.promisedDate) {
        throw new DomainError('Una promesa de pago requiere fecha comprometida');
      }
      if (daysBetween(today, input.promisedDate) < 0) {
        throw new DomainError('La fecha comprometida no puede estar en el pasado');
      }
    } else if (input.promisedDate) {
      throw new DomainError('Solo las promesas de pago llevan fecha comprometida');
    }

    return this.repository.createAction(input);
  }
}
