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

export enum PaymentMethod {
  CASH          = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  POS           = 'pos',
  PAYSTACK      = 'paystack',
}

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

  @ApiProperty({ description: 'Actual amount paid in this transaction (not percentage)' })
  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @ApiProperty({ description: 'Balance remaining on the invoice after this payment' })
  @Column({ name: 'balance_after', type: 'decimal', precision: 12, scale: 2 })
  balanceAfter!: number;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ description: 'Teller number, Paystack reference, or bank ref' })
  @Column({ name: 'reference', nullable: true })
  reference?: string;

  @ApiPropertyOptional({ description: 'Paystack transaction ID — only for online payments' })
  @Column({ name: 'paystack_transaction_id', nullable: true })
  paystackTransactionId?: string;

  @ApiPropertyOptional({ description: 'User ID of staff who recorded this payment' })
  @Column({ name: 'recorded_by', nullable: true })
  recordedBy?: string;

  @ApiPropertyOptional()
  @Column({ name: 'note', nullable: true, type: 'text' })
  note?: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}