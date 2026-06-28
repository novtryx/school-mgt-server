import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Student } from './entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { BulkImportStudentsDto } from './dto/bulk-import.dto';
import {
  ResourceNotFoundException,
  SchoolLimitExceededException,
} from '../../common/exceptions/app.exceptions';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Enforce the subscription student cap before creating new students.
   */
  private async enforceStudentCap(schoolId: string, adding: number): Promise<void> {
    const currentCount = await this.studentsRepository.count({
      where: { schoolId, isActive: true },
    });
    const plan = await this.subscriptionsService.getActivePlanForSchool(schoolId);
    if (plan.studentLimit !== null && currentCount + adding > plan.studentLimit) {
      throw new SchoolLimitExceededException(plan.name, plan.studentLimit);
    }
  }

  /**
   * Create a single student record.
   */
  async create(dto: CreateStudentDto): Promise<Student> {
    await this.enforceStudentCap(dto.schoolId, 1);
    const student = this.studentsRepository.create(dto);
    return this.studentsRepository.save(student);
  }

  /**
   * Bulk insert validated student records from an Excel or PDF import.
   * Runs inside a single transaction so the operation is all-or-nothing.
   */
  async bulkImport(dto: BulkImportStudentsDto): Promise<{ imported: number }> {
    await this.enforceStudentCap(dto.schoolId, dto.students.length);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const entities = dto.students.map((s) =>
        this.studentsRepository.create({ ...s, schoolId: dto.schoolId }),
      );
      await queryRunner.manager.save(Student, entities);
      await queryRunner.commitTransaction();
      return { imported: entities.length };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Parse an uploaded Excel file buffer and return preview rows.
   * The buffer is the raw XLSX content; column mapping is fixed by the template.
   * Expected columns: firstName, lastName, admissionNumber, parentEmail, parentPhone, parentName
   */
  parseExcelBuffer(buffer: Buffer): Partial<CreateStudentDto>[] {
    // Dynamically require xlsx to avoid top-level import issues in environments
    // where the package may not be bundled. Install: npm i xlsx
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require('xlsx') as typeof import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

    return rows.map((row) => ({
      firstName: row['firstName'] ?? row['First Name'] ?? '',
      lastName: row['lastName'] ?? row['Last Name'] ?? '',
      admissionNumber: row['admissionNumber'] ?? row['Admission Number'],
      parentEmail: row['parentEmail'] ?? row['Parent Email'] ?? '',
      parentPhone: row['parentPhone'] ?? row['Parent Phone'] ?? '',
      parentName: row['parentName'] ?? row['Parent Name'],
    }));
  }

  /**
   * Get all students in a school, optionally filtered by class.
   */
  async findBySchool(schoolId: string, classId?: string): Promise<Student[]> {
    const where: Record<string, string> = { schoolId };
    if (classId) where['classId'] = classId;
    return this.studentsRepository.find({ where, relations: { class: true } });
  }

  /**
   * Find a student by UUID.
   */
  async findById(id: string): Promise<Student> {
    const student = await this.studentsRepository.findOne({
      where: { id },
      relations: { class: true, school: true },
    });
    if (!student) {
      throw new ResourceNotFoundException('Student', id);
    }
    return student;
  }

  /**
   * Update a student record.
   */
  async update(id: string, dto: UpdateStudentDto): Promise<Student> {
    const student = await this.findById(id);
    Object.assign(student, dto);
    return this.studentsRepository.save(student);
  }

  /**
   * Soft-delete a student by marking them inactive.
   */
  async deactivate(id: string): Promise<Student> {
    const student = await this.findById(id);
    student.isActive = false;
    return this.studentsRepository.save(student);
  }

  /**
   * Count active students in a school — used by the fees dashboard metrics.
   */
  async countBySchool(schoolId: string): Promise<number> {
    return this.studentsRepository.count({ where: { schoolId, isActive: true } });
  }
}