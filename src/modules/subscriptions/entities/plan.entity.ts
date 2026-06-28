import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BillingCycle {
  MONTHLY = 'monthly',
  TERMLY = 'termly',
  ANNUALLY = 'annually',
}

@Entity('plans')
export class Plan {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'Starter' })
  @Column({ unique: true })
  name!: string;

  @ApiProperty({ example: 'starter' })
  @Column({ name: 'slug', unique: true })
  slug!: string;

  @ApiPropertyOptional({ example: 'Perfect for small schools getting started' })
  @Column({ nullable: true, type: 'text' })
  description?: string;

  @ApiProperty({ description: 'Price in kobo (Naira x 100)', example: 1500000 })
  @Column({ name: 'price_kobo', type: 'bigint', default: 0 })
  priceKobo!: number;

  @ApiProperty({ enum: BillingCycle })
  @Column({
    name: 'billing_cycle',
    type: 'enum',
    enum: BillingCycle,
    default: BillingCycle.MONTHLY,
  })
  billingCycle!: BillingCycle;

  @ApiProperty({ description: 'Max students allowed. null = unlimited', nullable: true })
  @Column({ name: 'student_limit', nullable: true, type: 'int' })
  studentLimit?: number;

  @ApiProperty({ description: 'Max staff accounts. null = unlimited', nullable: true })
  @Column({ name: 'staff_limit', nullable: true, type: 'int' })
  staffLimit?: number;

  @ApiProperty({
    description: 'Feature flags included in this plan',
    example: ['student_directory', 'excel_import', 'attendance', 'report_cards'],
  })
  @Column({ name: 'features', type: 'jsonb', default: [] })
  features!: string[];

  @ApiProperty({
    description: 'Marketing bullet points shown on the pricing card',
    example: ['Up to 150 students', 'Excel bulk import', 'Printable report cards'],
  })
  @Column({ name: 'highlights', type: 'jsonb', default: [] })
  highlights!: string[];

  @ApiProperty({ description: 'Display order on the pricing page' })
  @Column({ name: 'sort_order', default: 0 })
  sortOrder!: number;

  @ApiProperty({ description: 'Whether this plan is publicly visible on the pricing page' })
  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Whether this is a custom/enterprise plan requiring manual setup' })
  @Column({ name: 'is_custom', default: false })
  isCustom!: boolean;

  @ApiPropertyOptional({ description: 'Paystack plan code if recurring billing is used' })
  @Column({ name: 'paystack_plan_code', nullable: true })
  paystackPlanCode?: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}