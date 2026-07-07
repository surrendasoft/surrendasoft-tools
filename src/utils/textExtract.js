// Text extraction — reads plain text, Word documents, and PDFs directly, and
// falls back to OCR (tesseract.js) for images and PDF pages with no text
// layer. Everything runs client-side; OCR downloads its recognition engine
// and language data from a public CDN the first time it runs.

import { loadPdfJs } from './pdfjs.js';

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|bmp|gif)$/i;
const TEXT_EXTENSIONS = /\.(txt|md|markdown|csv|tsv|json|js|jsx|ts|tsx|css|html?|xml|ya?ml|log|ini|conf|sh)$/i;

// Minimum non-whitespace characters a PDF page's embedded text layer needs
// before we trust it instead of falling back to OCR.
const MIN_PAGE_TEXT_LENGTH = 3;

export function detectFileKind(file) {
  const name = file?.name || '';
  const type = file?.type || '';

  if (type === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf';
  if (type === DOCX_MIME || /\.docx$/i.test(name)) return 'docx';
  if ((type.startsWith('image/') && type !== 'image/svg+xml') || IMAGE_EXTENSIONS.test(name)) return 'image';
  if (type.startsWith('text/') || type === 'application/json' || TEXT_EXTENSIONS.test(name)) return 'text';
  return 'unsupported';
}

export function createImageThumbnailUrl(file) {
  return URL.createObjectURL(file);
}

export async function createPdfThumbnailUrl(arrayBuffer, scale = 0.35) {
  const pdfjs = await loadPdfJs();
  const document = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const page = await document.getPage(1);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.85);
}

export async function extractPlainText(file) {
  return (await file.text()).replace(/\r\n/g, '\n');
}

export async function extractDocxText(arrayBuffer) {
  const mammothModule = await import('mammoth/mammoth.browser');
  const mammoth = mammothModule.default || mammothModule;
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return value.trim();
}

export async function createOcrWorker(logger) {
  const { createWorker } = await import('tesseract.js');
  return createWorker('eng', 1, logger ? { logger } : {});
}

// Renders one page to a canvas at a higher scale for sharper OCR input.
async function renderPageToBlob(page, scale = 2) {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

// Extracts text from every page of a PDF. Pages with a usable embedded text
// layer are read directly; pages with little/no text (scanned or image-only)
// are rendered to a canvas and OCR'd when `ocrWorker` is supplied.
export async function extractPdfText(arrayBuffer, { ocrWorker, onProgress } = {}) {
  const pdfjs = await loadPdfJs();
  const document = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const pages = [];

  for (let number = 1; number <= document.numPages; number += 1) {
    const page = await document.getPage(number);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();

    if (text.length >= MIN_PAGE_TEXT_LENGTH) {
      pages.push({ number, text, method: 'text' });
      onProgress?.({ page: number, total: document.numPages, phase: 'text' });
      continue;
    }

    if (!ocrWorker) {
      pages.push({ number, text: '', method: 'empty' });
      onProgress?.({ page: number, total: document.numPages, phase: 'empty' });
      continue;
    }

    onProgress?.({ page: number, total: document.numPages, phase: 'ocr' });
    const blob = await renderPageToBlob(page);
    const { data } = await ocrWorker.recognize(blob);
    pages.push({ number, text: (data?.text || '').trim(), method: 'ocr' });
  }

  return pages;
}

export async function extractImageText(file, ocrWorker) {
  const { data } = await ocrWorker.recognize(file);
  return (data?.text || '').trim();
}
