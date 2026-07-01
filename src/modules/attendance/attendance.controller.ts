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
import { AttendanceSession } from './entities/attendance.entity';
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
    summary: 'Get the currently active session',
    description:
      'Returns whether morning or afternoon is active based on server time (WAT). ' +
      'Call this on page load to determine which register to show and whether ' +
      'morning is still open for submission.',
  })
  @Get('session/active')
  getActiveSession() {
    return this.attendanceService.getActiveSession();
  }

  @ApiOperation({
    summary: 'Submit attendance for a class session',
    description:
      'Accepts the full class list for a session. If `session` is omitted, ' +
      'the server auto-detects based on current time. Safe to re-submit — ' +
      'existing records for the same session are updated.',
  })
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  record(@Body() dto: RecordAttendanceDto) {
    return this.attendanceService.record(dto);
  }

  @ApiOperation({
    summary: 'Get daily attendance summary for a class',
    description:
      'Returns one row per student with their morning and afternoon records ' +
      'merged. Used by the web register view to show both sessions side by side.',
  })
  @ApiQuery({ name: 'classId', type: String })
  @ApiQuery({ name: 'date',    type: String, example: '2024-09-15' })
  @Get('daily')
  getDailySummary(
    @Query('classId', ParseUUIDPipe) classId: string,
    @Query('date') date: string,
  ) {
    return this.attendanceService.findDailySummary(classId, date);
  }

  @ApiOperation({
    summary: 'Get raw attendance records for a specific class, date, and session',
    description:
      'Used to pre-populate the register form with already-saved values ' +
      'before the teacher submits again.',
  })
  @ApiQuery({ name: 'classId', type: String })
  @ApiQuery({ name: 'date',    type: String, example: '2024-09-15' })
  @ApiQuery({ name: 'session', enum: AttendanceSession })
  @Get()
  findByClassDateSession(
    @Query('classId', ParseUUIDPipe) classId: string,
    @Query('date')    date: string,
    @Query('session') session: AttendanceSession,
  ) {
    return this.attendanceService.findByClassDateSession(classId, date, session);
  }

  @ApiOperation({
    summary: 'Get attendance history for a student across a date range',
    description:
      'Returns all sessions (morning and afternoon) so the caller can ' +
      'display them in a timeline or compute absence rates.',
  })
  @ApiQuery({ name: 'studentId', type: String })
  @ApiQuery({ name: 'from', type: String, example: '2024-09-01' })
  @ApiQuery({ name: 'to',   type: String, example: '2024-12-20' })
  @Get('student')
  findByStudent(
    @Query('studentId', ParseUUIDPipe) studentId: string,
    @Query('from') from: string,
    @Query('to')   to:   string,
  ) {
    return this.attendanceService.findByStudent(studentId, from, to);
  }

  @ApiOperation({
    summary: 'Get attendance statistics for a class across a date range',
    description:
      'Returns per-student counts of present/absent/late for both morning ' +
      'and afternoon sessions. Use this for the attendance report page.',
  })
  @ApiQuery({ name: 'classId', type: String })
  @ApiQuery({ name: 'from',    type: String, example: '2024-09-01' })
  @ApiQuery({ name: 'to',      type: String, example: '2024-12-20' })
  @Get('stats')
  getClassStats(
    @Query('classId', ParseUUIDPipe) classId: string,
    @Query('from') from: string,
    @Query('to')   to:   string,
  ) {
    return this.attendanceService.getClassStats(classId, from, to);
  }
}