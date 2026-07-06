import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { invoiceMoney } from './simpleInvoice.js';

const PAYMENT_METHODS = ['Bank transfer', 'Cash', 'Card', 'Cheque', 'Other'];

export function receiptPaymentMethods() {
  return PAYMENT_METHODS;
}

export function validateReceipt(data) {
  if (!data.businessName?.trim()) return 'Enter your business name.';
  if (!data.receiptNumber?.trim()) return 'Enter a receipt number.';
  if (!data.receiptDate) return 'Choose a receipt date.';
  if (!data.paidBy?.trim()) return 'Enter who paid.';
  const amount = Number(data.amountPaid);
  if (!Number.isFinite(amount) || amount <= 0) return 'Enter an amount paid greater than zero.';
  return '';
}

export function buildReceiptMessage(data) {
  return [
    `Receipt ${data.receiptNumber}`,
    `Paid by: ${data.paidBy}`,
    `Amount: ${invoiceMoney(data.amountPaid, data.currency || 'AUD')}`,
    data.paymentMethod && `Payment method: ${data.paymentMethod}`,
    data.receiptDate && `Date: ${data.receiptDate}`,
    data.invoiceReference && `Invoice/reference: ${data.invoiceReference}`,
    data.description && `For: ${data.description}`,
  ].filter(Boolean).join('\n');
}

const wrapText = (text, font, size, maxWidth) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let line = '';
  words.forEach(word => {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else { if (line) lines.push(line); line = word; }
  });
  if (line) lines.push(line);
  return lines;
};

export async function createReceiptPdf(data) {
  const validation = validateReceipt(data);
  if (validation) throw new Error(validation);
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.047, 0.09, 0.3), green = rgb(0.04, 0.55, 0.36), muted = rgb(0.39, 0.44, 0.53), pale = rgb(0.95, 0.99, 0.96), line = rgb(0.87, 0.89, 0.93);
  const width = 595.28, height = 841.89, margin = 48;
  const page = pdf.addPage([width, height]);
  let y = height - margin;
  page.drawRectangle({ x: 0, y: height - 14, width, height: 14, color: green });
  const text = (value, x, yy, size = 10, font = regular, color = navy, options = {}) => page.drawText(String(value || ''), { x, y: yy, size, font, color, ...options });

  text(data.businessName || 'Business name', margin, y, 22, bold, navy);
  text('RECEIPT', width - margin, y, 25, bold, green, { x: width - margin - bold.widthOfTextAtSize('RECEIPT', 25) });
  y -= 22;
  wrapText([data.abn && `ABN ${data.abn}`, data.businessAddress, data.businessEmail, data.businessPhone].filter(Boolean).join(' · '), regular, 8.5, 320).forEach(line => { text(line, margin, y, 8.5, regular, muted); y -= 12; });

  const metaTop = height - margin - 34;
  [['Receipt number', data.receiptNumber], ['Date paid', data.receiptDate], ['Payment method', data.paymentMethod || '-']].forEach(([label, value], index) => {
    const yy = metaTop - index * 20;
    text(label, 360, yy, 8, regular, muted);
    text(value, width - margin - bold.widthOfTextAtSize(String(value), 9), yy, 9, bold, navy);
  });
  y = Math.min(y, height - 150);
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: line }); y -= 28;

  text('RECEIVED FROM', margin, y, 8, bold, green); y -= 18;
  text(data.paidBy, margin, y, 14, bold, navy); y -= 22;
  if (data.paidByEmail) { text(data.paidByEmail, margin, y, 9, regular, muted); y -= 16; }

  page.drawRectangle({ x: margin, y: y - 78, width: width - margin * 2, height: 88, color: pale, borderColor: green, borderWidth: 1 });
  text('AMOUNT PAID', margin + 16, y - 18, 8, bold, green);
  const amountText = invoiceMoney(data.amountPaid, data.currency || 'AUD');
  text(amountText, margin + 16, y - 48, 24, bold, navy);
  y -= 108;

  if (data.description) {
    text('FOR', margin, y, 8, bold, green); y -= 16;
    wrapText(data.description, regular, 10, width - margin * 2).forEach(line => { text(line, margin, y, 10, regular, navy); y -= 14; });
    y -= 8;
  }
  if (data.invoiceReference) {
    text('Invoice / reference', margin, y, 8, regular, muted); y -= 14;
    text(data.invoiceReference, margin, y, 10, bold, navy); y -= 20;
  }
  if (data.notes) {
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: line }); y -= 20;
    text('NOTES', margin, y, 8, bold, green); y -= 14;
    wrapText(data.notes, regular, 9, width - margin * 2).forEach(line => { text(line, margin, y, 9, regular, muted); y -= 12; });
  }

  const footer = data.footerText || 'Thank you for your payment.';
  page.drawLine({ start: { x: margin, y: margin + 28 }, end: { x: width - margin, y: margin + 28 }, thickness: 1, color: line });
  text(footer.slice(0, 120), margin, margin + 10, 8, regular, muted);
  text('PAID IN FULL', width - margin - bold.widthOfTextAtSize('PAID IN FULL', 8), margin + 10, 8, bold, green);
  return pdf.save();
}
