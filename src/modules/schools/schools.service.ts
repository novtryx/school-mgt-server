import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from './entities/school.entity';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import {
  ResourceNotFoundException,
  DuplicateResourceException,
} from '../../common/exceptions/app.exceptions';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School)
    private readonly schoolsRepository: Repository<School>,
  ) {}

  /**
   * Register a new school account.
   */
  async create(dto: CreateSchoolDto): Promise<School> {
    const existing = await this.schoolsRepository.findOne({
      where: { adminEmail: dto.adminEmail },
    });
    if (existing) {
      throw new DuplicateResourceException('School', 'admin email');
    }

    const school = this.schoolsRepository.create(dto);
    return this.schoolsRepository.save(school);
  }

  /**
   * Find a school by its UUID.
   */
  async findById(id: string): Promise<School> {
    const school = await this.schoolsRepository.findOne({ where: { id } });
    if (!school) {
      throw new ResourceNotFoundException('School', id);
    }
    return school;
  }

  /**
   * Update school profile, including logo URL after upload.
   */
  async update(id: string, dto: UpdateSchoolDto): Promise<School> {
    const school = await this.findById(id);
    Object.assign(school, dto);
    return this.schoolsRepository.save(school);
  }

  /**
   * Set the school's logo URL after it has been stored.
   */
  async updateLogo(id: string, logoUrl: string): Promise<School> {
    const school = await this.findById(id);
    school.logoUrl = logoUrl;
    return this.schoolsRepository.save(school);
  }
}