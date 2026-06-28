import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, User } from './entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { SchoolsService } from '../schools/schools.service';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    private readonly schoolsService: SchoolsService,
  ) {}

  @ApiOperation({ summary: 'Invite a new staff member to the school' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('invite')
  async invite(@Body() dto: InviteUserDto) {
    const { user, rawToken } = await this.usersService.createInvitedUser(dto);
    const school = await this.schoolsService.findById(dto.schoolId);

    // Send invite email — non-blocking
    this.notificationsService
      .sendStaffInvite(
        user.email,
        user.firstName,
        school.name,
        user.role,
        rawToken,
      )
      .catch(() => null);

    return {
      message: `Invite sent to ${user.email}`,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        inviteStatus: user.inviteStatus,
      },
    };
  }

  @ApiOperation({ summary: 'Resend invite to a pending staff member' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post(':id/resend-invite')
  async resendInvite(@Param('id', ParseUUIDPipe) id: string) {
    const { user, rawToken } = await this.usersService.resendInvite(id);
    const school = await this.schoolsService.findById(user.schoolId!);

    this.notificationsService
      .sendStaffInvite(
        user.email,
        user.firstName,
        school.name,
        user.role,
        rawToken,
      )
      .catch(() => null);

    return { message: `Invite resent to ${user.email}` };
  }

  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @Get('me')
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @ApiOperation({ summary: 'Get all users in a school' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('school/:schoolId')
  findAllBySchool(@Param('schoolId', ParseUUIDPipe) schoolId: string) {
    return this.usersService.findAllBySchool(schoolId);
  }

  @ApiOperation({ summary: 'Get a user by ID' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @ApiOperation({ summary: 'Update own profile' })
  @Patch('me')
  updateMe(
    @CurrentUser() user: User,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(user.id, dto);
  }

  @ApiOperation({ summary: 'Update a user by ID (admin only)' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @ApiOperation({ summary: 'Deactivate a staff member' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.deactivate(id);
  }
}