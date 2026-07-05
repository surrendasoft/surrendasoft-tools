import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { blocksToPdf, htmlToBlocks, linesToDocx, pdfToLines } from './wordPdfConvert.js';

describe('htmlToBlocks', () => {
  it('extracts headings and paragraphs as separate blocks', () => {
    const blocks = htmlToBlocks('<h1>Title</h1><p>First paragraph.</p><p>Second paragraph.</p>');
    expect(blocks.map(b => b.type)).toEqual(['h1', 'p', 'p']);
    expect(blocks[0].runs.map(r => r.text).join('')).toBe('Title');
    expect(blocks[1].runs.map(r => r.text).join('')).toBe('First paragraph.');
  });

  it('splits bold and italic inline runs', () => {
    const blocks = htmlToBlocks('<p>plain <strong>bold text</strong> and <em>italic</em> end.</p>');
    const runs = blocks[0].runs;
    expect(runs.some(r => r.bold && r.text.includes('bold text'))).toBe(true);
    expect(runs.some(r => r.italic && r.text.includes('italic'))).toBe(true);
    expect(runs.some(r => !r.bold && !r.italic && r.text.includes('plain'))).toBe(true);
  });

  it('extracts list items from ul and ol', () => {
    const blocks = htmlToBlocks('<ul><li>One</li><li>Two</li></ul><ol><li>Three</li></ol>');
    expect(blocks.map(b => b.type)).toEqual(['li', 'li', 'li']);
    expect(blocks.map(b => b.runs.map(r => r.text).join(''))).toEqual(['One', 'Two', 'Three']);
  });

  it('ignores empty blocks', () => {
    const blocks = htmlToBlocks('<p>   </p><p>Real content</p>');
    expect(blocks.length).toBe(1);
    expect(blocks[0].runs.map(r => r.text).join('')).toBe('Real content');
  });
});

describe('blocksToPdf', () => {
  it('builds a readable PDF from headings, paragraphs, and list items', async () => {
    const blocks = [
      { type: 'h1', runs: [{ text: 'Report title', bold: false, italic: false }] },
      { type: 'p', runs: [{ text: 'A short paragraph with ', bold: false, italic: false }, { text: 'bold', bold: true, italic: false }, { text: ' and normal text.', bold: false, italic: false }] },
      { type: 'li', runs: [{ text: 'First item', bold: false, italic: false }] },
      { type: 'li', runs: [{ text: 'Second item', bold: false, italic: false }] },
    ];
    const bytes = await blocksToPdf(blocks, 'My Document');
    expect(bytes.length).toBeGreaterThan(100);
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('paginates long content across multiple pages', async () => {
    const blocks = Array.from({ length: 60 }, (_, i) => ({
      type: 'p',
      runs: [{ text: `Paragraph number ${i} with enough words to take up a full line of space on the page.`, bold: false, italic: false }],
    }));
    const bytes = await blocksToPdf(blocks, 'Long doc');
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBeGreaterThan(1);
  });
});

describe('pdfToLines + linesToDocx round trip', () => {
  it('extracts text lines from a PDF and rebuilds them into a readable Word document', async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont('Helvetica');
    const page = pdf.addPage([600, 800]);
    page.drawText('Hello from the PDF', { x: 50, y: 750, size: 14, font });
    page.drawText('Second line of text', { x: 50, y: 720, size: 14, font });
    const bytes = await pdf.save();

    const { pages } = await pdfToLines(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    expect(pages.length).toBe(1);
    expect(pages[0].lines.join(' ')).toContain('Hello from the PDF');
    expect(pages[0].lines.join(' ')).toContain('Second line of text');

    const blob = await linesToDocx(pages, 'Extracted');
    expect(blob.size).toBeGreaterThan(100);

    const mammothModule = await import('mammoth/mammoth.browser');
    const mammoth = mammothModule.default || mammothModule;
    const arrayBuffer = await blob.arrayBuffer();
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
    expect(html).toContain('Hello from the PDF');
    expect(html).toContain('Second line of text');
    expect(html).toContain('Extracted');
  });
});
