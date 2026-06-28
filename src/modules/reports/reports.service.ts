import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Report, ReportStatus } from './entities/report.entity';
import { Score } from '../scores/entities/score.entity';
import { GenerateReportsDto } from './dto/generate-reports.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ResourceNotFoundException } from '../../common/exceptions/app.exceptions';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportsRepository: Repository<Report>,
    @InjectRepository(Score)
    private readonly scoresRepository: Repository<Score>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Aggregate all scores for a class section in a given term, compute each
   * student's average, rank them by average descending, and upsert a Report
   * row for each student. Safe to re-run — positions will be recalculated.
   */
  async generate(dto: GenerateReportsDto): Promise<{ generated: number }> {
    const scores = await this.scoresRepository.find({
      where: { term: dto.term, academicYear: dto.academicYear },
      relations: { student: true },
    });

    const studentsInClass = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM students WHERE class_id = $1 AND is_active = true`,
      [dto.classId],
    );
    const classStudentIds = new Set(studentsInClass.map((s) => s.id));

    const scoresForClass = scores.filter((s) => classStudentIds.has(s.studentId));

    const studentTotals = new Map<string, number[]>();
    for (const score of scoresForClass) {
      const existing = studentTotals.get(score.studentId) ?? [];
      existing.push(Number(score.totalScore));
      studentTotals.set(score.studentId, existing);
    }

    const averages: Array<{ studentId: string; average: number }> = [];
    for (const [studentId, totals] of studentTotals.entries()) {
      const average = totals.reduce((a, b) => a + b, 0) / totals.length;
      averages.push({ studentId, average: Math.round(average * 100) / 100 });
    }

    averages.sort((a, b) => b.average - a.average);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (let i = 0; i < averages.length; i++) {
        const { studentId, average } = averages[i];
        const position = i + 1;

        await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into(Report)
          .values({
            studentId,
            classId: dto.classId,
            term: dto.term,
            academicYear: dto.academicYear,
            average,
            position,
            status: ReportStatus.DRAFT,
          })
          .orUpdate(
            ['average', 'position', 'updated_at'],
            ['student_id', 'class_id', 'term', 'academic_year'],
          )
          .execute();
      }

      await queryRunner.commitTransaction();
      return { generated: averages.length };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update the form teacher narrative and character trait sliders on a report.
   */
  async updateByFormTeacher(id: string, dto: UpdateReportDto): Promise<Report> {
    const report = await this.findById(id);
    Object.assign(report, dto);
    return this.reportsRepository.save(report);
  }

  /**
   * Publish all draft reports for a class and term, then send email to each parent.
   */
  async publishClass(
    classId: string,
    term: string,
    academicYear: string,
  ): Promise<{ published: number }> {
    const reports = await this.reportsRepository.find({
      where: { classId, term: term as any, academicYear, status: ReportStatus.DRAFT },
      relations: { student: true },
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const report of reports) {
        report.status = ReportStatus.PUBLISHED;
        await queryRunner.manager.save(Report, report);

        await this.notificationsService.sendReportCardEmail(
          report.student.parentEmail,
          report.student.parentName ?? `Parent of ${report.student.firstName}`,
          report.student.firstName,
          report,
        );
      }

      await queryRunner.commitTransaction();
      return { published: reports.length };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get all reports for a class section in a term — used for the bulk print action.
   */
  async findByClass(
    classId: string,
    term: string,
    academicYear: string,
  ): Promise<Report[]> {
    return this.reportsRepository.find({
      where: { classId, term: term as any, academicYear },
      relations: { student: true },
      order: { position: 'ASC' },
    });
  }

  /**
   * Get a single report by UUID.
   */
  async findById(id: string): Promise<Report> {
    const report = await this.reportsRepository.findOne({
      where: { id },
      relations: { student: true, class: true },
    });
    if (!report) {
      throw new ResourceNotFoundException('Report', id);
    }
    return report;
  }
}