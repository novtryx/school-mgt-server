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
import { Subject } from '../../subjects/entities/subject.entity';

export enum ScoreTerm {
  FIRST = 'first',
  SECOND = 'second',
  THIRD = 'third',
}

@Entity('scores')
@Unique(['studentId', 'subjectId', 'term', 'academicYear'])
export class Score {
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
  @Column({ name: 'subject_id' })
  subjectId!: string;

  @ManyToOne(() => Subject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subject_id' })
  subject!: Subject;

  @ApiProperty({ description: 'Continuous Assessment score' })
  @Column({ name: 'ca_score', type: 'decimal', precision: 5, scale: 2, default: 0 })
  caScore!: number;

  @ApiProperty({ description: 'Exam score' })
  @Column({ name: 'exam_score', type: 'decimal', precision: 5, scale: 2, default: 0 })
  examScore!: number;

  @ApiProperty({ description: 'Total score (CA + exam)' })
  @Column({
    name: 'total_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  totalScore!: number;

  @ApiProperty({ enum: ScoreTerm })
  @Column({ type: 'enum', enum: ScoreTerm, default: ScoreTerm.FIRST })
  term!: ScoreTerm;

  @ApiProperty({ example: '2024/2025' })
  @Index()
  @Column({ name: 'academic_year' })
  academicYear!: string;

  @ApiPropertyOptional()
  @Column({ name: 'grade', nullable: true })
  grade?: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}