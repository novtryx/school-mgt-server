import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeeInvoice } from './fee-invoice.entity';

@Entity('payments')
export class Payment {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'Human-readable receipt number e.g. RCP-2024-000012' })
  @Column({ name: 'receipt_number', unique: true })
  receiptNumber!: string;

  @ApiProperty()
  @Index()
  @Column({ name: 'invoice_id' })
  invoiceId!: string;

  @ManyToOne(() => FeeInvoice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice!: FeeInvoice;

  @ApiProperty({ description: 'Amount paid in this transaction' })
  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @ApiProperty({ description: 'Percentage of total this payment represents' })
  @Column({ name: 'percentage_paid', type: 'decimal', precision: 5, scale: 2 })
  percentagePaid!: number;

  @ApiProperty({ description: 'Balance remaining after this payment' })
  @Column({ name: 'balance_after', type: 'decimal', precision: 12, scale: 2 })
  balanceAfter!: number;

  @ApiPropertyOptional({ example: 'cash' })
  @Column({ name: 'payment_method', nullable: true })
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'External payment reference or transaction ID' })
  @Column({ name: 'reference', nullable: true })
  reference?: string;

  @ApiPropertyOptional({ description: 'Staff member who recorded this payment' })
  @Column({ name: 'recorded_by', nullable: true })
  recordedBy?: string;

  @ApiPropertyOptional({ description: 'Optional note from the bursar' })
  @Column({ name: 'note', nullable: true, type: 'text' })
  note?: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}