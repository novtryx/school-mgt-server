import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FeesService } from './fees.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { UpdateDunningConfigDto } from './dto/update-dunning-config.dto';
import { PaymentStatus } from './entities/fee-invoice.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('fees')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fees')
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @ApiOperation({ summary: 'Create a fee invoice for a student' })
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Post('invoices')
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.feesService.createInvoice(dto);
  }

  @ApiOperation({
    summary: 'Record a payment against an invoice',
    description:
      'Accepts a percentageToPay (1–100). Recalculates balance, reclassifies status, ' +
      'generates a receipt number, and emails a confirmation to the parent.',
  })
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Post('payments')
  recordPayment(@Body() dto: RecordPaymentDto) {
    return this.feesService.recordPayment(dto);
  }

  @ApiOperation({
    summary: 'Get a printable HTML receipt for a payment',
    description:
      'Returns a full HTML page. Open in a browser tab and use Ctrl+P / Cmd+P to print.',
  })
  @ApiProduces('text/html')
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Get('payments/:id/receipt')
  async getReceipt(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const html = await this.feesService.getPaymentReceipt(id);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  @ApiOperation({ summary: 'Get cash flow dashboard metrics for a school' })
  @ApiQuery({ name: 'schoolId', type: String })
  @ApiQuery({ name: 'termLabel', type: String, required: false })
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Get('dashboard')
  getDashboard(
    @Query('schoolId', ParseUUIDPipe) schoolId: string,
    @Query('termLabel') termLabel?: string,
  ) {
    return this.feesService.getDashboardMetrics(schoolId, termLabel);
  }

  @ApiOperation({ summary: 'List invoices for a school with optional status filter' })
  @ApiQuery({ name: 'schoolId', type: String })
  @ApiQuery({ name: 'status', enum: PaymentStatus, required: false })
  @ApiQuery({ name: 'termLabel', type: String, required: false })
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Get('invoices')
  findInvoices(
    @Query('schoolId', ParseUUIDPipe) schoolId: string,
    @Query('status') status?: PaymentStatus,
    @Query('termLabel') termLabel?: string,
  ) {
    return this.feesService.findBySchool(schoolId, status, termLabel);
  }

  @ApiOperation({ summary: 'Get a single invoice by ID' })
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Get('invoices/:id')
  findInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.feesService.findInvoiceById(id);
  }

  @ApiOperation({ summary: 'Get payment history for an invoice' })
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Get('invoices/:id/payments')
  findPayments(@Param('id', ParseUUIDPipe) id: string) {
    return this.feesService.findPaymentsByInvoice(id);
  }

  @ApiOperation({ summary: 'Get dunning config for a school' })
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Get('dunning/:schoolId')
  getDunningConfig(@Param('schoolId', ParseUUIDPipe) schoolId: string) {
    return this.feesService.getDunningConfig(schoolId);
  }

  @ApiOperation({ summary: 'Update dunning reminder configuration' })
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Patch('dunning/:schoolId')
  updateDunningConfig(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Body() dto: UpdateDunningConfigDto,
  ) {
    return this.feesService.upsertDunningConfig(schoolId, dto);
  }
}