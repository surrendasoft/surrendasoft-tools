import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { calculateInvoiceTotals, invoiceMoney, validateInvoice } from './simpleInvoice.js';

export { calculateInvoiceTotals, invoiceMoney };

export function quoteDateWarning(quoteDate, validUntil) {
  return quoteDate && validUntil && validUntil < quoteDate ? 'The valid-until date is before the quote date.' : '';
}

export function validateQuote(data) {
  const base = validateInvoice(data);
  if (base) return base;
  if (!data.quoteNumber?.trim()) return 'Enter a quote number.';
  return '';
}

export function buildQuoteSummaryMessage(data, totals = calculateInvoiceTotals(data.items || [], data.gstMode)) {
  const lines = [
    `Quote ${data.quoteNumber || '(no quote number)'}`,
    `Total: ${invoiceMoney(totals.total, data.currency || 'AUD')}`,
    data.validUntil && `Valid until: ${data.validUntil}`,
    data.depositAmount && Number(data.depositAmount) > 0 && `Deposit requested: ${invoiceMoney(data.depositAmount, data.currency || 'AUD')}`,
    data.notes,
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

export async function createQuotePdf(data) {
  const validation = validateQuote(data);
  if (validation) throw new Error(validation);
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.047, 0.09, 0.3), teal = rgb(0.04, 0.49, 0.44), muted = rgb(0.39, 0.44, 0.53), pale = rgb(0.95, 0.97, 0.99), line = rgb(0.87, 0.89, 0.93);
  const width = 595.28, height = 841.89, margin = 48;
  let page, y;
  const addPage = () => { page = pdf.addPage([width, height]); y = height - margin; page.drawRectangle({ x: 0, y: height - 14, width, height: 14, color: teal }); return page; };
  const text = (value, x, yy, size = 10, font = regular, color = navy, options = {}) => page.drawText(String(value || ''), { x, y: yy, size, font, color, ...options });
  const block = (value, x, maxWidth, size = 9, color = muted, leading = 13) => {
    wrapText(value, regular, size, maxWidth).forEach(valueLine => { text(valueLine, x, y, size, regular, color); y -= leading; });
  };
  const ensure = needed => { if (y - needed < margin + 30) { addPage(); text('QUOTE - continued', margin, y, 16, bold, navy); y -= 28; } };
  addPage();

  text(data.businessName || 'Business name', margin, y, 22, bold, navy);
  text('QUOTE', width - margin, y, 25, bold, teal, { x: width - margin - bold.widthOfTextAtSize('QUOTE', 25) });
  y -= 22;
  block([data.abn && `ABN ${data.abn}`, data.businessAddress, data.businessEmail, data.businessPhone, data.website].filter(Boolean).join('\n'), margin, 250, 8.5, muted, 12);
  const metaTop = height - margin - 34;
  [['Quote number', data.quoteNumber || '-'], ['Quote date', data.quoteDate || '-'], ['Valid until', data.validUntil || '-']].forEach(([label, value], index) => {
    const yy = metaTop - index * 20;
    text(label, 360, yy, 8, regular, muted);
    text(value, width - margin - bold.widthOfTextAtSize(String(value), 9), yy, 9, bold, navy);
  });
  y = Math.min(y, height - 155);
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: line }); y -= 25;
  text('PREPARED FOR', margin, y, 8, bold, teal); y -= 17;
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

  ensure(150);
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
  if (Number(data.depositAmount) > 0) totalRow('Deposit requested', Number(data.depositAmount));

  const validity = [
    data.validityNote || (data.validUntil ? `This quote is valid until ${data.validUntil}.` : ''),
    data.acceptanceNote || 'Acceptance of this quote may require a signed copy or written confirmation.',
  ].filter(Boolean).join('\n');
  if (validity) {
    ensure(80); y -= 5;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: line }); y -= 22;
    text('VALIDITY & ACCEPTANCE', margin, y, 9, bold, teal); y -= 17;
    block(validity, margin, width - margin * 2, 8.5, muted, 12);
  }
  [data.notes && ['NOTES', data.notes], data.terms && ['TERMS', data.terms]].filter(Boolean).forEach(([heading, value]) => {
    ensure(70); y -= 12; text(heading, margin, y, 9, bold, teal); y -= 16; block(value, margin, width - margin * 2, 8.5, muted, 12);
  });

  pdf.getPages().forEach((pdfPage, index) => {
    if (data.footerText) pdfPage.drawText(data.footerText.slice(0, 120), { x: margin, y: 24, size: 7.5, font: regular, color: muted });
    const number = `${index + 1} / ${pdf.getPageCount()}`;
    pdfPage.drawText(number, { x: width - margin - regular.widthOfTextAtSize(number, 7.5), y: 24, size: 7.5, font: regular, color: muted });
  });
  return pdf.save();
}
