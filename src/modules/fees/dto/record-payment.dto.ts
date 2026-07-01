import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class RecordPaymentDto {
  @ApiProperty({ description: 'Invoice ID to record payment against' })
  @IsString()
  invoiceId!: string;

  @ApiProperty({ description: 'Actual amount being paid in school currency', example: 50000 })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ description: 'Teller number or bank reference' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recordedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}