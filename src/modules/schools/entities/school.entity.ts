import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

@Entity('schools')
export class School {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'Greenfield Academy' })
  @Column({ name: 'name' })
  name!: string;

  @ApiProperty({ example: 'NGN' })
  @Column({ name: 'currency_code', default: 'NGN' })
  currencyCode!: string;

  @ApiProperty({ example: 'admin@greenfield.ng' })
  @Column({ name: 'admin_email', unique: true })
  adminEmail!: string;

  @ApiPropertyOptional()
  @Column({ name: 'logo_url', nullable: true })
  logoUrl?: string;

  @ApiPropertyOptional()
  @Column({ name: 'address', nullable: true })
  address?: string;

  @ApiPropertyOptional()
  @Column({ name: 'phone', nullable: true })
  phone?: string;

  @ApiProperty({ default: true })
  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @OneToMany(() => User, (user) => user.school)
  users!: User[];

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}