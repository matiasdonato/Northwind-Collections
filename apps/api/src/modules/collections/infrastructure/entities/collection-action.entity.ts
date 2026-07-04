import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ActionType, PromiseStatus } from '../../domain/types';
import { CustomerEntity } from './customer.entity';
import { InvoiceEntity } from './invoice.entity';
import { dateOnlyTransformer } from './transformers';

@Entity('collection_actions')
export class CollectionActionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => CustomerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: CustomerEntity;

  @Column({ name: 'invoice_id', type: 'uuid', nullable: true })
  invoiceId?: string | null;

  @ManyToOne(() => InvoiceEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'invoice_id' })
  invoice?: InvoiceEntity | null;

  @Column({ type: 'varchar', length: 30 })
  type: ActionType;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'promised_date', type: 'date', nullable: true, transformer: dateOnlyTransformer })
  promisedDate?: Date | null;

  @Column({ name: 'promise_status', type: 'varchar', length: 20, nullable: true })
  promiseStatus?: PromiseStatus | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
