import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { AssignStaffDto } from './dto/assign-staff.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('staff')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @ApiOperation({ summary: 'Assign or update a teacher duty in a class section' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('assign')
  assign(@Body() dto: AssignStaffDto) {
    return this.staffService.assign(dto);
  }

  @ApiOperation({ summary: 'Get all staff assignments for a class section' })
  @ApiQuery({ name: 'classId', type: String })
  @Get('by-class')
  findByClass(@Query('classId', ParseUUIDPipe) classId: string) {
    return this.staffService.findByClass(classId);
  }

  @ApiOperation({ summary: 'Get all class assignments for a teacher' })
  @ApiQuery({ name: 'userId', type: String })
  @Get('by-user')
  findByUser(@Query('userId', ParseUUIDPipe) userId: string) {
    return this.staffService.findByUser(userId);
  }

  @ApiOperation({ summary: 'Get a single assignment by ID' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffService.findById(id);
  }

  @ApiOperation({ summary: 'Remove a staff assignment' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffService.remove(id);
  }
}