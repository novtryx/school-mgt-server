import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, User } from './entities/user.entity';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @Get('me')
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @ApiOperation({ summary: 'Get all users in the school (admin only)' })
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
}