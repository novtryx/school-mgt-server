import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class RecordPaymentDto {
  @ApiProperty({ description: 'Invoice UUID' })
  @IsUUID()
  invoiceId!: string;

  @ApiProperty({
    description: 'Percentage of total amount to pay (1–100)',
    example: 40,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  percentageToPay!: number;

  @ApiPropertyOptional({ example: 'cash', description: 'cash | bank_transfer | pos | cheque' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Bank teller number, POS receipt ID, etc.' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'Staff UUID of the bursar recording this payment' })
  @IsOptional()
  @IsUUID()
  recordedBy?: string;

  @ApiPropertyOptional({ description: 'Optional note to appear on the receipt' })
  @IsOptional()
  @IsString()
  note?: string;
}