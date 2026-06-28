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

export interface GradeBand {
  grade: string;
  minScore: number;
  maxScore: number;
  remark?: string;
}

// Used when a school has not configured their own scheme
export const DEFAULT_GRADE_BANDS: GradeBand[] = [
  { grade: 'A', minScore: 70, maxScore: 100, remark: 'Excellent' },
  { grade: 'B', minScore: 60, maxScore: 69, remark: 'Very Good' },
  { grade: 'C', minScore: 50, maxScore: 59, remark: 'Good' },
  { grade: 'D', minScore: 45, maxScore: 49, remark: 'Pass' },
  { grade: 'E', minScore: 40, maxScore: 44, remark: 'Weak Pass' },
  { grade: 'F', minScore: 0, maxScore: 39, remark: 'Fail' },
];

@Entity('grading_schemes')
@Unique(['schoolId', 'name'])
export class GradingScheme {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'Standard Grading' })
  @Column()
  name!: string;

  @ApiPropertyOptional({ example: 'Default grading scheme for all classes' })
  @Column({ nullable: true })
  description?: string;

  @ApiProperty({
    description: 'Ordered array of grade bands from highest to lowest',
    example: DEFAULT_GRADE_BANDS,
  })
  @Column({ name: 'bands', type: 'jsonb' })
  bands!: GradeBand[];

  @ApiProperty({ description: 'Whether this is the active default scheme for the school' })
  @Column({ name: 'is_default', default: false })
  isDefault!: boolean;

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