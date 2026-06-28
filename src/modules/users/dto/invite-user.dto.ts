import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class InviteUserDto {
  @ApiProperty({ example: 'Chidi' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Nwosu' })
  @IsString()
  lastName!: string;

  @ApiProperty({ example: 'chidi@greenfield.ng' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: [UserRole.TEACHER, UserRole.BURSAR, UserRole.ADMIN] })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ description: 'School UUID the staff belongs to' })
  @IsUUID()
  schoolId!: string;
}