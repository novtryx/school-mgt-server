import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
  Headers,
  HttpCode,
  ParseUUIDPipe,
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
import { CreateFeeTemplateDto } from './dto/create-fee-template.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { UpdateDunningConfigDto } from './dto/update-dunning-config.dto';
import { PaymentStatus } from './entities/fee-invoice.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class InitiateOnlinePaymentDto {
  @ApiProperty({ example: 50000, description: 'Amount to pay in Naira' })
  @IsNumber()
  @Min(1)
  amount!: number;
}

@ApiTags('fees')
@Controller('fees')
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  // ── Fee Templates (auth required) ──────────────────────────

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Create a fee template for a class or school' })
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Post('templates')
  createTemplate(@Body() dto: CreateFeeTemplateDto) {
    return this.feesService.createTemplate(dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'List all fee templates for a school' })
  @ApiQuery({ name: 'schoolId', type: String })
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Get('templates')
  findTemplates(@Query('schoolId') schoolId: string) {
    return this.feesService.findTemplatesBySchool(schoolId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Bulk-generate invoices for all students from a template',
    description: 'Safe to re-run — skips students who already have an invoice for the term.',
  })
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Post('templates/:id/generate-invoices')
  generateInvoices(@Param('id') id: string) {
    return this.feesService.generateInvoicesFromTemplate(id);
  }

  // ── Invoices (auth required) ────────────────────────────────

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Create a single invoice manually (without template)' })
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Post('invoices')
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.feesService.createInvoice(dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'List invoices for a school with optional filters' })
  @ApiQuery({ name: 'schoolId', type: String })
  @ApiQuery({ name: 'status',   enum: PaymentStatus, required: false })
  @ApiQuery({ name: 'termLabel',type: String,         required: false })
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Get('invoices')
  findInvoices(
    @Query('schoolId') schoolId: string,
    @Query('status')   status?:   PaymentStatus,
    @Query('termLabel')termLabel?: string,
  ) {
    return this.feesService.findBySchool(schoolId, status, termLabel);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get a single invoice by ID' })
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Get('invoices/:id')
  findInvoice(@Param('id') id: string) {
    return this.feesService.findInvoiceById(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get payment history for an invoice' })
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Get('invoices/:id/payments')
  findPayments(@Param('id') id: string) {
    return this.feesService.findPaymentsByInvoice(id);
  }

  // ── Manual payments (auth required) ────────────────────────

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Record a manual payment (cash / bank transfer / POS)',
    description: 'Accepts actual amount in Naira — not a percentage.',
  })
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Post('payments')
  recordPayment(@Body() dto: RecordPaymentDto) {
    return this.feesService.recordPayment(dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get a printable HTML receipt for a payment' })
  @ApiProduces('text/html')
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Get('payments/:id/receipt')
  async getReceipt(@Param('id') id: string, @Res() res: Response) {
    const html = await this.feesService.getPaymentReceipt(id);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  // ── Dashboard (auth required) ───────────────────────────────

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get cash flow dashboard metrics for a school' })
  @ApiQuery({ name: 'schoolId',  type: String })
  @ApiQuery({ name: 'termLabel', type: String, required: false })
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Get('dashboard')
  getDashboard(
    @Query('schoolId')  schoolId: string,
    @Query('termLabel') termLabel?: string,
  ) {
    return this.feesService.getDashboardMetrics(schoolId, termLabel);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Send fee reminder emails to all defaulters and partially paid',
    description:
      'Manually triggered by the bursar. Sends an email with a payment portal ' +
      'link to every parent with an outstanding balance for the school.',
  })
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Post('reminders/:schoolId')
  sendReminders(@Param('schoolId') schoolId: string) {
    return this.feesService.sendFeeReminders(schoolId);
  }

  // ── Dunning (auth required) ─────────────────────────────────

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Get('dunning/:schoolId')
  getDunningConfig(@Param('schoolId') schoolId: string) {
    return this.feesService.getDunningConfig(schoolId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.SUPER_ADMIN)
  @Patch('dunning/:schoolId')
  updateDunningConfig(
    @Param('schoolId') schoolId: string,
    @Body() dto: UpdateDunningConfigDto,
  ) {
    return this.feesService.upsertDunningConfig(schoolId, dto);
  }

  // ── Public portal (NO AUTH) ─────────────────────────────────

  @ApiOperation({
    summary: 'Get invoice details for the public payment portal',
    description:
      'No authentication required. Token is sent in the parent email. ' +
      'Returns student name, class, term, total, paid, and balance.',
  })
  @Get('portal/:token')
  getPortalInvoice(@Param('token') token: string) {
    return this.feesService.findInvoiceByToken(token);
  }

  @ApiOperation({
    summary: 'Generate a fresh Paystack payment link for the portal',
    description:
      'Called when the parent clicks "Pay now" on the portal page. ' +
      'Generates a fresh link valid for 1 hour — never stored.',
  })
  @Post('portal/:token/pay')
  initiateOnlinePayment(
    @Param('token') token: string,
    @Body() dto: InitiateOnlinePaymentDto,
  ) {
    return this.feesService.generatePaystackLink(token, dto.amount);
  }

  @ApiOperation({
    summary: 'Paystack webhook receiver',
    description: 'Verifies HMAC-SHA512 signature and processes charge.success events.',
  })
  @HttpCode(200)
  @Post('paystack/webhook')
  async handleWebhook(
    @Body()    body:      Record<string, any>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    await this.feesService.handlePaystackWebhook(body, signature);
    return { received: true };
  }
}