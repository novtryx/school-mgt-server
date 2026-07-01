import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Attendance,
  AttendanceSession,
  MORNING_CLOSE_HOUR,
} from './entities/attendance.entity';
import { RecordAttendanceDto } from './dto/record-attendance.dto';

export interface ActiveSessionInfo {
  session:         AttendanceSession;
  isMorningLocked: boolean;
  currentHour:     number;
  morningClosesAt: number;
}

export interface DailyAttendanceSummary {
  studentId:   string;
  student:     Attendance['student'];
  morning?:    Attendance;
  afternoon?:  Attendance;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Determine the active session based on current server time (WAT = UTC+1).
   * Morning session is available until MORNING_CLOSE_HOUR (11:00).
   * After that, only afternoon is available.
   */
  getActiveSession(): ActiveSessionInfo {
    // WAT is UTC+1
    const now         = new Date();
    const watHour     = (now.getUTCHours() + 1) % 24;
    const isMorning   = watHour < MORNING_CLOSE_HOUR;

    return {
      session:         isMorning ? AttendanceSession.MORNING : AttendanceSession.AFTERNOON,
      isMorningLocked: !isMorning,
      currentHour:     watHour,
      morningClosesAt: MORNING_CLOSE_HOUR,
    };
  }

  /**
   * Resolve which session to use. If the caller supplies one explicitly,
   * validate it is still open. If omitted, auto-detect from current time.
   */
  private resolveSession(requested?: AttendanceSession): AttendanceSession {
    const { session, isMorningLocked } = this.getActiveSession();

    if (!requested) {
      return session;
    }

    if (
      requested === AttendanceSession.MORNING &&
      isMorningLocked
    ) {
      throw new BadRequestException(
        `Morning registration closed at ${MORNING_CLOSE_HOUR}:00. ` +
        `You can only submit afternoon attendance now.`,
      );
    }

    return requested;
  }

  /**
   * Record or upsert attendance for an entire class for a given date and session.
   * Safe to re-submit — existing records for the same session are updated.
   */
  async record(dto: RecordAttendanceDto): Promise<{ saved: number; session: AttendanceSession }> {
    const session     = this.resolveSession(dto.session);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const entry of dto.entries) {
        await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into(Attendance)
          .values({
            studentId: entry.studentId,
            classId:   dto.classId,
            date:      dto.date,
            session,
            status:    entry.status,
          })
          .orUpdate(
            ['status', 'updated_at'],
            ['student_id', 'class_id', 'date', 'session'],
          )
          .execute();
      }

      await queryRunner.commitTransaction();
      return { saved: dto.entries.length, session };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get attendance for a class on a specific date.
   * Returns a daily summary with morning and afternoon records merged per student.
   * This is used by the web dashboard register view.
   */
  async findDailySummary(
    classId: string,
    date: string,
  ): Promise<DailyAttendanceSummary[]> {
    const records = await this.attendanceRepository.find({
      where: { classId, date },
      relations: { student: true },
      order: { student: { lastName: 'ASC' } },
    });

    // Merge morning and afternoon into one row per student
    const map = new Map<string, DailyAttendanceSummary>();

    for (const record of records) {
      if (!map.has(record.studentId)) {
        map.set(record.studentId, {
          studentId: record.studentId,
          student:   record.student,
        });
      }
      const entry = map.get(record.studentId)!;
      if (record.session === AttendanceSession.MORNING) {
        entry.morning = record;
      } else {
        entry.afternoon = record;
      }
    }

    return Array.from(map.values());
  }

  /**
   * Get raw attendance records for a class, date, and specific session.
   * Used to pre-populate the register form before submission.
   */
  async findByClassDateSession(
    classId: string,
    date:    string,
    session: AttendanceSession,
  ): Promise<Attendance[]> {
    return this.attendanceRepository.find({
      where:    { classId, date, session },
      relations: { student: true },
      order:    { student: { lastName: 'ASC' } },
    });
  }

  /**
   * Get attendance history for a student across a date range.
   * Returns all sessions so the caller can split morning/afternoon.
   */
  async findByStudent(
    studentId: string,
    from:      string,
    to:        string,
  ): Promise<Attendance[]> {
    return this.attendanceRepository
      .createQueryBuilder('a')
      .where('a.student_id = :studentId', { studentId })
      .andWhere('a.date BETWEEN :from AND :to', { from, to })
      .orderBy('a.date', 'ASC')
      .addOrderBy('a.session', 'ASC')
      .getMany();
  }

  /**
   * Get attendance statistics for a class across a date range.
   * Returns per-student counts: present, absent, late — for each session.
   */
  async getClassStats(
    classId: string,
    from:    string,
    to:      string,
  ): Promise<
    {
      studentId:        string;
      morningPresent:   number;
      morningAbsent:    number;
      morningLate:      number;
      afternoonPresent: number;
      afternoonAbsent:  number;
      afternoonLate:    number;
    }[]
  > {
    const rows = await this.attendanceRepository
      .createQueryBuilder('a')
      .select('a.student_id',  'studentId')
      .addSelect('a.session',  'session')
      .addSelect('a.status',   'status')
      .addSelect('COUNT(*)',   'count')
      .where('a.class_id = :classId', { classId })
      .andWhere('a.date BETWEEN :from AND :to', { from, to })
      .groupBy('a.student_id')
      .addGroupBy('a.session')
      .addGroupBy('a.status')
      .getRawMany<{
        studentId: string;
        session:   string;
        status:    string;
        count:     string;
      }>();

    // Pivot into one row per student
    const pivot = new Map<
      string,
      {
        studentId:        string;
        morningPresent:   number;
        morningAbsent:    number;
        morningLate:      number;
        afternoonPresent: number;
        afternoonAbsent:  number;
        afternoonLate:    number;
      }
    >();

    for (const row of rows) {
      if (!pivot.has(row.studentId)) {
        pivot.set(row.studentId, {
          studentId:        row.studentId,
          morningPresent:   0,
          morningAbsent:    0,
          morningLate:      0,
          afternoonPresent: 0,
          afternoonAbsent:  0,
          afternoonLate:    0,
        });
      }

      const entry  = pivot.get(row.studentId)!;
      const count  = parseInt(row.count, 10);
      const prefix = row.session === 'morning' ? 'morning' : 'afternoon';
      const key    =
        row.status === 'present'
          ? `${prefix}Present`
          : row.status === 'absent'
          ? `${prefix}Absent`
          : `${prefix}Late`;

      (entry as any)[key] = count;
    }

    return Array.from(pivot.values());
  }
}