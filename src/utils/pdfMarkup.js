export async function exportMarkedPdf(arrayBuffer, { textFields = [], signature = null }) {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
  const pdf = await PDFDocument.load(arrayBuffer);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  const ink = rgb(0.06, 0.09, 0.24);

  textFields.forEach(field => {
    const page = pages[field.page - 1];
    const text = String(field.text || '').trim();
    if (!page || !text) return;
    const { width, height } = page.getSize();
    const boxH = (field.fh || 0.04) * height;
    const padding = 2;
    const size = field.size || Math.min(12, Math.max(8, boxH * 0.7));
    page.drawText(text, {
      x: field.fx * width + padding,
      y: height - field.fy * height - padding - size,
      size,
      font,
      color: ink,
    });
  });

  if (signature?.dataUrl && signature.page >= 1 && signature.page <= pages.length) {
    const page = pages[signature.page - 1];
    const { width, height } = page.getSize();
    const bytes = dataUrlToBytes(signature.dataUrl);
    const image = signature.dataUrl.startsWith('data:image/png')
      ? await pdf.embedPng(bytes)
      : await pdf.embedJpg(bytes);
    const sigW = signature.fw * width;
    const sigH = sigW / signature.aspect;
    page.drawImage(image, {
      x: signature.fx * width,
      y: height - signature.fy * height - sigH,
      width: sigW,
      height: sigH,
    });
  }

  return pdf.save();
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function completedPdfName(originalName) {
  const base = originalName.replace(/\.pdf$/i, '') || 'document';
  return `${base}-completed.pdf`;
}

export function hasMarkup(textFields, signature) {
  const hasText = textFields.some(field => String(field.text || '').trim());
  return hasText || !!signature?.dataUrl;
}
