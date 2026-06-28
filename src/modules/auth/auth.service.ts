import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { SchoolsService } from '../schools/schools.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AcceptInviteDto } from '../users/dto/accept-invite.dto';
import { User, UserRole } from '../users/entities/user.entity';
import {
  InvalidCredentialsException,
  TokenExpiredException,
  ResourceNotFoundException,
} from '../../common/exceptions/app.exceptions';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly schoolsService: SchoolsService,
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Register a new school and its admin user in a single transaction.
   * Sends a verification email after creation.
   */
  async register(dto: RegisterDto): Promise<AuthResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const school = await this.schoolsService.create({
        name: dto.schoolName,
        currencyCode: dto.currencyCode,
        adminEmail: dto.email,
        address: dto.address,
        phone: dto.phone,
      });

      const verificationToken = crypto.randomBytes(32).toString('hex');

      const user = await this.usersService.createWithToken(
        {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          password: dto.password,
          role: UserRole.ADMIN,
        },
        school.id,
        { emailVerificationToken: verificationToken },
      );

      await queryRunner.commitTransaction();

      // Send verification email — non-blocking, don't fail registration if this errors
      this.notificationsService
        .sendEmailVerification(user.email, user.firstName, verificationToken)
        .catch(() => null);

      return this.buildAuthResult(user);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Accept a staff invite — set password and activate the account.
   */
  async acceptInvite(dto: AcceptInviteDto): Promise<AuthResult> {
    const user = await this.usersService.acceptInvite(dto.token, dto.password);
    return this.buildAuthResult(user);
  }

  /**
   * Validate credentials and return an access + refresh token pair.
   */
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !user.password) {
      throw new InvalidCredentialsException();
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    return this.buildAuthResult(user);
  }

  /**
   * Issue new access + refresh tokens given a valid refresh token.
   */
  async refreshTokens(dto: RefreshTokenDto): Promise<TokenPair> {
    let payload: { sub: string; email: string };

    try {
      payload = this.jwtService.verify<{ sub: string; email: string }>(
        dto.refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user.refreshToken) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const isValid = await bcrypt.compare(dto.refreshToken, user.refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.issueTokenPair(user);
  }

  /**
   * Revoke the stored refresh token — effectively logs the user out.
   */
  async logout(userId: string): Promise<{ message: string }> {
    await this.usersService.clearRefreshToken(userId);
    return { message: 'Logged out successfully' };
  }

  /**
   * Send a password reset email with a time-limited token.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(dto.email);

    // Always return the same message to prevent email enumeration
    const message = 'If an account with that email exists, a reset link has been sent';

    if (!user) {
      return { message };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.usersService.setPasswordResetToken(user.id, hashedToken, expires);

    this.notificationsService
      .sendPasswordReset(user.email, user.firstName, resetToken)
      .catch(() => null);

    return { message };
  }

  /**
   * Validate the reset token and set the new password.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const hashedToken = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');

    const user = await this.usersService.findByResetToken(hashedToken);

    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Password reset token is invalid or has expired');
    }

    await this.usersService.resetPassword(user.id, dto.newPassword);

    return { message: 'Password has been reset successfully' };
  }

  /**
   * Change password for an authenticated user.
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);

    if (!user.password) {
      throw new BadRequestException('This account uses Google sign-in and has no password');
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    await this.usersService.updatePassword(userId, dto.newPassword);

    return { message: 'Password changed successfully' };
  }

  /**
   * Verify email address using the token sent at registration.
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmailVerificationToken(token);

    if (!user) {
      throw new BadRequestException('Invalid or already used verification token');
    }

    await this.usersService.markEmailVerified(user.id);

    return { message: 'Email verified successfully' };
  }

  /**
   * Generate a JWT for a Google OAuth authenticated user and return full auth result.
   */
  async googleLogin(user: User): Promise<AuthResult> {
    return this.buildAuthResult(user);
  }

  /**
   * Build the full auth result: sign both tokens, store hashed refresh token.
   */
  private async buildAuthResult(user: User): Promise<AuthResult> {
    const tokens = await this.issueTokenPair(user);
    return { ...tokens, user };
  }

  /**
   * Sign a new access token and refresh token, then persist the hashed refresh token.
   */
  private async issueTokenPair(user: User): Promise<TokenPair> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d') as `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`,
      }),
    ]);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.setRefreshToken(user.id, hashedRefreshToken);

    return { accessToken, refreshToken };
  }
}