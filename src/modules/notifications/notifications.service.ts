import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Report } from '../reports/entities/report.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly appUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });

    this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
  }

  /**
   * Send an email verification link to a newly registered user.
   */
  async sendEmailVerification(
    email: string,
    firstName: string,
    token: string,
  ): Promise<void> {
    const verifyUrl = `${this.appUrl}/api/v1/auth/verify-email/${token}`;

    await this.send({
      to: email,
      subject: 'Verify your ReportRun email address',
      html: `
        <p>Hi ${firstName},</p>
        <p>Thank you for registering with ReportRun. Please verify your email address by clicking the link below:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>This link expires in 24 hours.</p>
        <p>If you did not create an account, you can ignore this email.</p>
      `,
    });
  }

  /**
   * Send a password reset link. The raw token (not hashed) is embedded in the URL.
   */
  async sendPasswordReset(
    email: string,
    firstName: string,
    token: string,
  ): Promise<void> {
    const resetUrl = `${this.appUrl}/reset-password?token=${token}`;

    await this.send({
      to: email,
      subject: 'Reset your ReportRun password',
      html: `
        <p>Hi ${firstName},</p>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in 15 minutes.</p>
        <p>If you did not request this, you can safely ignore this email. Your password will not change.</p>
      `,
    });
  }

  /**
   * Send a fee payment reminder email to a parent.
   */
  async sendFeeReminderEmail(
    parentEmail: string,
    parentName: string,
    studentFirstName: string,
    balanceDue: number,
    termLabel: string,
    customTemplate?: string | null,
  ): Promise<void> {
    const formattedBalance = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(balanceDue);

    const defaultBody = `
      <p>Dear ${parentName},</p>
      <p>
        This is a reminder that an outstanding fee balance of
        <strong>${formattedBalance}</strong> remains on
        <strong>${studentFirstName}'s</strong> account for the
        <strong>${termLabel}</strong> term.
      </p>
      <p>Please log in to the school portal to make a payment at your earliest convenience.</p>
      <p>Thank you.</p>
    `;

    const body = customTemplate
      ? customTemplate
          .replace('{{parentName}}', parentName)
          .replace('{{studentName}}', studentFirstName)
          .replace('{{balance}}', formattedBalance)
          .replace('{{term}}', termLabel)
      : defaultBody;

    await this.send({
      to: parentEmail,
      subject: `Fee Reminder: ${termLabel} — ${studentFirstName}`,
      html: body,
    });
  }

  /**
   * Send a payment confirmation email to a parent after the bursar records a payment.
   */
  async sendPaymentConfirmation(
    parentEmail: string,
    parentName: string,
    studentFirstName: string,
    details: {
      receiptNumber: string;
      amountPaid: number;
      balanceAfter: number;
      termLabel: string;
      paymentMethod?: string;
      paymentDate: Date;
      totalAmount: number;
      paymentStatus: string;
    },
  ): Promise<void> {
    const fmt = (n: number) =>
      new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n);

    const statusLabel =
      details.paymentStatus === 'paid'
        ? 'Fully Paid'
        : details.paymentStatus === 'partially_paid'
        ? 'Partially Paid'
        : 'Outstanding';

    await this.send({
      to: parentEmail,
      subject: `Payment Received — ${details.receiptNumber} — ${studentFirstName}`,
      html: `
        <p>Dear ${parentName},</p>
        <p>We have received a payment for <strong>${studentFirstName}'s</strong> account. Details are below:</p>
        <table style="border-collapse:collapse;width:100%;max-width:480px;margin:16px 0;">
          <tr style="background:#f5f5f5;">
            <td style="padding:8px 12px;font-weight:bold;">Receipt Number</td>
            <td style="padding:8px 12px;">${details.receiptNumber}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;">Term</td>
            <td style="padding:8px 12px;">${details.termLabel}</td>
          </tr>
          <tr style="background:#f5f5f5;">
            <td style="padding:8px 12px;font-weight:bold;">Payment Date</td>
            <td style="padding:8px 12px;">${new Date(details.paymentDate).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;">Payment Method</td>
            <td style="padding:8px 12px;">${details.paymentMethod ?? '—'}</td>
          </tr>
          <tr style="background:#f5f5f5;">
            <td style="padding:8px 12px;font-weight:bold;">Amount Paid</td>
            <td style="padding:8px 12px;color:#166534;font-weight:bold;">${fmt(details.amountPaid)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;">Total Fee</td>
            <td style="padding:8px 12px;">${fmt(details.totalAmount)}</td>
          </tr>
          <tr style="background:#f5f5f5;">
            <td style="padding:8px 12px;font-weight:bold;">Outstanding Balance</td>
            <td style="padding:8px 12px;color:${details.balanceAfter > 0 ? '#b91c1c' : '#166534'};font-weight:bold;">${fmt(details.balanceAfter)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;">Account Status</td>
            <td style="padding:8px 12px;">${statusLabel}</td>
          </tr>
        </table>
        ${details.balanceAfter > 0 ? `<p>A balance of <strong>${fmt(details.balanceAfter)}</strong> remains. Please clear this before the end of term.</p>` : '<p>The account is fully cleared. Thank you!</p>'}
        <p style="margin-top:16px;font-size:12px;color:#888;">Please retain your receipt number <strong>${details.receiptNumber}</strong> for your records.</p>
      `,
    });
  }

  /**
   * Send a report card notification email to a parent.
   */
  async sendReportCardEmail(
    parentEmail: string,
    parentName: string,
    studentFirstName: string,
    report: Report,
  ): Promise<void> {
    await this.send({
      to: parentEmail,
      subject: `${studentFirstName}'s Report Card — ${report.term} ${report.academicYear}`,
      html: `
        <p>Dear ${parentName},</p>
        <p>The term report for <strong>${studentFirstName}</strong> has been published.</p>
        <ul>
          <li>Term: <strong>${report.term}</strong></li>
          <li>Academic Year: <strong>${report.academicYear}</strong></li>
          <li>Average Score: <strong>${report.average}</strong></li>
          <li>Class Position: <strong>${report.position ?? 'N/A'}</strong></li>
        </ul>
        ${report.teacherComment ? `<p>Teacher's Comment: <em>${report.teacherComment}</em></p>` : ''}
        <p>Please log in to the school portal to view and download the full report card.</p>
      `,
    });
  }

  /**
   * Internal send helper — logs errors without throwing so callers are not blocked.
   */
  private async send(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM'),
        ...options,
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}: ${String(err)}`);
    }
  }
}