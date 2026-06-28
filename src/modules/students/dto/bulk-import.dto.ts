import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsUUID, ValidateNested } from 'class-validator';
import { CreateStudentDto } from './create-student.dto';

export class BulkImportStudentsDto {
  @ApiProperty({ description: 'Target school ID' })
  @IsUUID()
  schoolId!: string;

  @ApiProperty({ type: [CreateStudentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStudentDto)
  students!: CreateStudentDto[];
}