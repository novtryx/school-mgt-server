import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Student } from '../../students/entities/student.entity';
import { School } from '../../schools/entities/school.entity';

export enum PaymentStatus {
  DEFAULTER = 'defaulter',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
}

@Entity('fee_invoices')
export class FeeInvoice {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty()
  @Index()
  @Column({ name: 'student_id' })
  studentId!: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: Student;

  @ApiProperty()
  @Index()
  @Column({ name: 'school_id' })
  schoolId!: string;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school!: School;

  @ApiProperty({ example: 'First Term 2024/2025' })
  @Column({ name: 'term_label' })
  termLabel!: string;

  @ApiProperty({ description: 'Total amount due in the school currency', example: 150000 })
  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount!: number;

  @ApiProperty({ description: 'Amount paid so far', example: 60000 })
  @Column({
    name: 'amount_paid',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  amountPaid!: number;

  @ApiProperty({ description: 'Outstanding balance' })
  @Column({
    name: 'balance',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  balance!: number;

  @ApiProperty({ enum: PaymentStatus })
  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.DEFAULTER,
  })
  paymentStatus!: PaymentStatus;

  @ApiPropertyOptional({ description: 'Line items (e.g. Tuition, Uniform, Learning Kits)' })
  @Column({ name: 'line_items', type: 'jsonb', nullable: true })
  lineItems?: Array<{ label: string; amount: number }>;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}