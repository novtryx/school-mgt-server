import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { RecordAttendanceDto } from './dto/record-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Record or upsert attendance for an entire class on a given date.
   * Uses INSERT ... ON CONFLICT to allow re-submission from the mobile app
   * after offline sync without creating duplicates.
   */
  async record(dto: RecordAttendanceDto): Promise<{ saved: number }> {
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
            classId: dto.classId,
            date: dto.date,
            status: entry.status,
          })
          .orUpdate(['status', 'updated_at'], ['student_id', 'class_id', 'date'])
          .execute();
      }

      await queryRunner.commitTransaction();
      return { saved: dto.entries.length };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get attendance records for a class on a specific date.
   * Used by the mobile app to load the current-day grid state.
   */
  async findByClassAndDate(classId: string, date: string): Promise<Attendance[]> {
    return this.attendanceRepository.find({
      where: { classId, date },
      relations: { student: true },
      order: { student: { lastName: 'ASC' } },
    });
  }

  /**
   * Get attendance summary for a student across a date range.
   */
  async findByStudent(
    studentId: string,
    from: string,
    to: string,
  ): Promise<Attendance[]> {
    return this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.student_id = :studentId', { studentId })
      .andWhere('attendance.date BETWEEN :from AND :to', { from, to })
      .orderBy('attendance.date', 'ASC')
      .getMany();
  }
}