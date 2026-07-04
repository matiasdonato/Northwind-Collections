import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { CustomerSize } from '../../domain/types';
import { decimalTransformer } from './transformers';

@Entity('customers')
export class CustomerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 20 })
  size: CustomerSize;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  mrr: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
