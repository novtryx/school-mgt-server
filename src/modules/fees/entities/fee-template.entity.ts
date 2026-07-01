import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { School } from '../../schools/entities/school.entity';
import { ClassSection } from '../../classes/entities/class.entity';

@Entity('fee_templates')
@Unique(['schoolId', 'classId', 'termLabel'])
export class FeeTemplate {
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

  @ApiPropertyOptional({ description: 'If null, applies to all classes in the school' })
  @Index()
  @Column({ name: 'class_id', nullable: true })
  classId?: string;

  @ManyToOne(() => ClassSection, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'class_id' })
  class?: ClassSection;

  @ApiProperty({ example: 'First Term 2024/2025' })
  @Column({ name: 'term_label' })
  termLabel!: string;

  @ApiProperty({ description: 'Line items that make up the total fee' })
  @Column({
    name: 'line_items',
    type: 'jsonb',
    default: '[]',
  })
  lineItems!: Array<{ label: string; amount: number }>;

  @ApiProperty({ description: 'Total amount — sum of all line items' })
  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount!: number;

  @ApiPropertyOptional({ description: 'Optional description or notes' })
  @Column({ name: 'description', nullable: true, type: 'text' })
  description?: string;

  @ApiProperty({ default: true })
  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}