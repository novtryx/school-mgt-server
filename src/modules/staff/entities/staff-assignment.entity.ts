import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  ManyToMany,
  JoinTable,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { ClassSection } from '../../classes/entities/class.entity';
import { Subject } from '../../subjects/entities/subject.entity';

@Entity('staff_assignments')
@Unique(['userId', 'classId'])
export class StaffAssignment {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty()
  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ApiProperty()
  @Index()
  @Column({ name: 'class_id' })
  classId!: string;

  @ManyToOne(() => ClassSection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class!: ClassSection;

  @ApiProperty({
    description: 'Whether this teacher is the designated Form/Class Teacher',
  })
  @Column({ name: 'is_class_teacher', default: false })
  isClassTeacher!: boolean;

  @ApiProperty({ type: () => [Subject] })
  @ManyToMany(() => Subject)
  @JoinTable({
    name: 'staff_assignment_subjects',
    joinColumn: { name: 'assignment_id' },
    inverseJoinColumn: { name: 'subject_id' },
  })
  subjects!: Subject[];

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}