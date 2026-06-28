import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class GradeBandDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  grade!: string;

  @ApiProperty({ example: 70, description: 'Minimum score inclusive' })
  @IsInt()
  @Min(0)
  @Max(100)
  minScore!: number;

  @ApiProperty({ example: 100, description: 'Maximum score inclusive' })
  @IsInt()
  @Min(0)
  @Max(100)
  maxScore!: number;

  @ApiPropertyOptional({ example: 'Excellent' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class CreateGradingSchemeDto {
  @ApiProperty({ example: 'Standard Grading' })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    type: [GradeBandDto],
    description: 'Grade bands ordered from highest to lowest minScore',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeBandDto)
  bands!: GradeBandDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty()
  @IsUUID()
  schoolId!: string;
}