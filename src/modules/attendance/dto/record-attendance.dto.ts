import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { AttendanceSession, AttendanceStatus } from '../entities/attendance.entity';

export class AttendanceEntryDto {
  @ApiProperty()
  @IsString()
  studentId!: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;
}

export class RecordAttendanceDto {
  @ApiProperty()
  @IsString()
  classId!: string;

  @ApiProperty({ example: '2024-09-15' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({
    enum: AttendanceSession,
    description:
      'Session to record. If omitted the server auto-detects based on current time: ' +
      'morning before 11:00, afternoon from 11:00 onwards.',
  })
  @IsOptional()
  @IsEnum(AttendanceSession)
  session?: AttendanceSession;

  @ApiProperty({ type: [AttendanceEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries!: AttendanceEntryDto[];
}