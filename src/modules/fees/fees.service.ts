import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { FeeTemplate } from './entities/fee-template.entity';
import { FeeInvoice, PaymentStatus } from './entities/fee-invoice.entity';
import { Payment, PaymentMethod } from './entities/payment.entity';
import { DunningConfig } from './entities/dunning-config.entity';
import { CreateFeeTemplateDto } from './dto/create-fee-template.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { UpdateDunningConfigDto } from './dto/update-dunning-config.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ReceiptService } from './receipt.service';
import { SchoolsService } from '../schools/schools.service';
import {
  ResourceNotFoundException,
  InvalidPaymentAmountException,
} from '../../common/exceptions/app.exceptions';

@Injectable()
export class FeesService {
  private readonly logger = new Logger(FeesService.name);

  constructor(
    @InjectRepository(FeeTemplate)
    private readonly templatesRepository: Repository<FeeTemplate>,
    @InjectRepository(FeeInvoice)
    private readonly invoicesRepository: Repository<FeeInvoice>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(DunningConfig)
    private readonly dunningConfigRepository: Repository<DunningConfig>,
    private readonly notificationsService: NotificationsService,
    private readonly receiptService: ReceiptService,
    private readonly schoolsService: SchoolsService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────────────────────────────────────────
  // FEE TEMPLATES
  // ─────────────────────────────────────────────────────────

  /**
   * Create a fee template for a class (or school-wide).
   * Total is auto-computed from the sum of line items.
   */
  async createTemplate(dto: CreateFeeTemplateDto): Promise<FeeTemplate> {
    const totalAmount = dto.lineItems.reduce((sum, item) => sum + item.amount, 0);

    const template = this.templatesRepository.create({
      schoolId:    dto.schoolId,
      classId:     dto.classId,
      termLabel:   dto.termLabel,
      lineItems:   dto.lineItems,
      totalAmount,
      description: dto.description,
    });

    return this.templatesRepository.save(template);
  }

  /**
   * Get all fee templates for a school.
   */
  async findTemplatesBySchool(schoolId: string): Promise<FeeTemplate[]> {
    return this.templatesRepository.find({
      where:    { schoolId, isActive: true },
      relations: { class: true },
      order:    { termLabel: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Update a fee template. Recomputes total from line items.
   */
  async updateTemplate(
    id: string,
    data: Partial<CreateFeeTemplateDto>,
  ): Promise<FeeTemplate> {
    const template = await this.templatesRepository.findOne({ where: { id } });
    if (!template) throw new ResourceNotFoundException('Fee template', id);

    if (data.lineItems) {
      data['totalAmount'] = data.lineItems.reduce((s, i) => s + i.amount, 0);
    }

    Object.assign(template, data);
    return this.templatesRepository.save(template);
  }

  /**
   * Bulk-generate invoices for all active students in a class (or school)
   * from a fee template. Safe to re-run — skips students who already have
   * an invoice for the same term.
   */
  async generateInvoicesFromTemplate(
    templateId: string,
  ): Promise<{ generated: number; skipped: number; emailsSent: number }> {
    const template = await this.templatesRepository.findOne({
      where: { id: templateId },
    });
    if (!template) throw new ResourceNotFoundException('Fee template', templateId);

    const appUrl = this.configService.get<string>('APP_URL') ?? '';

    // Get all active students for the class (or school) with parent details
    const students = await this.dataSource.query<{
      id: string;
      first_name: string;
      parent_email: string;
      parent_name: string;
    }[]>(
      template.classId
        ? `SELECT id, first_name, parent_email, parent_name FROM students WHERE class_id = $1 AND school_id = $2 AND is_active = true`
        : `SELECT id, first_name, parent_email, parent_name FROM students WHERE school_id = $1 AND is_active = true`,
      template.classId
        ? [template.classId, template.schoolId]
        : [template.schoolId],
    );

    let generated  = 0;
    let skipped    = 0;
    let emailsSent = 0;

    for (const student of students) {
      // Skip if invoice already exists for this student + term
      const existing = await this.invoicesRepository.findOne({
        where: {
          studentId: student.id,
          schoolId:  template.schoolId,
          termLabel: template.termLabel,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const portalToken = randomBytes(24).toString('hex');

      await this.invoicesRepository.save(
        this.invoicesRepository.create({
          studentId:     student.id,
          schoolId:      template.schoolId,
          templateId:    template.id,
          termLabel:     template.termLabel,
          totalAmount:   template.totalAmount,
          amountPaid:    0,
          balance:       template.totalAmount,
          paymentStatus: PaymentStatus.DEFAULTER,
          lineItems:     template.lineItems,
          portalToken,
        }),
      );

      generated++;

      // Send fee notification email to parent immediately
      if (student.parent_email) {
        const portalUrl = `${appUrl}/pay?token=${portalToken}`;
        try {
          await this.notificationsService.sendFeeReminderEmail(
            student.parent_email,
            student.parent_name ?? `Parent of ${student.first_name}`,
            student.first_name,
            template.totalAmount,
            template.termLabel,
            null,
            portalUrl,
          );
          emailsSent++;
          this.logger.log(`Invoice email sent to ${student.parent_email}`);
        } catch (err) {
          this.logger.error(`Failed to send invoice email to ${student.parent_email}: ${String(err)}`);
        }
      } else {
        this.logger.warn(`Student ${student.id} has no parent email — skipping notification`);
      }
    }

    return { generated, skipped, emailsSent };
  }

  // ─────────────────────────────────────────────────────────
  // INVOICES
  // ─────────────────────────────────────────────────────────

  /**
   * Create a single invoice manually (without a template).
   */
  async createInvoice(dto: CreateInvoiceDto): Promise<FeeInvoice> {
    const portalToken = randomBytes(24).toString('hex');
    const invoice = this.invoicesRepository.create({
      ...dto,
      balance:       dto.totalAmount,
      amountPaid:    0,
      paymentStatus: PaymentStatus.DEFAULTER,
      portalToken,
    });
    return this.invoicesRepository.save(invoice);
  }

  async findInvoiceById(id: string): Promise<FeeInvoice> {
    const invoice = await this.invoicesRepository.findOne({
      where:     { id },
      relations: { student: true, template: true },
    });
    if (!invoice) throw new ResourceNotFoundException('Fee invoice', id);
    return invoice;
  }

  /**
   * Get invoice by portal token — public endpoint, no auth required.
   */
  async findInvoiceByToken(token: string): Promise<FeeInvoice> {
    const invoice = await this.invoicesRepository.findOne({
      where:     { portalToken: token },
      relations: { student: true, template: { class: true } },
    });
    if (!invoice) throw new ResourceNotFoundException('Invoice', token);
    return invoice;
  }

  async findBySchool(
    schoolId: string,
    status?:    PaymentStatus,
    termLabel?: string,
  ): Promise<FeeInvoice[]> {
    const qb = this.invoicesRepository
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.student', 'student')
      .where('inv.school_id = :schoolId', { schoolId });

    if (status)    qb.andWhere('inv.payment_status = :status', { status });
    if (termLabel) qb.andWhere('inv.term_label = :termLabel', { termLabel });

    return qb.orderBy('student.last_name', 'ASC').getMany();
  }

  // ─────────────────────────────────────────────────────────
  // PAYMENTS — MANUAL
  // ─────────────────────────────────────────────────────────

  /**
   * Record a manual payment (cash / bank transfer / POS).
   * Accepts actual amount in school currency — not percentage.
   */
  async recordPayment(dto: RecordPaymentDto): Promise<{
    invoice:       FeeInvoice;
    payment:       Payment;
    receiptNumber: string;
  }> {
    const invoice = await this.invoicesRepository.findOne({
      where:     { id: dto.invoiceId },
      relations: { student: true },
    });
    if (!invoice) throw new ResourceNotFoundException('Fee invoice', dto.invoiceId);

    if (invoice.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('This invoice is already fully paid.');
    }

    const currentBalance = Number(invoice.balance);
    if (dto.amount > currentBalance) {
      throw new BadRequestException(
        `Amount ₦${dto.amount.toLocaleString()} exceeds outstanding balance of ₦${currentBalance.toLocaleString()}.`,
      );
    }
    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero.');
    }

    return this.processPayment({
      invoice,
      amount:                dto.amount,
      paymentMethod:         dto.paymentMethod,
      reference:             dto.reference,
      paystackTransactionId: undefined,
      recordedBy:            dto.recordedBy,
      note:                  dto.note,
    });
  }

  // ─────────────────────────────────────────────────────────
  // PAYMENTS — PAYSTACK
  // ─────────────────────────────────────────────────────────

  /**
   * Generate a fresh Paystack payment URL for an invoice.
   * Called by the public portal page when the parent clicks "Pay now".
   * Generates a new link every time — Paystack links expire after 1 hour
   * so we never store them, always generate fresh.
   */
  async generatePaystackLink(
    token:  string,
    amount: number,
  ): Promise<{ authorizationUrl: string; reference: string }> {
    const invoice = await this.findInvoiceByToken(token);

    if (invoice.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('This invoice is already fully paid.');
    }

    if (amount > Number(invoice.balance)) {
      throw new BadRequestException(
        `Amount exceeds outstanding balance of ₦${Number(invoice.balance).toLocaleString()}.`,
      );
    }

    const secretKey  = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    const appUrl     = this.configService.get<string>('APP_URL');        // frontend
    const backendUrl = this.configService.get<string>('BACKEND_URL') ?? // backend
      `http://localhost:${this.configService.get('PORT') ?? 5000}/api/v1`;

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email:        invoice.student.parentEmail,
        amount:       Math.round(amount * 100), // Paystack uses kobo
        currency:     'NGN',
        reference:    `RR-${invoice.id.slice(0, 8)}-${Date.now()}`,
        callback_url: `${backendUrl}/fees/paystack/webhook`,
        metadata: {
          invoiceId:    invoice.id,
          portalToken:  token,
          studentName:  `${invoice.student.firstName} ${invoice.student.lastName}`,
          termLabel:    invoice.termLabel,
          custom_fields: [
            { display_name: 'Student',  variable_name: 'student_name',  value: `${invoice.student.firstName} ${invoice.student.lastName}` },
            { display_name: 'Term',     variable_name: 'term_label',    value: invoice.termLabel },
          ],
        },
      },
      {
        headers: {
          Authorization:  `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return {
      authorizationUrl: response.data.data.authorization_url,
      reference:        response.data.data.reference,
    };
  }

  /**
   * Handle Paystack webhook — verify HMAC signature, find invoice,
   * record payment, update status. Called by POST /fees/paystack/webhook.
   */
  async handlePaystackWebhook(
    payload:   Record<string, any>,
    signature: string,
  ): Promise<void> {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY')!;

    // Verify the HMAC-SHA512 signature
    const { createHmac } = await import('crypto');
    const hash = createHmac('sha512', secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== signature) {
      this.logger.warn('Paystack webhook: invalid signature — ignoring');
      return;
    }

    if (payload.event !== 'charge.success') return;

    const data      = payload.data;
    const invoiceId = data?.metadata?.invoiceId;
    const amountNaira = data.amount / 100; // convert from kobo

    if (!invoiceId) {
      this.logger.warn('Paystack webhook: no invoiceId in metadata');
      return;
    }

    const invoice = await this.invoicesRepository.findOne({
      where:     { id: invoiceId },
      relations: { student: true },
    });

    if (!invoice) {
      this.logger.warn(`Paystack webhook: invoice ${invoiceId} not found`);
      return;
    }

    // Idempotency — don't process the same transaction twice
    const alreadyProcessed = await this.paymentsRepository.findOne({
      where: { paystackTransactionId: String(data.id) },
    });
    if (alreadyProcessed) {
      this.logger.log(`Paystack webhook: transaction ${data.id} already processed`);
      return;
    }

    await this.processPayment({
      invoice,
      amount:                amountNaira,
      paymentMethod:         PaymentMethod.PAYSTACK,
      reference:             data.reference,
      paystackTransactionId: String(data.id),
      recordedBy:            'paystack',
      note:                  undefined,
    });

    this.logger.log(
      `Paystack webhook: recorded ₦${amountNaira} for invoice ${invoiceId}`,
    );
  }

  // ─────────────────────────────────────────────────────────
  // SHARED PAYMENT PROCESSOR
  // ─────────────────────────────────────────────────────────

  /**
   * Core payment processing — shared by manual and Paystack paths.
   * Updates invoice balance, creates payment record, emails receipt.
   */
  private async processPayment(args: {
    invoice:               FeeInvoice;
    amount:                number;
    paymentMethod:         PaymentMethod;
    reference?:            string;
    paystackTransactionId?: string;
    recordedBy?:           string;
    note?:                 string;
  }): Promise<{ invoice: FeeInvoice; payment: Payment; receiptNumber: string }> {
    const { invoice, amount, paymentMethod, reference, paystackTransactionId, recordedBy, note } = args;

    const newAmountPaid = Number(invoice.amountPaid) + amount;
    const newBalance    = Math.max(0, Number(invoice.totalAmount) - newAmountPaid);

    let paymentStatus: PaymentStatus;
    if (newBalance === 0) {
      paymentStatus = PaymentStatus.PAID;
    } else if (newAmountPaid > 0) {
      paymentStatus = PaymentStatus.PARTIALLY_PAID;
    } else {
      paymentStatus = PaymentStatus.DEFAULTER;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const receiptNumber = await this.generateReceiptNumber(invoice.schoolId);

      const payment = this.paymentsRepository.create({
        receiptNumber,
        invoiceId:             invoice.id,
        amount,
        balanceAfter:          newBalance,
        paymentMethod,
        reference,
        paystackTransactionId,
        recordedBy,
        note,
      });
      const savedPayment = await queryRunner.manager.save(Payment, payment);

      invoice.amountPaid     = newAmountPaid;
      invoice.balance        = newBalance;
      invoice.paymentStatus  = paymentStatus;
      const savedInvoice = await queryRunner.manager.save(FeeInvoice, invoice);

      await queryRunner.commitTransaction();

      this.sendPaymentConfirmationEmail(savedPayment, savedInvoice).catch(() => null);

      return { invoice: savedInvoice, payment: savedPayment, receiptNumber };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ─────────────────────────────────────────────────────────
  // RECEIPTS & DASHBOARD
  // ─────────────────────────────────────────────────────────

  async getPaymentReceipt(paymentId: string): Promise<string> {
    const payment = await this.paymentsRepository.findOne({
      where:     { id: paymentId },
      relations: { invoice: { student: true } },
    });
    if (!payment) throw new ResourceNotFoundException('Payment', paymentId);

    const school = await this.schoolsService.findById(payment.invoice.schoolId);
    return this.receiptService.generateHtml({ payment, invoice: payment.invoice, school });
  }

  async getDashboardMetrics(
    schoolId:   string,
    termLabel?: string,
  ) {
    const qb = this.invoicesRepository
      .createQueryBuilder('inv')
      .where('inv.school_id = :schoolId', { schoolId });

    if (termLabel) qb.andWhere('inv.term_label = :termLabel', { termLabel });

    const invoices = await qb.getMany();

    const totalExpected = invoices.reduce((s, i) => s + Number(i.totalAmount), 0);
    const totalSecured  = invoices.reduce((s, i) => s + Number(i.amountPaid),  0);

    return {
      totalExpected,
      totalSecured,
      totalDebt:       totalExpected - totalSecured,
      paidCount:       invoices.filter((i) => i.paymentStatus === PaymentStatus.PAID).length,
      partialCount:    invoices.filter((i) => i.paymentStatus === PaymentStatus.PARTIALLY_PAID).length,
      defaulterCount:  invoices.filter((i) => i.paymentStatus === PaymentStatus.DEFAULTER).length,
    };
  }

  async findPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { invoiceId },
      order: { createdAt: 'ASC' },
    });
  }

  // ─────────────────────────────────────────────────────────
  // DUNNING
  // ─────────────────────────────────────────────────────────

  async upsertDunningConfig(schoolId: string, dto: UpdateDunningConfigDto): Promise<DunningConfig> {
    let config = await this.dunningConfigRepository.findOne({ where: { schoolId } });
    if (!config) {
      config = this.dunningConfigRepository.create({ schoolId, ...dto });
    } else {
      Object.assign(config, dto);
    }
    return this.dunningConfigRepository.save(config);
  }

  async getDunningConfig(schoolId: string): Promise<DunningConfig | null> {
    return this.dunningConfigRepository.findOne({ where: { schoolId } });
  }

  /**
   * Manually trigger fee reminders for all defaulters and partially paid
   * in a school. Called by the bursar from the dashboard.
   */
  async sendFeeReminders(schoolId: string): Promise<{ sent: number; failed: number; errors: string[] }> {
    const config = await this.dunningConfigRepository.findOne({ where: { schoolId } });
    const appUrl = this.configService.get<string>('APP_URL') ?? '';

    this.logger.log(`Fee reminders: starting for school ${schoolId}`);

    const nonPaidInvoices = await this.invoicesRepository.find({
      where: [
        { schoolId, paymentStatus: PaymentStatus.DEFAULTER      },
        { schoolId, paymentStatus: PaymentStatus.PARTIALLY_PAID },
      ],
      relations: { student: true },
    });

    this.logger.log(`Fee reminders: found ${nonPaidInvoices.length} unpaid invoices`);

    let sent   = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const invoice of nonPaidInvoices) {
      // Ensure invoice has a portal token — generate one if missing
      if (!invoice.portalToken) {
        const { randomBytes } = await import('crypto');
        invoice.portalToken = randomBytes(24).toString('hex');
        await this.invoicesRepository.save(invoice);
        this.logger.log(`Fee reminders: generated missing portalToken for invoice ${invoice.id}`);
      }

      const portalUrl = `${appUrl}/pay?token=${invoice.portalToken}`;
      const parentEmail = invoice.student?.parentEmail;

      if (!parentEmail) {
        const msg = `Invoice ${invoice.id} — student has no parent email`;
        this.logger.warn(`Fee reminders: skipping — ${msg}`);
        errors.push(msg);
        failed++;
        continue;
      }

      this.logger.log(`Fee reminders: sending to ${parentEmail} for student ${invoice.student.firstName}`);

      try {
        await this.notificationsService.sendFeeReminderEmail(
          parentEmail,
          invoice.student.parentName ?? `Parent of ${invoice.student.firstName}`,
          invoice.student.firstName,
          Number(invoice.balance),
          invoice.termLabel,
          config?.emailTemplate,
          portalUrl,
        );
        sent++;
        this.logger.log(`Fee reminders: ✓ sent to ${parentEmail}`);
      } catch (err) {
        failed++;
        const msg = `Failed to send to ${parentEmail}: ${String(err)}`;
        this.logger.error(`Fee reminders: ✗ ${msg}`);
        errors.push(msg);
      }
    }

    this.logger.log(`Fee reminders: done — ${sent} sent, ${failed} failed`);
    return { sent, failed, errors };
  }

  // ─────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────

  private async sendPaymentConfirmationEmail(payment: Payment, invoice: FeeInvoice): Promise<void> {
    const student = invoice.student;
    await this.notificationsService.sendPaymentConfirmation(
      student.parentEmail,
      student.parentName ?? `Parent of ${student.firstName}`,
      student.firstName,
      {
        receiptNumber: payment.receiptNumber,
        amountPaid:    Number(payment.amount),
        balanceAfter:  Number(payment.balanceAfter),
        termLabel:     invoice.termLabel,
        paymentMethod: payment.paymentMethod,
        paymentDate:   payment.createdAt,
        totalAmount:   Number(invoice.totalAmount),
        paymentStatus: invoice.paymentStatus,
      },
    );
  }

  private async generateReceiptNumber(schoolId: string): Promise<string> {
    const count = await this.paymentsRepository
      .createQueryBuilder('p')
      .innerJoin('p.invoice', 'inv')
      .where('inv.school_id = :schoolId', { schoolId })
      .getCount();

    const year     = new Date().getFullYear();
    const sequence = String(count + 1).padStart(6, '0');
    return `RCP-${year}-${sequence}`;
  }
}