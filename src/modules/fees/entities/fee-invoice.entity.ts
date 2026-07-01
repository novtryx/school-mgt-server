import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Student } from '../../students/entities/student.entity';
import { School } from '../../schools/entities/school.entity';
import { FeeTemplate } from './fee-template.entity';

export enum PaymentStatus {
  DEFAULTER      = 'defaulter',
  PARTIALLY_PAID = 'partially_paid',
  PAID           = 'paid',
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

  @ApiPropertyOptional({ description: 'The template this invoice was generated from' })
  @Column({ name: 'template_id', nullable: true })
  templateId?: string;

  @ManyToOne(() => FeeTemplate, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'template_id' })
  template?: FeeTemplate;

  @ApiProperty({ example: 'First Term 2024/2025' })
  @Column({ name: 'term_label' })
  termLabel!: string;

  @ApiProperty()
  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount!: number;

  @ApiProperty()
  @Column({ name: 'amount_paid', type: 'decimal', precision: 12, scale: 2, default: 0 })
  amountPaid!: number;

  @ApiProperty()
  @Column({ name: 'balance', type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance!: number;

  @ApiProperty({ enum: PaymentStatus })
  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.DEFAULTER,
  })
  paymentStatus!: PaymentStatus;

  @ApiPropertyOptional()
  @Column({ name: 'line_items', type: 'jsonb', nullable: true })
  lineItems?: Array<{ label: string; amount: number }>;

  @ApiPropertyOptional({
    description: 'Token used to access the public payment portal — no login required',
  })
  @Column({ name: 'portal_token', nullable: true, unique: true })
  portalToken?: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}