import { describe, expect, it } from 'vitest';
import { completedPdfName, exportMarkedPdf, hasMarkup } from './pdfMarkup.js';

async function blankPdfBytes() {
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  return pdf.save();
}

describe('pdfMarkup utilities', () => {
  it('names completed downloads from the original file', () => {
    expect(completedPdfName('NABFeedForm.pdf')).toBe('NABFeedForm-completed.pdf');
    expect(completedPdfName('report.PDF')).toBe('report-completed.pdf');
  });

  it('detects when markup is present', () => {
    expect(hasMarkup([], null)).toBe(false);
    expect(hasMarkup([{ text: '   ' }], null)).toBe(false);
    expect(hasMarkup([{ text: 'Account name' }], null)).toBe(true);
    expect(hasMarkup([], { dataUrl: 'data:image/png;base64,abc' })).toBe(true);
  });

  it('writes text overlays into the PDF', async () => {
    const source = await blankPdfBytes();
    const bytes = await exportMarkedPdf(source, {
      textFields: [{ page: 1, fx: 0.1, fy: 0.2, text: 'Jane Doe', size: 12 }],
      signature: null,
    });
    expect(bytes.byteLength).toBeGreaterThan(source.byteLength);
  });

  it('writes a signature image into the PDF', async () => {
    const source = await blankPdfBytes();
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const bytes = await exportMarkedPdf(source, {
      textFields: [],
      signature: { page: 1, fx: 0.5, fy: 0.7, fw: 0.2, dataUrl: png, aspect: 3 },
    });
    expect(bytes.byteLength).toBeGreaterThan(source.byteLength);
  });
});
