import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { BillingCycle } from '../entities/plan.entity';

export class CreatePlanDto {
  @ApiProperty({ example: 'Starter' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'starter' })
  @IsString()
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Price in kobo (Naira x 100). 0 for free/custom plans', example: 1500000 })
  @IsNumber()
  @Min(0)
  priceKobo!: number;

  @ApiProperty({ enum: BillingCycle })
  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  @ApiPropertyOptional({ description: 'null for unlimited' })
  @IsOptional()
  @IsInt()
  @Min(1)
  studentLimit?: number;

  @ApiPropertyOptional({ description: 'null for unlimited' })
  @IsOptional()
  @IsInt()
  @Min(1)
  staffLimit?: number;

  @ApiProperty({ type: [String], example: ['student_directory', 'excel_import'] })
  @IsArray()
  @IsString({ each: true })
  features!: string[];

  @ApiProperty({ type: [String], example: ['Up to 150 students', 'Excel bulk import'] })
  @IsArray()
  @IsString({ each: true })
  highlights!: string[];

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCustom?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paystackPlanCode?: string;
}