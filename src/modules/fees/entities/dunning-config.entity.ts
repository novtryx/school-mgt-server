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

@Entity('dunning_configs')
export class DunningConfig {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty()
  @Index({ unique: true })
  @Column({ name: 'school_id' })
  schoolId!: string;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school!: School;

  @ApiProperty({ description: 'Whether the daily dunning job is enabled' })
  @Column({ name: 'enabled', default: true })
  enabled!: boolean;

  @ApiProperty({ description: 'Days before exam date to start sending reminders' })
  @Column({ name: 'days_before_exam', default: 14 })
  daysBeforeExam!: number;

  @ApiPropertyOptional({ description: 'Custom email body template' })
  @Column({ name: 'email_template', type: 'text', nullable: true })
  emailTemplate?: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}