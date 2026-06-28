import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Score, ScoreTerm } from './entities/score.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { SubmitScoresDto } from './dto/submit-scores.dto';
import { GradingService } from '../grading/grading.service';
import {
  ResourceNotFoundException,
  ScoreValidationException,
} from '../../common/exceptions/app.exceptions';

@Injectable()
export class ScoresService {
  constructor(
    @InjectRepository(Score)
    private readonly scoresRepository: Repository<Score>,
    @InjectRepository(Subject)
    private readonly subjectsRepository: Repository<Subject>,
    private readonly gradingService: GradingService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Validate all score entries against the subject's configured caps,
   * resolve grades using the school's configured grading scheme,
   * then upsert in a single transaction.
   * This is the server-side enforcement of the spec's "Validation Wall".
   */
  async submit(dto: SubmitScoresDto): Promise<{ saved: number }> {
    const subject = await this.subjectsRepository.findOne({
      where: { id: dto.subjectId },
    });
    if (!subject) {
      throw new ResourceNotFoundException('Subject', dto.subjectId);
    }

    // Validate all entries before touching the database
    for (const entry of dto.entries) {
      if (entry.caScore > subject.maxCaScore) {
        throw new ScoreValidationException('CA score', entry.caScore, subject.maxCaScore);
      }
      if (entry.examScore > subject.maxExamScore) {
        throw new ScoreValidationException('Exam score', entry.examScore, subject.maxExamScore);
      }
    }

    // Fetch the school's active grading bands once for the entire batch
    const gradeBands = await this.gradingService.getDefaultForSchool(subject.schoolId);
    const maxTotal = subject.maxCaScore + subject.maxExamScore;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const entry of dto.entries) {
        const totalScore = Number(entry.caScore) + Number(entry.examScore);

        // Resolve grade as a percentage of the subject's total possible marks
        const percentageScore = maxTotal > 0 ? (totalScore / maxTotal) * 100 : 0;
        const { grade } = this.gradingService.resolveGrade(percentageScore, gradeBands);

        await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into(Score)
          .values({
            studentId: entry.studentId,
            subjectId: dto.subjectId,
            term: dto.term,
            academicYear: dto.academicYear,
            caScore: entry.caScore,
            examScore: entry.examScore,
            totalScore,
            grade,
          })
          .orUpdate(
            ['ca_score', 'exam_score', 'total_score', 'grade', 'updated_at'],
            ['student_id', 'subject_id', 'term', 'academic_year'],
          )
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
   * Get all scores for a subject in a given term and academic year.
   */
  async findBySubjectAndTerm(
    subjectId: string,
    term: ScoreTerm,
    academicYear: string,
  ): Promise<Score[]> {
    return this.scoresRepository.find({
      where: { subjectId, term, academicYear },
      relations: { student: true },
      order: { student: { lastName: 'ASC' } },
    });
  }

  /**
   * Get all scores for a student across all subjects in a term.
   */
  async findByStudentAndTerm(
    studentId: string,
    term: ScoreTerm,
    academicYear: string,
  ): Promise<Score[]> {
    return this.scoresRepository.find({
      where: { studentId, term, academicYear },
      relations: { subject: true },
    });
  }

  /**
   * Get a single score record by UUID.
   */
  async findById(id: string): Promise<Score> {
    const score = await this.scoresRepository.findOne({
      where: { id },
      relations: { student: true, subject: true },
    });
    if (!score) {
      throw new ResourceNotFoundException('Score', id);
    }
    return score;
  }
}