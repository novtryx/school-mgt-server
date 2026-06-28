import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateSubjectDto {
  @ApiProperty({ example: 'Physics' })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxCaScore?: number;

  @ApiPropertyOptional({ example: 70 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxExamScore?: number;

  @ApiProperty()
  @IsUUID()
  classId!: string;

  @ApiProperty()
  @IsUUID()
  schoolId!: string;
}