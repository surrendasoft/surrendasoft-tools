import {
  PDFCheckBox, PDFDropdown, PDFOptionList, PDFRadioGroup, PDFSignature, PDFTextField,
} from 'pdf-lib';

export const MAX_PDF_FORM_BYTES = 25 * 1024 * 1024;

export function labelForField(name) {
  const leaf = String(name || '').split('.').pop().replace(/\[\d+\]$/, '');
  return leaf
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || name;
}

function serializeField(field) {
  const name = field.getName();
  const readOnly = field.isReadOnly?.() ?? false;

  if (field instanceof PDFTextField) {
    return {
      id: name,
      name,
      label: labelForField(name),
      type: 'text',
      value: field.getText() || '',
      multiline: field.isMultiline(),
      readOnly,
    };
  }

  if (field instanceof PDFCheckBox) {
    return {
      id: name,
      name,
      label: labelForField(name),
      type: 'checkbox',
      value: field.isChecked(),
      readOnly,
    };
  }

  if (field instanceof PDFDropdown) {
    return {
      id: name,
      name,
      label: labelForField(name),
      type: 'dropdown',
      value: field.getSelected()?.[0] || '',
      options: field.getOptions(),
      readOnly,
    };
  }

  if (field instanceof PDFOptionList) {
    return {
      id: name,
      name,
      label: labelForField(name),
      type: 'optionlist',
      value: field.getSelected() || [],
      options: field.getOptions(),
      readOnly,
    };
  }

  if (field instanceof PDFRadioGroup) {
    return {
      id: name,
      name,
      label: labelForField(name),
      type: 'radio',
      value: field.getSelected() || '',
      options: field.getOptions(),
      readOnly,
    };
  }

  if (field instanceof PDFSignature) {
    return {
      id: name,
      name,
      label: labelForField(name),
      type: 'signature',
      value: '',
      readOnly: true,
    };
  }

  return {
    id: name,
    name,
    label: labelForField(name),
    type: 'unknown',
    value: '',
    readOnly: true,
  };
}

export async function readPdfFormFields(arrayBuffer) {
  const { PDFDocument } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const hasXFA = form.hasXFA();
  const fields = form.getFields().map(serializeField);
  const editableCount = fields.filter(field => !field.readOnly && field.type !== 'signature' && field.type !== 'unknown').length;

  return { fields, hasXFA, editableCount };
}

function applyFieldValue(field, value) {
  if (field instanceof PDFTextField) {
    field.setText(String(value ?? ''));
    return;
  }
  if (field instanceof PDFCheckBox) {
    if (value) field.check();
    else field.uncheck();
    return;
  }
  if (field instanceof PDFDropdown) {
    if (value) field.select(String(value));
    else field.clear();
    return;
  }
  if (field instanceof PDFOptionList) {
    field.clear();
    (Array.isArray(value) ? value : [value]).filter(Boolean).forEach(option => field.select(String(option)));
    return;
  }
  if (field instanceof PDFRadioGroup) {
    if (value) field.select(String(value));
  }
}

export async function fillPdfForm(arrayBuffer, values) {
  const { PDFDocument } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  if (form.hasXFA()) form.deleteXFA();

  Object.entries(values).forEach(([name, value]) => {
    const field = form.getFieldMaybe(name);
    if (!field || field.isReadOnly?.()) return;
    try {
      applyFieldValue(field, value);
    } catch {
      /* skip fields that reject a value */
    }
  });

  form.updateFieldAppearances();
  return pdfDoc.save();
}

export function valuesFromFields(fields) {
  return Object.fromEntries(fields.map(field => [field.name, field.value]));
}

export async function createSampleFormPdf() {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawText('Sample application form', { x: 50, y: 740, size: 18, font, color: rgb(0.08, 0.12, 0.24) });

  const form = pdfDoc.getForm();
  const nameField = form.createTextField('applicant.name');
  nameField.setText('Alex Example');
  nameField.addToPage(page, { x: 50, y: 680, width: 240, height: 24 });

  const emailField = form.createTextField('applicant.email');
  emailField.setText('alex@example.com');
  emailField.addToPage(page, { x: 50, y: 630, width: 240, height: 24 });

  const employed = form.createCheckBox('applicant.employed');
  employed.check();
  employed.addToPage(page, { x: 50, y: 580, width: 18, height: 18 });

  const planField = form.createDropdown('plan.choice');
  planField.addOptions(['Basic', 'Standard', 'Premium']);
  planField.select('Standard');
  planField.addToPage(page, { x: 50, y: 520, width: 180, height: 24 });

  const contactField = form.createRadioGroup('contact.method');
  contactField.addOptionToPage('Email', page, { x: 50, y: 470, width: 18, height: 18 });
  contactField.addOptionToPage('Phone', page, { x: 130, y: 470, width: 18, height: 18 });
  contactField.select('Email');

  form.updateFieldAppearances();
  return pdfDoc.save();
}
