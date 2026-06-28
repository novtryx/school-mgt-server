import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FeeInvoice, PaymentStatus } from './entities/fee-invoice.entity';
import { Payment } from './entities/payment.entity';
import { DunningConfig } from './entities/dunning-config.entity';
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
    @InjectRepository(FeeInvoice)
    private readonly invoicesRepository: Repository<FeeInvoice>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(DunningConfig)
    private readonly dunningConfigRepository: Repository<DunningConfig>,
    private readonly notificationsService: NotificationsService,
    private readonly receiptService: ReceiptService,
    private readonly schoolsService: SchoolsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new fee invoice for a student. Balance starts at totalAmount.
   */
  async createInvoice(dto: CreateInvoiceDto): Promise<FeeInvoice> {
    const invoice = this.invoicesRepository.create({
      ...dto,
      balance: dto.totalAmount,
      amountPaid: 0,
      paymentStatus: PaymentStatus.DEFAULTER,
    });
    return this.invoicesRepository.save(invoice);
  }

  /**
   * Record a payment against an invoice.
   * Generates a unique receipt number, recalculates the balance,
   * reclassifies the payment status, then emails a confirmation to the parent.
   */
  async recordPayment(dto: RecordPaymentDto): Promise<{ invoice: FeeInvoice; payment: Payment; receiptNumber: string }> {
    const invoice = await this.invoicesRepository.findOne({
      where: { id: dto.invoiceId },
      relations: { student: true },
    });
    if (!invoice) {
      throw new ResourceNotFoundException('Fee invoice', dto.invoiceId);
    }

    if (invoice.paymentStatus === PaymentStatus.PAID) {
      throw new InvalidPaymentAmountException();
    }

    const paymentAmount = (dto.percentageToPay / 100) * Number(invoice.totalAmount);

    if (Number(invoice.amountPaid) + paymentAmount > Number(invoice.totalAmount)) {
      throw new InvalidPaymentAmountException();
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generate unique sequential receipt number
      const receiptNumber = await this.generateReceiptNumber(invoice.schoolId);

      // Recalculate invoice totals
      const newAmountPaid = Number(invoice.amountPaid) + paymentAmount;
      const newBalance = Number(invoice.totalAmount) - newAmountPaid;
      const pctPaid = (newAmountPaid / Number(invoice.totalAmount)) * 100;

      let paymentStatus: PaymentStatus;
      if (pctPaid >= 100) {
        paymentStatus = PaymentStatus.PAID;
      } else if (pctPaid > 0) {
        paymentStatus = PaymentStatus.PARTIALLY_PAID;
      } else {
        paymentStatus = PaymentStatus.DEFAULTER;
      }

      // Save the payment record
      const payment = this.paymentsRepository.create({
        receiptNumber,
        invoiceId: invoice.id,
        amount: paymentAmount,
        percentagePaid: dto.percentageToPay,
        balanceAfter: newBalance,
        paymentMethod: dto.paymentMethod,
        reference: dto.reference,
        recordedBy: dto.recordedBy,
        note: dto.note,
      });
      const savedPayment = await queryRunner.manager.save(Payment, payment);

      // Update the invoice
      invoice.amountPaid = newAmountPaid;
      invoice.balance = newBalance;
      invoice.paymentStatus = paymentStatus;
      const savedInvoice = await queryRunner.manager.save(FeeInvoice, invoice);

      await queryRunner.commitTransaction();

      // Send payment confirmation email to parent — non-blocking
      this.sendPaymentConfirmationEmail(savedPayment, savedInvoice).catch(() => null);

      return {
        invoice: savedInvoice,
        payment: savedPayment,
        receiptNumber,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get the printable HTML receipt for a payment.
   * Returns a full HTML string ready for the browser print dialog.
   */
  async getPaymentReceipt(paymentId: string): Promise<string> {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
      relations: { invoice: { student: true } },
    });

    if (!payment) {
      throw new ResourceNotFoundException('Payment', paymentId);
    }

    const school = await this.schoolsService.findById(payment.invoice.schoolId);

    return this.receiptService.generateHtml({
      payment,
      invoice: payment.invoice,
      school,
    });
  }

  /**
   * Get the cash flow summary dashboard metrics for a school.
   */
  async getDashboardMetrics(
    schoolId: string,
    termLabel?: string,
  ): Promise<{
    totalExpected: number;
    totalSecured: number;
    totalDebt: number;
    paidCount: number;
    partialCount: number;
    defaulterCount: number;
  }> {
    const qb = this.invoicesRepository
      .createQueryBuilder('inv')
      .where('inv.school_id = :schoolId', { schoolId });

    if (termLabel) {
      qb.andWhere('inv.term_label = :termLabel', { termLabel });
    }

    const invoices = await qb.getMany();

    const totalExpected = invoices.reduce((s, i) => s + Number(i.totalAmount), 0);
    const totalSecured = invoices.reduce((s, i) => s + Number(i.amountPaid), 0);
    const totalDebt = totalExpected - totalSecured;

    return {
      totalExpected,
      totalSecured,
      totalDebt,
      paidCount: invoices.filter((i) => i.paymentStatus === PaymentStatus.PAID).length,
      partialCount: invoices.filter((i) => i.paymentStatus === PaymentStatus.PARTIALLY_PAID).length,
      defaulterCount: invoices.filter((i) => i.paymentStatus === PaymentStatus.DEFAULTER).length,
    };
  }

  /**
   * List invoices for a school, optionally filtered by payment status and term.
   */
  async findBySchool(
    schoolId: string,
    status?: PaymentStatus,
    termLabel?: string,
  ): Promise<FeeInvoice[]> {
    const qb = this.invoicesRepository
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.student', 'student')
      .where('inv.school_id = :schoolId', { schoolId });

    if (status) qb.andWhere('inv.payment_status = :status', { status });
    if (termLabel) qb.andWhere('inv.term_label = :termLabel', { termLabel });

    return qb.orderBy('student.last_name', 'ASC').getMany();
  }

  /**
   * Get a single invoice by UUID.
   */
  async findInvoiceById(id: string): Promise<FeeInvoice> {
    const invoice = await this.invoicesRepository.findOne({
      where: { id },
      relations: { student: true },
    });
    if (!invoice) {
      throw new ResourceNotFoundException('Fee invoice', id);
    }
    return invoice;
  }

  /**
   * Get full payment history for a specific invoice.
   */
  async findPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { invoiceId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Upsert the dunning email configuration for a school.
   */
  async upsertDunningConfig(
    schoolId: string,
    dto: UpdateDunningConfigDto,
  ): Promise<DunningConfig> {
    let config = await this.dunningConfigRepository.findOne({ where: { schoolId } });

    if (!config) {
      config = this.dunningConfigRepository.create({ schoolId, ...dto });
    } else {
      Object.assign(config, dto);
    }

    return this.dunningConfigRepository.save(config);
  }

  /**
   * Get the dunning config for a school.
   */
  async getDunningConfig(schoolId: string): Promise<DunningConfig | null> {
    return this.dunningConfigRepository.findOne({ where: { schoolId } });
  }

  /**
   * Daily dunning job — runs at 08:00 every morning.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async runDunningEngine(): Promise<void> {
    this.logger.log('Dunning engine: starting daily run');

    const activeConfigs = await this.dunningConfigRepository.find({
      where: { enabled: true },
    });

    for (const config of activeConfigs) {
      try {
        const nonPaidInvoices = await this.invoicesRepository.find({
          where: [
            { schoolId: config.schoolId, paymentStatus: PaymentStatus.DEFAULTER },
            { schoolId: config.schoolId, paymentStatus: PaymentStatus.PARTIALLY_PAID },
          ],
          relations: { student: true },
        });

        for (const invoice of nonPaidInvoices) {
          await this.notificationsService.sendFeeReminderEmail(
            invoice.student.parentEmail,
            invoice.student.parentName ?? `Parent of ${invoice.student.firstName}`,
            invoice.student.firstName,
            Number(invoice.balance),
            invoice.termLabel,
            config.emailTemplate,
          );
        }

        this.logger.log(
          `Dunning engine: sent ${nonPaidInvoices.length} reminders for school ${config.schoolId}`,
        );
      } catch (err) {
        this.logger.error(
          `Dunning engine: failed for school ${config.schoolId}`,
          err,
        );
      }
    }
  }

  /**
   * Send a payment confirmation email to the parent with amount paid and remaining balance.
   */
  private async sendPaymentConfirmationEmail(
    payment: Payment,
    invoice: FeeInvoice,
  ): Promise<void> {
    const student = invoice.student;
    await this.notificationsService.sendPaymentConfirmation(
      student.parentEmail,
      student.parentName ?? `Parent of ${student.firstName}`,
      student.firstName,
      {
        receiptNumber: payment.receiptNumber,
        amountPaid: Number(payment.amount),
        balanceAfter: Number(payment.balanceAfter),
        termLabel: invoice.termLabel,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.createdAt,
        totalAmount: Number(invoice.totalAmount),
        paymentStatus: invoice.paymentStatus,
      },
    );
  }

  /**
   * Generate a unique receipt number in the format RCP-YYYY-XXXXXX.
   * Uses a count of existing payments for the school to keep it sequential.
   */
  private async generateReceiptNumber(schoolId: string): Promise<string> {
    const count = await this.paymentsRepository
      .createQueryBuilder('p')
      .innerJoin('p.invoice', 'inv')
      .where('inv.school_id = :schoolId', { schoolId })
      .getCount();

    const year = new Date().getFullYear();
    const sequence = String(count + 1).padStart(6, '0');
    return `RCP-${year}-${sequence}`;
  }
}