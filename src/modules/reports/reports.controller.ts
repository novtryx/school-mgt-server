import {
  Controller,
  Get,
  Post,
  Patch,
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
import { ReportsService } from './reports.service';
import { GenerateReportsDto } from './dto/generate-reports.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @ApiOperation({
    summary: 'Aggregate scores and generate draft reports for a class',
    description:
      'Computes averages and positions for all students in the class. ' +
      'Safe to run multiple times — recalculates positions on each run.',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('generate')
  generate(@Body() dto: GenerateReportsDto) {
    return this.reportsService.generate(dto);
  }

  @ApiOperation({
    summary: 'Publish all reports for a class and send email to parents',
  })
  @ApiQuery({ name: 'classId', type: String })
  @ApiQuery({ name: 'term', type: String })
  @ApiQuery({ name: 'academicYear', type: String })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER)
  @Post('publish')
  publish(
    @Query('classId', ParseUUIDPipe) classId: string,
    @Query('term') term: string,
    @Query('academicYear') academicYear: string,
  ) {
    return this.reportsService.publishClass(classId, term, academicYear);
  }

  @ApiOperation({ summary: 'Get all reports for a class (for bulk print)' })
  @ApiQuery({ name: 'classId', type: String })
  @ApiQuery({ name: 'term', type: String })
  @ApiQuery({ name: 'academicYear', type: String })
  @Get()
  findByClass(
    @Query('classId', ParseUUIDPipe) classId: string,
    @Query('term') term: string,
    @Query('academicYear') academicYear: string,
  ) {
    return this.reportsService.findByClass(classId, term, academicYear);
  }

  @ApiOperation({ summary: 'Get a single report by ID' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reportsService.findById(id);
  }

  @ApiOperation({
    summary: 'Update form teacher comment and character trait ratings',
    description:
      'Accessible from the Form Teacher Terminal. Adds teacher narrative, ' +
      'conduct, punctuality, and neatness ratings (1–5 scale).',
  })
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/teacher-input')
  updateByFormTeacher(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportDto,
  ) {
    return this.reportsService.updateByFormTeacher(id, dto);
  }
}