import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Gender, BloodGroup } from '../entities/student.entity';

export class CreateStudentDto {
  // ─── Personal ───────────────────────────────────────────────────────────────

  @ApiProperty({ example: 'Amina' })
  @IsString()
  firstName!: string;

  @ApiPropertyOptional({ example: 'Tunde' })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ example: 'Bello' })
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ example: 'STD-2024-001' })
  @IsOptional()
  @IsString()
  admissionNumber?: string;

  @ApiPropertyOptional({ example: '2010-05-14', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ enum: BloodGroup })
  @IsOptional()
  @IsEnum(BloodGroup)
  bloodGroup?: BloodGroup;

  @ApiPropertyOptional({ example: 'Nigerian' })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  stateOfOrigin?: string;

  @ApiPropertyOptional({ example: 'Christianity' })
  @IsOptional()
  @IsString()
  religion?: string;

  // ─── Address ────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: '12 Bode Thomas Street' })
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiPropertyOptional({ example: 'Surulere' })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Lagos State' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'Nigeria' })
  @IsOptional()
  @IsString()
  country?: string;

  // ─── Medical ────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'Penicillin' })
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiPropertyOptional({ example: 'Asthma' })
  @IsOptional()
  @IsString()
  medicalConditions?: string;

  @ApiPropertyOptional({ example: 'Dr. Adeola Clinic, +2348011223344' })
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  // ─── Parent / Guardian ──────────────────────────────────────────────────────

  @ApiProperty({ example: 'amina.parent@gmail.com' })
  @IsEmail()
  parentEmail!: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  parentPhone!: string;

  @ApiPropertyOptional({ example: 'Mrs Bello' })
  @IsOptional()
  @IsString()
  parentName?: string;

  @ApiPropertyOptional({ example: 'Mother' })
  @IsOptional()
  @IsString()
  parentRelationship?: string;

  @ApiPropertyOptional({ example: '+2348099887766' })
  @IsOptional()
  @IsString()
  secondaryGuardianPhone?: string;

  @ApiPropertyOptional({ example: 'Mr Bello' })
  @IsOptional()
  @IsString()
  secondaryGuardianName?: string;

  // ─── Academic ───────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: '2024-09-01' })
  @IsOptional()
  @IsDateString()
  admissionDate?: string;

  @ApiPropertyOptional({ example: 'Lagos Island Academy' })
  @IsOptional()
  @IsString()
  previousSchool?: string;

  // ─── School / Class ─────────────────────────────────────────────────────────

  @ApiProperty()
  @IsUUID()
  schoolId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  classId?: string;
}