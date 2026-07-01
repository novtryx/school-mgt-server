import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class LineItemDto {
  @ApiProperty({ example: 'Tuition' })
  @IsString()
  label!: string;

  @ApiProperty({ example: 70000 })
  @IsNumber()
  @Min(0)
  amount!: number;
}

export class CreateFeeTemplateDto {
  @ApiProperty()
  @IsUUID()
  schoolId!: string;

  @ApiPropertyOptional({ description: 'If omitted the template applies to all classes' })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiProperty({ example: 'First Term 2024/2025' })
  @IsString()
  termLabel!: string;

  @ApiProperty({ type: [LineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lineItems!: LineItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}