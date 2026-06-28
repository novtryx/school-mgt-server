import { PartialType } from '@nestjs/swagger';
import { CreateGradingSchemeDto } from './create-grading-scheme.dto';

export class UpdateGradingSchemeDto extends PartialType(CreateGradingSchemeDto) {}