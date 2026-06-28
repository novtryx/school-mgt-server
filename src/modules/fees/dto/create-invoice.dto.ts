import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LineItemDto {
  @ApiProperty({ example: 'Tuition' })
  @IsString()
  label!: string;

  @ApiProperty({ example: 120000 })
  @IsNumber()
  @Min(0)
  amount!: number;
}

export class CreateInvoiceDto {
  @ApiProperty()
  @IsUUID()
  studentId!: string;

  @ApiProperty()
  @IsUUID()
  schoolId!: string;

  @ApiProperty({ example: 'First Term 2024/2025' })
  @IsString()
  termLabel!: string;

  @ApiProperty({ description: 'Total amount due' })
  @IsNumber()
  @Min(1)
  totalAmount!: number;

  @ApiPropertyOptional({ type: [LineItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lineItems?: LineItemDto[];
}