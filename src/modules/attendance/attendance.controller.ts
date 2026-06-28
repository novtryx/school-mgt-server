import {
  Controller,
  Get,
  Post,
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
import { AttendanceService } from './attendance.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('attendance')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @ApiOperation({
    summary: 'Submit attendance for a class on a given date',
    description:
      'Accepts the full class attendance grid from the mobile app. ' +
      'Safe to re-submit — existing records are updated rather than duplicated.',
  })
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  record(@Body() dto: RecordAttendanceDto) {
    return this.attendanceService.record(dto);
  }

  @ApiOperation({ summary: 'Get attendance for a class on a specific date' })
  @ApiQuery({ name: 'classId', type: String })
  @ApiQuery({ name: 'date', type: String, example: '2024-09-15' })
  @Get()
  findByClassAndDate(
    @Query('classId', ParseUUIDPipe) classId: string,
    @Query('date') date: string,
  ) {
    return this.attendanceService.findByClassAndDate(classId, date);
  }

  @ApiOperation({ summary: 'Get attendance history for a single student' })
  @ApiQuery({ name: 'studentId', type: String })
  @ApiQuery({ name: 'from', type: String, example: '2024-09-01' })
  @ApiQuery({ name: 'to', type: String, example: '2024-12-01' })
  @Get('student')
  findByStudent(
    @Query('studentId', ParseUUIDPipe) studentId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.attendanceService.findByStudent(studentId, from, to);
  }
}