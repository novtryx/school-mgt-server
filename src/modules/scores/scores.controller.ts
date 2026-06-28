import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ScoresService } from './scores.service';
import { SubmitScoresDto } from './dto/submit-scores.dto';
import { ScoreTerm } from './entities/score.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('scores')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('scores')
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @ApiOperation({
    summary: 'Submit scores for a subject',
    description:
      'Server enforces the Validation Wall — rejects any CA or exam score ' +
      'exceeding the configured cap on the subject. Safe to re-submit (upserts).',
  })
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  submit(@Body() dto: SubmitScoresDto) {
    return this.scoresService.submit(dto);
  }

  @ApiOperation({ summary: 'Get all scores for a subject in a term' })
  @ApiQuery({ name: 'subjectId', type: String })
  @ApiQuery({ name: 'term', enum: ScoreTerm })
  @ApiQuery({ name: 'academicYear', type: String, example: '2024/2025' })
  @Get('by-subject')
  findBySubject(
    @Query('subjectId', ParseUUIDPipe) subjectId: string,
    @Query('term') term: ScoreTerm,
    @Query('academicYear') academicYear: string,
  ) {
    return this.scoresService.findBySubjectAndTerm(subjectId, term, academicYear);
  }

  @ApiOperation({ summary: 'Get all scores for a student in a term' })
  @ApiQuery({ name: 'studentId', type: String })
  @ApiQuery({ name: 'term', enum: ScoreTerm })
  @ApiQuery({ name: 'academicYear', type: String, example: '2024/2025' })
  @Get('by-student')
  findByStudent(
    @Query('studentId', ParseUUIDPipe) studentId: string,
    @Query('term') term: ScoreTerm,
    @Query('academicYear') academicYear: string,
  ) {
    return this.scoresService.findByStudentAndTerm(studentId, term, academicYear);
  }

  @ApiOperation({ summary: 'Get a single score record by ID' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.scoresService.findById(id);
  }
}