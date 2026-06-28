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
import { Student } from '../../students/entities/student.entity';
import { ClassSection } from '../../classes/entities/class.entity';
import { ScoreTerm } from '../../scores/entities/score.entity';

export enum ReportStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

@Entity('reports')
@Unique(['studentId', 'classId', 'term', 'academicYear'])
export class Report {
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
  @Column({ name: 'class_id' })
  classId!: string;

  @ManyToOne(() => ClassSection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class!: ClassSection;

  @ApiProperty({ enum: ScoreTerm })
  @Column({ type: 'enum', enum: ScoreTerm })
  term!: ScoreTerm;

  @ApiProperty({ example: '2024/2025' })
  @Column({ name: 'academic_year' })
  academicYear!: string;

  @ApiProperty({ description: 'Computed average across all subjects' })
  @Column({ name: 'average', type: 'decimal', precision: 5, scale: 2, default: 0 })
  average!: number;

  @ApiProperty({ description: 'Class position rank (1st, 2nd, ...)' })
  @Column({ name: 'position', nullable: true })
  position?: number;

  @ApiPropertyOptional({ description: 'Form teacher narrative comment' })
  @Column({ name: 'teacher_comment', nullable: true, type: 'text' })
  teacherComment?: string;

  @ApiPropertyOptional({ description: 'Conduct rating 1–5' })
  @Column({ name: 'conduct', nullable: true })
  conduct?: number;

  @ApiPropertyOptional({ description: 'Punctuality rating 1–5' })
  @Column({ name: 'punctuality', nullable: true })
  punctuality?: number;

  @ApiPropertyOptional({ description: 'Neatness rating 1–5' })
  @Column({ name: 'neatness', nullable: true })
  neatness?: number;

  @ApiProperty({ enum: ReportStatus })
  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.DRAFT,
  })
  status!: ReportStatus;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}