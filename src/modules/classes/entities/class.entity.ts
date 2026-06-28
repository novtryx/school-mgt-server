import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { School } from '../../schools/entities/school.entity';

@Entity('classes')
@Unique(['name', 'schoolId'])
export class ClassSection {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'JSS 1A' })
  @Column()
  name!: string;

  @ApiPropertyOptional({ example: 'Junior Secondary' })
  @Column({ nullable: true })
  description?: string;

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