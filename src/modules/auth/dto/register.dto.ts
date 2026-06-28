import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength, Length } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Adaeze' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Okafor' })
  @IsString()
  lastName!: string;

  @ApiProperty({ example: 'adaeze@school.ng' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Greenfield Academy' })
  @IsString()
  schoolName!: string;

  @ApiProperty({ example: 'NGN', description: 'ISO 4217 currency code' })
  @IsString()
  @Length(3, 3)
  currencyCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}