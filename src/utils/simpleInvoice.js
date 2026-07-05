import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const invoiceMoney = (value, currency = 'AUD') => new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(Number(value) || 0);
const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateInvoiceTotals(items, gstMode) {
  const raw = items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.unitPrice) || 0), 0);
  if (gstMode === 'included') {
    const subtotal = cents(raw / 1.1);
    return { subtotal, gst: cents(raw - subtotal), total: cents(raw) };
  }
  if (gstMode === 'added') return { subtotal: cents(raw), gst: cents(raw * 0.1), total: cents(raw * 1.1) };
  return { subtotal: cents(raw), gst: 0, total: cents(raw) };
}

export function validateInvoice(data) {
  if (!data.items?.length) return 'Add at least one line item.';
  for (const item of data.items) {
    if (!item.description?.trim()) return 'Enter a description for every line item.';
    if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) return 'Each line item needs a quantity greater than zero.';
    if (!Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 0) return 'Each line item needs a valid unit price.';
  }
  return '';
}

export function invoiceDateWarning(invoiceDate, dueDate) {
  return invoiceDate && dueDate && dueDate < invoiceDate ? 'The due date is before the invoice date.' : '';
}

export function buildInvoicePaymentMessage(data, totals = calculateInvoiceTotals(data.items || [], data.gstMode)) {
  const lines = [
    `Payment for invoice ${data.invoiceNumber || '(no invoice number)'}`,
    `Amount due: ${invoiceMoney(totals.total, data.currency || 'AUD')}`,
    data.dueDate && `Due date: ${data.dueDate}`,
    data.paymentInstructions,
    data.accountName && `Account name: ${data.accountName}`,
    data.bsb && `BSB: ${data.bsb}`,
    data.accountNumber && `Account number: ${data.accountNumber}`,
    data.paymentReference && `Reference: ${data.paymentReference}`,
    data.paymentLink && `Payment link: ${data.paymentLink}`,
  ].filter(Boolean);
  return lines.join('\n');
}

const wrapText = (text, font, size, maxWidth) => {
  const paragraphs = String(text || '').split('\n');
  const lines = [];
  paragraphs.forEach(paragraph => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) { lines.push(''); return; }
    let line = '';
    words.forEach(word => {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
      else { if (line) lines.push(line); line = word; }
    });
    if (line) lines.push(line);
  });
  return lines;
};

export async function createInvoicePdf(data) {
  const validation = validateInvoice(data);
  if (validation) throw new Error(validation);
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.047, 0.09, 0.3), blue = rgb(0.09, 0.4, 0.85), muted = rgb(0.39, 0.44, 0.53), pale = rgb(0.95, 0.97, 0.99), line = rgb(0.87, 0.89, 0.93);
  const width = 595.28, height = 841.89, margin = 48;
  let page, y;
  const addPage = () => {
    page = pdf.addPage([width, height]); y = height - margin;
    page.drawRectangle({ x: 0, y: height - 14, width, height: 14, color: navy });
    return page;
  };
  const text = (value, x, yy, size = 10, font = regular, color = navy, options = {}) => page.drawText(String(value || ''), { x, y: yy, size, font, color, ...options });
  const block = (value, x, maxWidth, size = 9, color = muted, leading = 13) => {
    wrapText(value, regular, size, maxWidth).forEach(valueLine => { text(valueLine, x, y, size, regular, color); y -= leading; });
  };
  const ensure = needed => { if (y - needed < margin + 30) { addPage(); text('INVOICE - continued', margin, y, 16, bold, navy); y -= 28; } };
  addPage();

  text(data.businessName || 'Business name', margin, y, 22, bold, navy);
  text('INVOICE', width - margin, y, 25, bold, blue, { x: width - margin - bold.widthOfTextAtSize('INVOICE', 25) });
  y -= 22;
  const businessDetails = [data.abn && `ABN ${data.abn}`, data.businessAddress, data.businessEmail, data.businessPhone, data.website].filter(Boolean).join('\n');
  block(businessDetails, margin, 250, 8.5, muted, 12);
  const metaTop = height - margin - 34;
  [['Invoice number', data.invoiceNumber || '-'], ['Invoice date', data.invoiceDate || '-'], ['Due date', data.dueDate || '-']].forEach(([label, value], index) => {
    const yy = metaTop - index * 20;
    text(label, 360, yy, 8, regular, muted);
    text(value, width - margin - bold.widthOfTextAtSize(String(value), 9), yy, 9, bold, navy);
  });
  y = Math.min(y, height - 155);
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: line }); y -= 25;
  text('BILL TO', margin, y, 8, bold, blue); y -= 17;
  text(data.clientName || 'Client', margin, y, 12, bold, navy); y -= 15;
  block([data.clientEmail, data.clientAddress].filter(Boolean).join('\n'), margin, 300, 9, muted, 13); y -= 12;

  const drawTableHeader = () => {
    page.drawRectangle({ x: margin, y: y - 6, width: width - margin * 2, height: 25, color: navy });
    text('DESCRIPTION', margin + 10, y + 2, 8, bold, rgb(1, 1, 1));
    text('QTY', 365, y + 2, 8, bold, rgb(1, 1, 1));
    text('UNIT PRICE', 410, y + 2, 8, bold, rgb(1, 1, 1));
    text('AMOUNT', 500, y + 2, 8, bold, rgb(1, 1, 1)); y -= 27;
  };
  drawTableHeader();
  data.items.forEach(item => {
    const descriptionLines = wrapText(item.description, regular, 9, 285);
    const rowHeight = Math.max(28, descriptionLines.length * 12 + 10);
    if (y - rowHeight < 210) { addPage(); drawTableHeader(); }
    page.drawRectangle({ x: margin, y: y - rowHeight + 5, width: width - margin * 2, height: rowHeight, color: pale });
    descriptionLines.forEach((descriptionLine, index) => text(descriptionLine, margin + 10, y - 10 - index * 12, 9, regular, navy));
    text(Number(item.quantity), 370, y - 10, 9, regular, navy);
    const unit = invoiceMoney(item.unitPrice, data.currency); text(unit, 478 - regular.widthOfTextAtSize(unit, 9), y - 10, 9, regular, navy);
    const amount = invoiceMoney(Number(item.quantity) * Number(item.unitPrice), data.currency); text(amount, width - margin - regular.widthOfTextAtSize(amount, 9), y - 10, 9, regular, navy);
    y -= rowHeight + 2;
  });

  ensure(135);
  const totals = calculateInvoiceTotals(data.items, data.gstMode);
  y -= 8;
  const totalRow = (label, value, strong = false) => {
    const font = strong ? bold : regular, size = strong ? 13 : 9;
    text(label, 380, y, size, font, strong ? navy : muted);
    const formatted = invoiceMoney(value, data.currency); text(formatted, width - margin - font.widthOfTextAtSize(formatted, size), y, size, font, strong ? navy : muted); y -= strong ? 24 : 18;
  };
  totalRow(data.gstMode === 'included' ? 'Subtotal ex GST' : 'Subtotal', totals.subtotal);
  totalRow('GST', totals.gst);
  totalRow('TOTAL', totals.total, true);

  const payment = buildInvoicePaymentMessage(data, totals);
  if (payment) {
    ensure(100); y -= 5;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: line }); y -= 22;
    text('PAYMENT DETAILS', margin, y, 9, bold, blue); y -= 17;
    block(payment, margin, width - margin * 2, 8.5, muted, 12);
  }
  [data.notes && ['NOTES', data.notes], data.terms && ['TERMS', data.terms]].filter(Boolean).forEach(([heading, value]) => {
    ensure(70); y -= 12; text(heading, margin, y, 9, bold, blue); y -= 16; block(value, margin, width - margin * 2, 8.5, muted, 12);
  });

  pdf.getPages().forEach((pdfPage, index) => {
    if (data.footerText) pdfPage.drawText(data.footerText.slice(0, 120), { x: margin, y: 24, size: 7.5, font: regular, color: muted });
    const number = `${index + 1} / ${pdf.getPageCount()}`;
    pdfPage.drawText(number, { x: width - margin - regular.widthOfTextAtSize(number, 7.5), y: 24, size: 7.5, font: regular, color: muted });
  });
  return pdf.save();
}
