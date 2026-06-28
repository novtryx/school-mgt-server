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
import { School } from '../../schools/entities/school.entity';
import { Plan } from './plan.entity';

export enum SubscriptionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('subscriptions')
export class Subscription {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty()
  @Index()
  @Column({ name: 'school_id' })
  schoolId!: string;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school!: School;

  @ApiProperty()
  @Index()
  @Column({ name: 'plan_id' })
  planId!: string;

  @ManyToOne(() => Plan, { eager: false })
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan;

  @ApiProperty({ enum: SubscriptionStatus })
  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.PENDING,
  })
  status!: SubscriptionStatus;

  @ApiPropertyOptional({ description: 'Paystack payment reference' })
  @Column({ name: 'paystack_reference', nullable: true, unique: true })
  paystackReference?: string;

  @ApiPropertyOptional({ description: 'Paystack transaction ID after verification' })
  @Column({ name: 'paystack_transaction_id', nullable: true })
  paystackTransactionId?: string;

  @ApiProperty({ description: 'Amount paid in kobo' })
  @Column({ name: 'amount_paid_kobo', type: 'bigint', default: 0 })
  amountPaidKobo!: number;

  @ApiPropertyOptional()
  @Column({ name: 'starts_at', nullable: true, type: 'timestamptz' })
  startsAt?: Date;

  @ApiPropertyOptional()
  @Column({ name: 'expires_at', nullable: true, type: 'timestamptz' })
  expiresAt?: Date;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}