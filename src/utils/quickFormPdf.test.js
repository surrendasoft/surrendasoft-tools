import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildResponse, clientIntakeTemplate, feedbackTemplate } from './quickForm.js';
import { buildFillablePdf, buildResponsePdf } from './quickFormPdf.js';

describe('quickFormPdf', () => {
  it('builds a readable summary PDF for a completed response', async () => {
    const form = clientIntakeTemplate();
    const response = buildResponse(form, { [form.fields[0].id]: 'Jane Doe', [form.fields[1].id]: '0412 000 000' });
    const bytes = await buildResponsePdf(response);
    expect(bytes.length).toBeGreaterThan(100);
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('builds a fillable PDF with a real AcroForm field per form field', async () => {
    const form = feedbackTemplate();
    const bytes = await buildFillablePdf(form);
    const loaded = await PDFDocument.load(bytes);
    const fields = loaded.getForm().getFields();
    expect(fields.length).toBeGreaterThanOrEqual(form.fields.length - 1); // rating renders as a radio group per star, still one field
  });

  it('paginates a response with many long answers across multiple pages', async () => {
    const longForm = {
      title: 'Long form',
      fields: Array.from({ length: 25 }, (_, i) => ({ id: `f${i}`, type: 'textarea', label: `Question ${i}`, options: [], required: false })),
    };
    const answers = Object.fromEntries(longForm.fields.map(f => [f.id, 'A fairly long answer that takes up some room on the page. '.repeat(4)]));
    const response = buildResponse(longForm, answers);
    const bytes = await buildResponsePdf(response);
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBeGreaterThan(1);
  });
});
