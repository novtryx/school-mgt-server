import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from './entities/subject.entity';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { ResourceNotFoundException } from '../../common/exceptions/app.exceptions';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectsRepository: Repository<Subject>,
  ) {}

  /** Create a subject for a class section. */
  async create(dto: CreateSubjectDto): Promise<Subject> {
    const subject = this.subjectsRepository.create(dto);
    return this.subjectsRepository.save(subject);
  }

  /** Get all subjects in a class section. */
  async findByClass(classId: string): Promise<Subject[]> {
    return this.subjectsRepository.find({ where: { classId } });
  }

  /** Find a subject by its UUID. */
  async findById(id: string): Promise<Subject> {
    const subject = await this.subjectsRepository.findOne({ where: { id } });
    if (!subject) {
      throw new ResourceNotFoundException('Subject', id);
    }
    return subject;
  }

  /** Update subject details including score caps. */
  async update(id: string, dto: UpdateSubjectDto): Promise<Subject> {
    const subject = await this.findById(id);
    Object.assign(subject, dto);
    return this.subjectsRepository.save(subject);
  }

  /** Remove a subject. */
  async remove(id: string): Promise<void> {
    const subject = await this.findById(id);
    await this.subjectsRepository.remove(subject);
  }
}