import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('schools')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @ApiOperation({ summary: 'Register a new school (super admin only)' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateSchoolDto) {
    return this.schoolsService.create(dto);
  }

  @ApiOperation({ summary: 'Get a school by ID' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.schoolsService.findById(id);
  }

  @ApiOperation({ summary: 'Update school profile' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSchoolDto,
  ) {
    return this.schoolsService.update(id, dto);
  }

  @ApiOperation({ summary: 'Upload school logo' })
  @ApiConsumes('multipart/form-data')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/logo')
  @UseInterceptors(FileInterceptor('logo'))
  uploadLogo(
    @Param('id', ParseUUIDPipe) id: string,
    // @UploadedFile() file: Express.Multer.File,
        @UploadedFile() file: any,

  ) {
    // In production, upload file to S3/GCS and return the URL.
    // Here we store the original name as a placeholder path.
    const logoUrl = `/uploads/${file.originalname}`;
    return this.schoolsService.updateLogo(id, logoUrl);
  }
}