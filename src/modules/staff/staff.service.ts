import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StaffAssignment } from './entities/staff-assignment.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { AssignStaffDto } from './dto/assign-staff.dto';
import { ResourceNotFoundException } from '../../common/exceptions/app.exceptions';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(StaffAssignment)
    private readonly assignmentRepository: Repository<StaffAssignment>,
    @InjectRepository(Subject)
    private readonly subjectsRepository: Repository<Subject>,
  ) {}

  /**
   * Create or update a staff duty assignment for a teacher in a class section.
   * If an assignment already exists for that teacher+class pair, it is updated.
   */
  async assign(dto: AssignStaffDto): Promise<StaffAssignment> {
    let assignment = await this.assignmentRepository.findOne({
      where: { userId: dto.userId, classId: dto.classId },
      relations: { subjects: true },
    });

    if (!assignment) {
      assignment = this.assignmentRepository.create({
        userId: dto.userId,
        classId: dto.classId,
      });
    }

    assignment.isClassTeacher = dto.isClassTeacher ?? false;

    if (dto.subjectIds && dto.subjectIds.length > 0) {
      const subjects = await this.subjectsRepository.findBy({
        id: In(dto.subjectIds),
      });
      assignment.subjects = subjects;
    } else {
      assignment.subjects = [];
    }

    return this.assignmentRepository.save(assignment);
  }

  /**
   * Get all staff assignments for a class section.
   */
  async findByClass(classId: string): Promise<StaffAssignment[]> {
    return this.assignmentRepository.find({
      where: { classId },
      relations: { user: true, subjects: true },
    });
  }

  /**
   * Get all assignments for a specific teacher.
   */
  async findByUser(userId: string): Promise<StaffAssignment[]> {
    return this.assignmentRepository.find({
      where: { userId },
      relations: { class: true, subjects: true },
    });
  }

  /**
   * Get a single assignment by its UUID.
   */
  async findById(id: string): Promise<StaffAssignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
      relations: { user: true, class: true, subjects: true },
    });
    if (!assignment) {
      throw new ResourceNotFoundException('Staff assignment', id);
    }
    return assignment;
  }

  /**
   * Remove a staff assignment.
   */
  async remove(id: string): Promise<void> {
    const assignment = await this.findById(id);
    await this.assignmentRepository.remove(assignment);
  }
}