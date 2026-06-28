import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  GradingScheme,
  GradeBand,
  DEFAULT_GRADE_BANDS,
} from './entities/grading-scheme.entity';
import { CreateGradingSchemeDto } from './dto/create-grading-scheme.dto';
import { UpdateGradingSchemeDto } from './dto/update-grading-scheme.dto';
import {
  ResourceNotFoundException,
  DuplicateResourceException,
} from '../../common/exceptions/app.exceptions';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class GradingService {
  constructor(
    @InjectRepository(GradingScheme)
    private readonly schemesRepository: Repository<GradingScheme>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new grading scheme for a school.
   * If isDefault is true, the previous default scheme is unset first.
   */
  async create(dto: CreateGradingSchemeDto): Promise<GradingScheme> {
    this.validateBands(dto.bands);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (dto.isDefault) {
        await queryRunner.manager.update(
          GradingScheme,
          { schoolId: dto.schoolId, isDefault: true },
          { isDefault: false },
        );
      }

      const scheme = this.schemesRepository.create(dto);
      const saved = await queryRunner.manager.save(GradingScheme, scheme);

      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get all grading schemes for a school.
   */
  async findBySchool(schoolId: string): Promise<GradingScheme[]> {
    return this.schemesRepository.find({
      where: { schoolId },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  /**
   * Get a single grading scheme by UUID.
   */
  async findById(id: string): Promise<GradingScheme> {
    const scheme = await this.schemesRepository.findOne({ where: { id } });
    if (!scheme) {
      throw new ResourceNotFoundException('Grading scheme', id);
    }
    return scheme;
  }

  /**
   * Get the active default scheme for a school.
   * Falls back to the system default bands if none is configured.
   */
  async getDefaultForSchool(schoolId: string): Promise<GradeBand[]> {
    const scheme = await this.schemesRepository.findOne({
      where: { schoolId, isDefault: true },
    });
    return scheme ? scheme.bands : DEFAULT_GRADE_BANDS;
  }

  /**
   * Update a grading scheme.
   * If isDefault is being set to true, unsets the previous default.
   */
  async update(id: string, dto: UpdateGradingSchemeDto): Promise<GradingScheme> {
    const scheme = await this.findById(id);

    if (dto.bands) {
      this.validateBands(dto.bands);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (dto.isDefault === true && !scheme.isDefault) {
        await queryRunner.manager.update(
          GradingScheme,
          { schoolId: scheme.schoolId, isDefault: true },
          { isDefault: false },
        );
      }

      Object.assign(scheme, dto);
      const saved = await queryRunner.manager.save(GradingScheme, scheme);

      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Set a scheme as the school's default, unsetting the previous one.
   */
  async setAsDefault(id: string): Promise<GradingScheme> {
    const scheme = await this.findById(id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(
        GradingScheme,
        { schoolId: scheme.schoolId, isDefault: true },
        { isDefault: false },
      );

      scheme.isDefault = true;
      const saved = await queryRunner.manager.save(GradingScheme, scheme);

      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Delete a grading scheme. Cannot delete the active default.
   */
  async remove(id: string): Promise<void> {
    const scheme = await this.findById(id);

    if (scheme.isDefault) {
      throw new BadRequestException(
        'Cannot delete the active default grading scheme. Set another scheme as default first.',
      );
    }

    await this.schemesRepository.remove(scheme);
  }

  /**
   * Resolve a percentage score to a grade string using the provided bands.
   * Bands are checked from highest minScore downward.
   */
  resolveGrade(percentageScore: number, bands: GradeBand[]): { grade: string; remark?: string } {
    const sorted = [...bands].sort((a, b) => b.minScore - a.minScore);

    for (const band of sorted) {
      if (percentageScore >= band.minScore && percentageScore <= band.maxScore) {
        return { grade: band.grade, remark: band.remark };
      }
    }

    // Fall through to the lowest band if nothing matches
    const lowest = sorted[sorted.length - 1];
    return { grade: lowest?.grade ?? 'F', remark: lowest?.remark };
  }

  /**
   * Validate that bands cover a complete, non-overlapping range.
   */
  private validateBands(bands: Array<{ grade: string; minScore: number; maxScore: number }>): void {
    if (!bands || bands.length === 0) {
      throw new BadRequestException('At least one grade band is required');
    }

    for (const band of bands) {
      if (band.minScore > band.maxScore) {
        throw new BadRequestException(
          `Grade '${band.grade}': minScore (${band.minScore}) cannot be greater than maxScore (${band.maxScore})`,
        );
      }
    }

    // Check for overlapping ranges
    const sorted = [...bands].sort((a, b) => a.minScore - b.minScore);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].maxScore >= sorted[i + 1].minScore) {
        throw new BadRequestException(
          `Grade bands '${sorted[i].grade}' and '${sorted[i + 1].grade}' have overlapping score ranges`,
        );
      }
    }
  }
}