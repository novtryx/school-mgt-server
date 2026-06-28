import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class AssignStaffDto {
  @ApiProperty({ description: 'Teacher user UUID' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Class section UUID' })
  @IsUUID()
  classId!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isClassTeacher?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Array of subject UUIDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  subjectIds?: string[];
}