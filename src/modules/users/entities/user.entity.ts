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
import { Exclude } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { School } from '../../schools/entities/school.entity';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  BURSAR = 'bursar',
  TEACHER = 'teacher',
  PARENT = 'parent',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

@Entity('users')
export class User {
  @ApiProperty({ example: 'uuid-v4' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'Adaeze' })
  @Column({ name: 'first_name' })
  firstName!: string;

  @ApiProperty({ example: 'Okafor' })
  @Column({ name: 'last_name' })
  lastName!: string;

  @ApiProperty({ example: 'adaeze@school.ng' })
  @Index()
  @Column({ unique: true })
  email!: string;

  @Exclude()
  @Column({ nullable: true })
  password?: string;

  @ApiProperty({ enum: UserRole })
  @Column({ type: 'enum', enum: UserRole, default: UserRole.TEACHER })
  role!: UserRole;

  @ApiProperty({ enum: AuthProvider })
  @Column({
    name: 'auth_provider',
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider!: AuthProvider;

  @ApiPropertyOptional()
  @Column({ name: 'google_id', nullable: true })
  googleId?: string;

  @ApiPropertyOptional()
  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @ApiProperty()
  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @ApiProperty({ default: false })
  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified!: boolean;

  @ApiPropertyOptional()
  @Column({ name: 'phone_number', nullable: true })
  phoneNumber?: string;

  // Refresh token — hashed before storage
  @Exclude()
  @Column({ name: 'refresh_token', nullable: true })
  refreshToken?: string;

  // Password reset
  @Exclude()
  @Column({ name: 'password_reset_token', nullable: true })
  passwordResetToken?: string;

  @Exclude()
  @Column({ name: 'password_reset_expires', nullable: true, type: 'timestamptz' })
  passwordResetExpires?: Date;

  // Email verification
  @Exclude()
  @Column({ name: 'email_verification_token', nullable: true })
  emailVerificationToken?: string;

  @ApiPropertyOptional()
  @Index()
  @Column({ name: 'school_id', nullable: true })
  schoolId?: string;

  @ManyToOne(() => School, (school) => school.users, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'school_id' })
  school?: School;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}