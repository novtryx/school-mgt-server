import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID } from 'class-validator';
import { ScoreTerm } from '../../scores/entities/score.entity';

export class GenerateReportsDto {
  @ApiProperty({ description: 'Class section to aggregate results for' })
  @IsUUID()
  classId!: string;

  @ApiProperty({ enum: ScoreTerm })
  @IsEnum(ScoreTerm)
  term!: ScoreTerm;

  @ApiProperty({ example: '2024/2025' })
  @IsString()
  academicYear!: string;
}