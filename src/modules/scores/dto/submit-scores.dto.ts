import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ScoreTerm } from '../entities/score.entity';

export class ScoreEntryDto {
  @ApiProperty()
  @IsUUID()
  studentId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  caScore!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  examScore!: number;
}

export class SubmitScoresDto {
  @ApiProperty()
  @IsUUID()
  subjectId!: string;

  @ApiProperty({ enum: ScoreTerm })
  @IsEnum(ScoreTerm)
  term!: ScoreTerm;

  @ApiProperty({ example: '2024/2025' })
  @IsString()
  academicYear!: string;

  @ApiProperty({ type: [ScoreEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreEntryDto)
  entries!: ScoreEntryDto[];
}