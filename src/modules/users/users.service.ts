import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, AuthProvider, InviteStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import {
  ResourceNotFoundException,
  DuplicateResourceException,
} from '../../common/exceptions/app.exceptions';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Find a user by their email address.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  /**
   * Find a user by their Google OAuth ID.
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { googleId } });
  }

  /**
   * Find a user by their UUID — throws if not found.
   */
  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new ResourceNotFoundException('User', id);
    }
    return user;
  }

  /**
   * Find a user by their password reset token (already hashed).
   */
  async findByResetToken(hashedToken: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { passwordResetToken: hashedToken },
    });
  }

  /**
   * Find a user by their email verification token.
   */
  async findByEmailVerificationToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { emailVerificationToken: token },
    });
  }

  /**
   * Find a user by their invite token.
   */
  async findByInviteToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { inviteToken: token },
    });
  }

  /**
   * Find all users belonging to a school.
   */
  async findAllBySchool(schoolId: string): Promise<User[]> {
    return this.usersRepository.find({
      where: { schoolId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Create a new user with optional password hashing.
   */
  async create(dto: CreateUserDto, schoolId?: string): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new DuplicateResourceException('User', 'email');
    }

    let hashedPassword: string | undefined;
    if (dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, 12);
    }

    const user = this.usersRepository.create({
      ...dto,
      password: hashedPassword,
      schoolId,
    });

    return this.usersRepository.save(user);
  }

  /**
   * Create a user and set additional token fields in one operation.
   * Used during registration to set the email verification token atomically.
   */
  async createWithToken(
    dto: CreateUserDto,
    schoolId: string,
    extras: { emailVerificationToken?: string },
  ): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new DuplicateResourceException('User', 'email');
    }

    let hashedPassword: string | undefined;
    if (dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, 12);
    }

    const user = this.usersRepository.create({
      ...dto,
      password: hashedPassword,
      schoolId,
      ...extras,
    });

    return this.usersRepository.save(user);
  }

  /**
   * Create a staff account in pending invite state.
   * No password is set — the user sets it when they accept the invite.
   * Returns the raw invite token (not hashed) for embedding in the email.
   */
  async createInvitedUser(
    dto: InviteUserDto,
  ): Promise<{ user: User; rawToken: string }> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new DuplicateResourceException('User', 'email');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    const user = this.usersRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      role: dto.role,
      phoneNumber: dto.phoneNumber,
      schoolId: dto.schoolId,
      inviteToken: rawToken,
      inviteExpires: expires,
      inviteStatus: InviteStatus.PENDING,
      isEmailVerified: false,
      isActive: false, // Not active until invite is accepted
    });

    const saved = await this.usersRepository.save(user);
    return { user: saved, rawToken };
  }

  /**
   * Accept an invite — set the user's password, mark them active and verified.
   */
  async acceptInvite(token: string, password: string): Promise<User> {
    const user = await this.findByInviteToken(token);

    if (!user) {
      throw new BadRequestException('Invalid or already used invite link');
    }

    if (!user.inviteExpires || user.inviteExpires < new Date()) {
      throw new BadRequestException(
        'This invite link has expired. Ask your administrator to resend the invite.',
      );
    }

    if (user.inviteStatus === InviteStatus.ACCEPTED) {
      throw new BadRequestException(
        'This invite has already been accepted. Please log in instead.',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    user.password = hashedPassword;
    user.inviteStatus = InviteStatus.ACCEPTED;
    user.inviteToken = undefined;
    user.inviteExpires = undefined;
    user.isActive = true;
    user.isEmailVerified = true;

    return this.usersRepository.save(user);
  }

  /**
   * Resend an invite to a pending user with a fresh token and expiry.
   * Returns the new raw token for the email.
   */
  async resendInvite(userId: string): Promise<{ user: User; rawToken: string }> {
    const user = await this.findById(userId);

    if (user.inviteStatus === InviteStatus.ACCEPTED) {
      throw new BadRequestException('This user has already accepted their invite');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 72 * 60 * 60 * 1000);

    user.inviteToken = rawToken;
    user.inviteExpires = expires;
    user.inviteStatus = InviteStatus.PENDING;

    const saved = await this.usersRepository.save(user);
    return { user: saved, rawToken };
  }

  /**
   * Create or update a user from a Google OAuth profile.
   */
  async findOrCreateFromGoogle(profile: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  }): Promise<User> {
    let user = await this.findByGoogleId(profile.googleId);
    if (user) {
      return user;
    }

    user = await this.findByEmail(profile.email);
    if (user) {
      user.googleId = profile.googleId;
      user.authProvider = AuthProvider.GOOGLE;
      user.isEmailVerified = true;
      user.isActive = true;
      user.inviteStatus = InviteStatus.ACCEPTED;
      if (profile.avatarUrl) {
        user.avatarUrl = profile.avatarUrl;
      }
      return this.usersRepository.save(user);
    }

    const newUser = this.usersRepository.create({
      ...profile,
      authProvider: AuthProvider.GOOGLE,
      isEmailVerified: true,
      isActive: true,
    });

    return this.usersRepository.save(newUser);
  }

  /**
   * Update a user's profile fields.
   */
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 12);
    }

    Object.assign(user, dto);
    return this.usersRepository.save(user);
  }

  /**
   * Store the hashed refresh token on the user record.
   */
  async setRefreshToken(id: string, hashedToken: string): Promise<void> {
    await this.usersRepository.update(id, { refreshToken: hashedToken });
  }

  /**
   * Clear the refresh token — used on logout.
   */
  async clearRefreshToken(id: string): Promise<void> {
    await this.usersRepository.update(id, { refreshToken: undefined });
  }

  /**
   * Store the hashed password reset token and its expiry.
   */
  async setPasswordResetToken(
    id: string,
    hashedToken: string,
    expires: Date,
  ): Promise<void> {
    await this.usersRepository.update(id, {
      passwordResetToken: hashedToken,
      passwordResetExpires: expires,
    });
  }

  /**
   * Hash and set a new password, then clear the reset token fields.
   */
  async resetPassword(id: string, newPassword: string): Promise<void> {
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.usersRepository.update(id, {
      password: hashed,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
      refreshToken: undefined,
    });
  }

  /**
   * Hash and update the password for an authenticated user.
   */
  async updatePassword(id: string, newPassword: string): Promise<void> {
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.usersRepository.update(id, { password: hashed });
  }

  /**
   * Mark the user's email as verified and clear the verification token.
   */
  async markEmailVerified(id: string): Promise<void> {
    await this.usersRepository.update(id, {
      isEmailVerified: true,
      emailVerificationToken: undefined,
    });
  }

  /**
   * Soft-delete a user by marking them inactive.
   */
  async deactivate(id: string): Promise<User> {
    const user = await this.findById(id);
    user.isActive = false;
    return this.usersRepository.save(user);
  }
}