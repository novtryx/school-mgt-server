import { Injectable } from '@nestjs/common';
import { Payment } from './entities/payment.entity';
import { FeeInvoice } from './entities/fee-invoice.entity';
import { School } from '../schools/entities/school.entity';

export interface ReceiptData {
  payment: Payment;
  invoice: FeeInvoice;
  school: School;
}

@Injectable()
export class ReceiptService {
  /**
   * Generate a printable HTML receipt for a payment.
   * Returns a full HTML string the frontend can open in a new tab or pass to the printer.
   */
  generateHtml(data: ReceiptData): string {
    const { payment, invoice, school } = data;
    const student = invoice.student;

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: school.currencyCode || 'NGN',
      }).format(amount);

    const formatDate = (date: Date | string) =>
      new Date(date).toLocaleDateString('en-NG', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

    const pctPaid = (
      (Number(invoice.amountPaid) / Number(invoice.totalAmount)) *
      100
    ).toFixed(1);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Receipt — ${payment.receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; }
    .page { max-width: 680px; margin: 40px auto; padding: 40px; border: 1px solid #ddd; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .school-name { font-size: 20px; font-weight: bold; }
    .school-meta { font-size: 12px; color: #555; margin-top: 4px; }
    .receipt-label { text-align: right; }
    .receipt-label h2 { font-size: 22px; color: #1a1a1a; }
    .receipt-label .number { font-size: 13px; color: #555; margin-top: 4px; }
    .divider { border: none; border-top: 2px solid #111; margin: 16px 0; }
    .divider-light { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
    .section-title { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.8px; margin-bottom: 10px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 24px; }
    .info-item label { font-size: 11px; color: #888; display: block; }
    .info-item span { font-size: 13px; font-weight: 500; }
    .amount-box { background: #f5f5f5; padding: 20px 24px; border-radius: 4px; margin: 24px 0; }
    .amount-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .amount-row.total { font-weight: bold; font-size: 15px; border-top: 1px solid #ccc; margin-top: 8px; padding-top: 12px; }
    .amount-row.paid { color: #1a7a3c; font-weight: bold; }
    .amount-row.balance { color: ${Number(invoice.balance) > 0 ? '#b91c1c' : '#1a7a3c'}; font-weight: bold; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;
      background: ${invoice.paymentStatus === 'paid' ? '#dcfce7' : invoice.paymentStatus === 'partially_paid' ? '#fef9c3' : '#fee2e2'};
      color: ${invoice.paymentStatus === 'paid' ? '#166534' : invoice.paymentStatus === 'partially_paid' ? '#854d0e' : '#991b1b'};
    }
    .footer { margin-top: 40px; font-size: 11px; color: #888; text-align: center; }
    .signature-row { display: flex; justify-content: space-between; margin-top: 48px; }
    .signature-block { text-align: center; width: 200px; }
    .signature-line { border-top: 1px solid #333; padding-top: 6px; font-size: 11px; color: #555; }
    @media print {
      body { background: white; }
      .page { border: none; margin: 0; padding: 20px; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="header">
    <div>
      ${school.logoUrl ? `<img src="${school.logoUrl}" alt="Logo" style="height:48px;margin-bottom:8px;display:block;" />` : ''}
      <div class="school-name">${school.name}</div>
      <div class="school-meta">${school.address ?? ''}</div>
      <div class="school-meta">${school.phone ?? ''}</div>
    </div>
    <div class="receipt-label">
      <h2>RECEIPT</h2>
      <div class="number">${payment.receiptNumber}</div>
      <div class="number" style="margin-top:8px;">${formatDate(payment.createdAt)}</div>
    </div>
  </div>

  <hr class="divider" />

  <p class="section-title">Student Information</p>
  <div class="info-grid">
    <div class="info-item">
      <label>Student Name</label>
      <span>${student.firstName} ${student.lastName}</span>
    </div>
    <div class="info-item">
      <label>Admission Number</label>
      <span>${student.admissionNumber ?? '—'}</span>
    </div>
    <div class="info-item">
      <label>Parent / Guardian</label>
      <span>${student.parentName ?? '—'}</span>
    </div>
    <div class="info-item">
      <label>Parent Phone</label>
      <span>${student.parentPhone}</span>
    </div>
  </div>

  <hr class="divider-light" />

  <p class="section-title">Invoice Details</p>
  <div class="info-grid">
    <div class="info-item">
      <label>Term</label>
      <span>${invoice.termLabel}</span>
    </div>
    <div class="info-item">
      <label>Payment Method</label>
      <span>${payment.paymentMethod ?? '—'}</span>
    </div>
    <div class="info-item">
      <label>Reference</label>
      <span>${payment.reference ?? '—'}</span>
    </div>
    <div class="info-item">
      <label>Account Status</label>
      <span class="status-badge">${invoice.paymentStatus.replace('_', ' ').toUpperCase()}</span>
    </div>
  </div>

  ${invoice.lineItems && invoice.lineItems.length > 0 ? `
  <hr class="divider-light" />
  <p class="section-title">Fee Breakdown</p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="text-align:left;padding:8px;font-size:12px;">Item</th>
        <th style="text-align:right;padding:8px;font-size:12px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.lineItems.map((item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.label}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(item.amount)}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <div class="amount-box">
    <div class="amount-row">
      <span>Total Invoice Amount</span>
      <span>${formatCurrency(Number(invoice.totalAmount))}</span>
    </div>
    <div class="amount-row total paid">
      <span>Amount Paid (This Payment)</span>
      <span>${formatCurrency(Number(payment.amount))}</span>
    </div>
    <div class="amount-row">
      <span>Total Paid to Date (${pctPaid}%)</span>
      <span>${formatCurrency(Number(invoice.amountPaid))}</span>
    </div>
    <div class="amount-row balance">
      <span>Outstanding Balance</span>
      <span>${formatCurrency(Number(invoice.balance))}</span>
    </div>
  </div>

  ${payment.note ? `
  <p class="section-title">Note</p>
  <p style="font-size:13px;color:#444;margin-bottom:24px;">${payment.note}</p>
  ` : ''}

  <div class="signature-row">
    <div class="signature-block">
      <div class="signature-line">Bursar's Signature</div>
    </div>
    <div class="signature-block">
      <div class="signature-line">Parent / Guardian Signature</div>
    </div>
  </div>

  <div class="footer">
    <p>This receipt was generated by ReportRun &bull; ${school.name}</p>
    <p style="margin-top:4px;">Please retain this receipt for your records.</p>
  </div>

</div>
</body>
</html>
    `.trim();
  }
}