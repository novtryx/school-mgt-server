import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateDunningConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Days before exam to start reminders' })
  @IsOptional()
  @IsInt()
  @Min(1)
  daysBeforeExam?: number;

  @ApiPropertyOptional({ description: 'Custom email body (plain text or HTML)' })
  @IsOptional()
  @IsString()
  emailTemplate?: string;
}