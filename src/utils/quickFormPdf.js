// PDF generation for Quick Form Builder — an offline fallback when a link or QR code
// isn't practical (either the payload is too big, or the recipient prefers a file).
// Uses pdf-lib, loaded lazily so it doesn't weigh down the initial bundle.

const PAGE_WIDTH = 612; // US Letter, points
const PAGE_HEIGHT = 792;
const MARGIN = 54;

function wrapLines(text, font, size, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let current = '';
  words.forEach(word => {
    const attempt = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(attempt, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = attempt;
    }
  });
  if (current) lines.push(current);
  return lines;
}

// A plain, read-only summary of a completed response — for sending or archiving when
// the response link is too long to share reliably as a link or QR code.
export async function buildResponsePdf(response) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const ensure = needed => {
    if (y - needed < MARGIN) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  page.drawText(response.formTitle || 'Completed form', { x: MARGIN, y, size: 20, font: bold, color: rgb(0.04, 0.09, 0.24) });
  y -= 22;
  page.drawText(`Submitted ${new Date(response.submittedAt).toLocaleString()}`, { x: MARGIN, y, size: 10, font, color: rgb(0.5, 0.55, 0.65) });
  y -= 28;

  response.fields.forEach(field => {
    ensure(40);
    page.drawText(field.label, { x: MARGIN, y, size: 11.5, font: bold, color: rgb(0.06, 0.09, 0.24) });
    y -= 16;
    const lines = wrapLines(field.value || '—', font, 11, PAGE_WIDTH - MARGIN * 2);
    (lines.length ? lines : ['—']).forEach(line => {
      ensure(16);
      page.drawText(line, { x: MARGIN, y, size: 11, font, color: rgb(0.15, 0.18, 0.3) });
      y -= 15;
    });
    y -= 9;
  });

  return pdf.save();
}

// A fillable PDF built from the form definition itself — real AcroForm fields the
// recipient can type into in Acrobat Reader, Preview, or most browsers, then save and
// send back as a file instead of using a link or QR code.
export async function buildFillablePdf(form) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const acro = pdf.getForm();
  const border = rgb(0.7, 0.74, 0.82);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const ensure = needed => {
    if (y - needed < MARGIN) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };
  const usableWidth = PAGE_WIDTH - MARGIN * 2;

  page.drawText(form.title || 'Untitled form', { x: MARGIN, y, size: 20, font: bold, color: rgb(0.04, 0.09, 0.24) });
  y -= 22;

  if (form.description) {
    wrapLines(form.description, font, 10.5, usableWidth).forEach(line => {
      ensure(15);
      page.drawText(line, { x: MARGIN, y, size: 10.5, font, color: rgb(0.4, 0.45, 0.55) });
      y -= 15;
    });
    y -= 4;
  }

  wrapLines(
    'Fill this in using a PDF reader that supports form fields (Acrobat Reader, Preview, or most browsers), save it, then send the saved file back.',
    font, 9, usableWidth,
  ).forEach(line => {
    ensure(13);
    page.drawText(line, { x: MARGIN, y, size: 9, font, color: rgb(0.55, 0.6, 0.7) });
    y -= 13;
  });
  y -= 16;

  form.fields.forEach((field, index) => {
    ensure(70);
    page.drawText(`${index + 1}. ${field.label}${field.required ? ' *' : ''}`, { x: MARGIN, y, size: 11.5, font: bold, color: rgb(0.06, 0.09, 0.24) });
    y -= 18;
    const name = `field_${index + 1}_${field.id}`;

    if (field.type === 'checkbox') {
      const cb = acro.createCheckBox(name);
      cb.addToPage(page, { x: MARGIN, y: y - 14, width: 14, height: 14, borderColor: border, borderWidth: 1 });
      y -= 30;
    } else if (field.type === 'select') {
      const dd = acro.createDropdown(name);
      dd.addOptions(field.options.length ? field.options : ['Option 1']);
      dd.addToPage(page, { x: MARGIN, y: y - 20, width: Math.min(260, usableWidth), height: 20, borderColor: border, borderWidth: 1 });
      dd.setFontSize(10);
      y -= 34;
    } else if (field.type === 'rating') {
      const rg = acro.createRadioGroup(name);
      const count = field.max || 5;
      const gap = Math.min(46, usableWidth / count);
      for (let n = 1; n <= count; n += 1) {
        const rx = MARGIN + (n - 1) * gap;
        rg.addOptionToPage(String(n), page, { x: rx, y: y - 16, width: 13, height: 13, borderColor: border, borderWidth: 1 });
        page.drawText(String(n), { x: rx + 17, y: y - 14, size: 9, font, color: rgb(0.4, 0.45, 0.55) });
      }
      page.drawText(`(1 = lowest, ${count} = highest)`, { x: MARGIN, y: y - 32, size: 8, font, color: rgb(0.6, 0.65, 0.75) });
      y -= 46;
    } else if (field.type === 'range') {
      const stepCount = Math.round((field.max - field.min) / (field.step || 1));
      if (stepCount > 0 && stepCount <= 12) {
        const dd = acro.createDropdown(name);
        const opts = [];
        for (let v = field.min; v <= field.max; v += (field.step || 1)) opts.push(String(v));
        dd.addOptions(opts);
        dd.addToPage(page, { x: MARGIN, y: y - 20, width: 100, height: 20, borderColor: border, borderWidth: 1 });
        dd.setFontSize(10);
        page.drawText(`Scale: ${field.min}–${field.max}`, { x: MARGIN + 112, y: y - 14, size: 9, font, color: rgb(0.6, 0.65, 0.75) });
      } else {
        const tf = acro.createTextField(name);
        tf.addToPage(page, { x: MARGIN, y: y - 20, width: 100, height: 20, borderColor: border, borderWidth: 1 });
        tf.setFontSize(10);
        page.drawText(`Enter a number ${field.min}–${field.max}`, { x: MARGIN + 112, y: y - 14, size: 9, font, color: rgb(0.6, 0.65, 0.75) });
      }
      y -= 34;
    } else if (field.type === 'textarea') {
      const tf = acro.createTextField(name);
      tf.enableMultiline();
      tf.addToPage(page, { x: MARGIN, y: y - 60, width: usableWidth, height: 60, borderColor: border, borderWidth: 1 });
      tf.setFontSize(10);
      y -= 74;
    } else {
      const tf = acro.createTextField(name);
      tf.addToPage(page, { x: MARGIN, y: y - 20, width: Math.min(320, usableWidth), height: 20, borderColor: border, borderWidth: 1 });
      tf.setFontSize(10);
      y -= 34;
    }
  });

  return pdf.save();
}
