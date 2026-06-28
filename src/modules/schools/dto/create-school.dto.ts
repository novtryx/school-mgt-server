import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class CreateSchoolDto {
  @ApiProperty({ example: 'Greenfield Academy' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'NGN', description: 'ISO 4217 currency code' })
  @IsString()
  @Length(3, 3)
  currencyCode!: string;

  @ApiProperty({ example: 'admin@greenfield.ng' })
  @IsEmail()
  adminEmail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}