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
import { ApiProperty } from '@nestjs/swagger';
import { Student } from '../../students/entities/student.entity';
import { ClassSection } from '../../classes/entities/class.entity';

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT  = 'absent',
  LATE    = 'late',
}

export enum AttendanceSession {
  MORNING   = 'morning',
  AFTERNOON = 'afternoon',
}

// Morning registration closes at this hour (11:00 WAT)
export const MORNING_CLOSE_HOUR = 11;

@Entity('attendance')
@Unique(['studentId', 'classId', 'date', 'session'])
export class Attendance {
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

  @ApiProperty({ enum: AttendanceStatus })
  @Column({ type: 'enum', enum: AttendanceStatus, default: AttendanceStatus.ABSENT })
  status!: AttendanceStatus;

  @ApiProperty({ enum: AttendanceSession })
  @Column({ type: 'enum', enum: AttendanceSession, default: AttendanceSession.MORNING })
  session!: AttendanceSession;

  @ApiProperty({ example: '2024-09-15', description: 'Date string YYYY-MM-DD' })
  @Index()
  @Column({ type: 'date' })
  date!: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}