import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { School } from '../../schools/entities/school.entity';
import { ClassSection } from '../../classes/entities/class.entity';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum BloodGroup {
  A_POSITIVE = 'A+',
  A_NEGATIVE = 'A-',
  B_POSITIVE = 'B+',
  B_NEGATIVE = 'B-',
  AB_POSITIVE = 'AB+',
  AB_NEGATIVE = 'AB-',
  O_POSITIVE = 'O+',
  O_NEGATIVE = 'O-',
}

@Entity('students')
export class Student {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ─── Personal Information ────────────────────────────────────────────────────

  @ApiProperty({ example: 'Amina' })
  @Column({ name: 'first_name' })
  firstName!: string;

  @ApiPropertyOptional({ example: 'Tunde' })
  @Column({ name: 'middle_name', nullable: true })
  middleName?: string;

  @ApiProperty({ example: 'Bello' })
  @Column({ name: 'last_name' })
  lastName!: string;

  @ApiPropertyOptional({ example: 'STD-2024-001' })
  @Column({ name: 'admission_number', nullable: true })
  admissionNumber?: string;

  @ApiPropertyOptional({ example: '2010-05-14', description: 'Date of birth (YYYY-MM-DD)' })
  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: Gender })
  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender?: Gender;

  @ApiPropertyOptional({ enum: BloodGroup })
  @Column({ name: 'blood_group', type: 'enum', enum: BloodGroup, nullable: true })
  bloodGroup?: BloodGroup;

  @ApiPropertyOptional({ example: 'Nigerian' })
  @Column({ nullable: true })
  nationality?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @Column({ name: 'state_of_origin', nullable: true })
  stateOfOrigin?: string;

  @ApiPropertyOptional({ example: 'Yoruba' })
  @Column({ nullable: true })
  religion?: string;

  @ApiPropertyOptional()
  @Column({ name: 'photo_url', nullable: true })
  photoUrl?: string;

  // ─── Address ────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: '12 Bode Thomas Street' })
  @Column({ name: 'address_line1', nullable: true })
  addressLine1?: string;

  @ApiPropertyOptional({ example: 'Surulere' })
  @Column({ name: 'address_line2', nullable: true })
  addressLine2?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @Column({ nullable: true })
  city?: string;

  @ApiPropertyOptional({ example: 'Lagos State' })
  @Column({ nullable: true })
  state?: string;

  @ApiPropertyOptional({ example: 'Nigeria' })
  @Column({ nullable: true })
  country?: string;

  // ─── Medical / Emergency ────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'Penicillin' })
  @Column({ nullable: true })
  allergies?: string;

  @ApiPropertyOptional({ example: 'Asthma' })
  @Column({ name: 'medical_conditions', nullable: true })
  medicalConditions?: string;

  @ApiPropertyOptional({ example: 'Dr. Adeola Clinic, +2348011223344' })
  @Column({ name: 'emergency_contact', nullable: true })
  emergencyContact?: string;

  // ─── Parent / Guardian ──────────────────────────────────────────────────────

  @ApiProperty({ example: 'amina.parent@gmail.com' })
  @Column({ name: 'parent_email' })
  parentEmail!: string;

  @ApiProperty({ example: '+2348012345678' })
  @Column({ name: 'parent_phone' })
  parentPhone!: string;

  @ApiPropertyOptional({ example: 'Mrs Bello' })
  @Column({ name: 'parent_name', nullable: true })
  parentName?: string;

  @ApiPropertyOptional({ example: 'Mother' })
  @Column({ name: 'parent_relationship', nullable: true })
  parentRelationship?: string;

  @ApiPropertyOptional({ example: '+2348099887766', description: 'Secondary guardian contact' })
  @Column({ name: 'secondary_guardian_phone', nullable: true })
  secondaryGuardianPhone?: string;

  @ApiPropertyOptional({ example: 'Mr Bello' })
  @Column({ name: 'secondary_guardian_name', nullable: true })
  secondaryGuardianName?: string;

  // ─── Academic ───────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: '2024-09-01', description: 'Date admitted to the school' })
  @Column({ name: 'admission_date', type: 'date', nullable: true })
  admissionDate?: string;

  @ApiPropertyOptional({ example: 'Transfer from Lagos Island Academy' })
  @Column({ name: 'previous_school', nullable: true })
  previousSchool?: string;

  // ─── Relations ──────────────────────────────────────────────────────────────

  @ApiProperty()
  @Index()
  @Column({ name: 'school_id' })
  schoolId!: string;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school!: School;

  @ApiPropertyOptional()
  @Index()
  @Column({ name: 'class_id', nullable: true })
  classId?: string;

  @ManyToOne(() => ClassSection, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'class_id' })
  class?: ClassSection;

  @ApiProperty({ default: true })
  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}