import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { InvoiceStatus } from '../../domain/types';
import { CustomerEntity } from './customer.entity';
import { dateOnlyTransformer, decimalTransformer } from './transformers';

@Entity('invoices')
export class InvoiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => CustomerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: CustomerEntity;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  amount: number;

  @Column({ name: 'issued_date', type: 'date', transformer: dateOnlyTransformer })
  issuedDate: Date;

  @Column({ name: 'due_date', type: 'date', transformer: dateOnlyTransformer })
  dueDate: Date;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: InvoiceStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
