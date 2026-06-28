import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GradingService } from './grading.service';
import { CreateGradingSchemeDto } from './dto/create-grading-scheme.dto';
import { UpdateGradingSchemeDto } from './dto/update-grading-scheme.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('grading')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('grading')
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}

  @ApiOperation({ summary: 'Create a grading scheme for a school' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateGradingSchemeDto) {
    return this.gradingService.create(dto);
  }

  @ApiOperation({ summary: 'Get all grading schemes for a school' })
  @Get()
  findBySchool(@Query('schoolId', ParseUUIDPipe) schoolId: string) {
    return this.gradingService.findBySchool(schoolId);
  }

  @ApiOperation({ summary: 'Get the active default grading bands for a school' })
  @Get('default')
  getDefault(@Query('schoolId', ParseUUIDPipe) schoolId: string) {
    return this.gradingService.getDefaultForSchool(schoolId);
  }

  @ApiOperation({ summary: 'Get a grading scheme by ID' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.gradingService.findById(id);
  }

  @ApiOperation({ summary: 'Update a grading scheme' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGradingSchemeDto,
  ) {
    return this.gradingService.update(id, dto);
  }

  @ApiOperation({ summary: 'Set a scheme as the school default' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @Patch(':id/set-default')
  setAsDefault(@Param('id', ParseUUIDPipe) id: string) {
    return this.gradingService.setAsDefault(id);
  }

  @ApiOperation({ summary: 'Delete a grading scheme (cannot delete the active default)' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.gradingService.remove(id);
  }
}