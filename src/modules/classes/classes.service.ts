import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassSection } from './entities/class.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ResourceNotFoundException } from '../../common/exceptions/app.exceptions';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(ClassSection)
    private readonly classesRepository: Repository<ClassSection>,
  ) {}

  /** Create a new class section for a school. */
  async create(dto: CreateClassDto): Promise<ClassSection> {
    const section = this.classesRepository.create(dto);
    return this.classesRepository.save(section);
  }

  /** Get all class sections belonging to a school. */
  async findAllBySchool(schoolId: string): Promise<ClassSection[]> {
    return this.classesRepository.find({ where: { schoolId } });
  }

  /** Find a class section by its UUID. */
  async findById(id: string): Promise<ClassSection> {
    const section = await this.classesRepository.findOne({ where: { id } });
    if (!section) {
      throw new ResourceNotFoundException('Class section', id);
    }
    return section;
  }

  /** Update a class section. */
  async update(id: string, dto: UpdateClassDto): Promise<ClassSection> {
    const section = await this.findById(id);
    Object.assign(section, dto);
    return this.classesRepository.save(section);
  }

  /** Delete a class section. */
  async remove(id: string): Promise<void> {
    const section = await this.findById(id);
    await this.classesRepository.remove(section);
  }
}