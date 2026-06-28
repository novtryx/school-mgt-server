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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { BulkImportStudentsDto } from './dto/bulk-import.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('students')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @ApiOperation({ summary: 'Create a single student record' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @ApiOperation({
    summary: 'Upload an Excel file and get a preview of parsed rows',
    description:
      'Returns parsed rows for admin review before confirming the import. Does not save to DB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('import/excel/preview')
  @UseInterceptors(FileInterceptor('file'))
    previewExcelImport(@UploadedFile() file: any) {

//   previewExcelImport(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.studentsService.parseExcelBuffer(file.buffer);
  }

  @ApiOperation({
    summary: 'Confirm and save a bulk student import',
    description:
      'Send the validated rows from the preview step to persist them in the database.',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('import/confirm')
  bulkImport(@Body() dto: BulkImportStudentsDto) {
    return this.studentsService.bulkImport(dto);
  }

  @ApiOperation({ summary: 'Get all students in a school, optionally filtered by class' })
  @ApiQuery({ name: 'schoolId', type: String })
  @ApiQuery({ name: 'classId', type: String, required: false })
  @Get()
  findAll(
    @Query('schoolId', ParseUUIDPipe) schoolId: string,
    @Query('classId') classId?: string,
  ) {
    return this.studentsService.findBySchool(schoolId, classId);
  }

  @ApiOperation({ summary: 'Get a student by ID' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.studentsService.findById(id);
  }

  @ApiOperation({ summary: 'Update a student record' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, dto);
  }

  @ApiOperation({ summary: 'Deactivate a student (soft delete)' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.studentsService.deactivate(id);
  }
}