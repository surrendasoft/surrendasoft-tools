import { describe, expect, it } from 'vitest';
import {
  createSampleFormPdf, fillPdfForm, labelForField, readPdfFormFields, valuesFromFields,
} from './pdfForm.js';

describe('labelForField', () => {
  it('humanises dotted field names', () => {
    expect(labelForField('applicant.fullName')).toBe('full Name');
    expect(labelForField('plan_choice')).toBe('plan choice');
  });
});

describe('pdf form utilities', () => {
  it('reads fields from a sample form PDF', async () => {
    const bytes = await createSampleFormPdf();
    const { fields, editableCount } = await readPdfFormFields(bytes);
    expect(fields.length).toBeGreaterThanOrEqual(4);
    expect(editableCount).toBeGreaterThanOrEqual(4);
    expect(fields.find(field => field.name === 'applicant.name')?.value).toBe('Alex Example');
    expect(fields.find(field => field.name === 'plan.choice')?.type).toBe('dropdown');
  });

  it('writes updated values back into the PDF', async () => {
    const bytes = await createSampleFormPdf();
    const { fields } = await readPdfFormFields(bytes);
    const values = valuesFromFields(fields);
    values['applicant.name'] = 'Jordan Smith';
    values['applicant.employed'] = false;
    values['plan.choice'] = 'Premium';
    values['contact.method'] = 'Phone';

    const filled = await fillPdfForm(bytes, values);
    const reread = await readPdfFormFields(filled);

    expect(reread.fields.find(field => field.name === 'applicant.name')?.value).toBe('Jordan Smith');
    expect(reread.fields.find(field => field.name === 'applicant.employed')?.value).toBe(false);
    expect(reread.fields.find(field => field.name === 'plan.choice')?.value).toBe('Premium');
    expect(reread.fields.find(field => field.name === 'contact.method')?.value).toBe('Phone');
  });
});
