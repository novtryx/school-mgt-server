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
import { ClassSection } from '../../classes/entities/class.entity';
import { School } from '../../schools/entities/school.entity';

@Entity('subjects')
export class Subject {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'Physics' })
  @Column()
  name!: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  description?: string;

  @ApiProperty({ description: 'Maximum CA score', example: 30 })
  @Column({ name: 'max_ca_score', default: 30 })
  maxCaScore!: number;

  @ApiProperty({ description: 'Maximum exam score', example: 70 })
  @Column({ name: 'max_exam_score', default: 70 })
  maxExamScore!: number;

  @ApiProperty()
  @Index()
  @Column({ name: 'class_id' })
  classId!: string;

  @ManyToOne(() => ClassSection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class!: ClassSection;

  @ApiProperty()
  @Index()
  @Column({ name: 'school_id' })
  schoolId!: string;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school!: School;

  @ApiProperty()
    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

  @ApiProperty()
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}