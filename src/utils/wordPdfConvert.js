// Word <-> PDF conversion — entirely client-side, best-effort text conversion.
// There's no Office engine or server involved, so only text-level fidelity is
// realistic: paragraphs, headings, bold/italic, and lists carry over. Images,
// tables, columns, and exact page layout are not preserved.

const PAGE_WIDTH = 612; // US Letter, points
const PAGE_HEIGHT = 792;
const MARGIN = 54;

const HEADING_SIZES = { h1: 22, h2: 18, h3: 15, h4: 13, h5: 12, h6: 11.5 };

// ─── Word (.docx) → blocks ───────────────────────────────────────────────

// Walks the HTML mammoth produces into a flat list of blocks, each with a
// list of inline runs carrying their own bold/italic flags. Kept separate
// from the mammoth call so it can be unit-tested with plain HTML strings.
export function htmlToBlocks(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  const blocks = [];

  const collectRuns = node => {
    const runs = [];
    const walk = (n, bold, italic) => {
      if (n.nodeType === 3) { // text node
        if (n.textContent) runs.push({ text: n.textContent, bold, italic });
        return;
      }
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      if (tag === 'br') { runs.push({ text: '\n', bold, italic }); return; }
      const nextBold = bold || tag === 'strong' || tag === 'b';
      const nextItalic = italic || tag === 'em' || tag === 'i';
      n.childNodes.forEach(child => walk(child, nextBold, nextItalic));
    };
    node.childNodes.forEach(child => walk(child, false, false));
    return runs;
  };

  const blockTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'blockquote']);
  const top = doc.body ? Array.from(doc.body.children) : [];

  const pushBlock = (type, el) => {
    const runs = collectRuns(el);
    if (runs.some(run => run.text.trim())) blocks.push({ type, runs });
  };

  top.forEach(el => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'ul' || tag === 'ol') {
      Array.from(el.children).filter(child => child.tagName.toLowerCase() === 'li')
        .forEach(li => pushBlock('li', li));
    } else if (blockTags.has(tag)) {
      pushBlock(tag, el);
    }
  });

  return blocks;
}

export async function docxToBlocks(arrayBuffer) {
  const mammothModule = await import('mammoth/mammoth.browser');
  const mammoth = mammothModule.default || mammothModule;
  const { value } = await mammoth.convertToHtml({ arrayBuffer });
  return htmlToBlocks(value);
}

// ─── blocks → PDF ─────────────────────────────────────────────────────────

function fontFor(fonts, bold, italic) {
  if (bold && italic) return fonts.boldItalic;
  if (bold) return fonts.bold;
  if (italic) return fonts.italic;
  return fonts.regular;
}

// Wraps a run of mixed-style words into lines, measuring each word with its
// own run's font so bold/italic segments wrap correctly inline.
function wrapRuns(runs, fonts, size, maxWidth) {
  const words = [];
  runs.forEach(run => {
    String(run.text).split(/\s+/).filter(Boolean).forEach(text => {
      words.push({ text, bold: run.bold, italic: run.italic });
    });
  });
  if (!words.length) return [];

  const lines = [];
  let current = [];
  let currentWidth = 0;
  const spaceWidth = fonts.regular.widthOfTextAtSize(' ', size);

  words.forEach(word => {
    const font = fontFor(fonts, word.bold, word.italic);
    const wordWidth = font.widthOfTextAtSize(word.text, size);
    const extra = current.length ? spaceWidth : 0;
    if (current.length && currentWidth + extra + wordWidth > maxWidth) {
      lines.push(current);
      current = [word];
      currentWidth = wordWidth;
    } else {
      current.push(word);
      currentWidth += extra + wordWidth;
    }
  });
  if (current.length) lines.push(current);
  return lines;
}

export async function blocksToPdf(blocks, title) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdf.embedFont(StandardFonts.HelveticaBoldOblique),
  };
  const usableWidth = PAGE_WIDTH - MARGIN * 2;

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const ensure = needed => {
    if (y - needed < MARGIN) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  if (title) {
    ensure(30);
    page.drawText(title, { x: MARGIN, y, size: 20, font: fonts.bold, color: rgb(0.04, 0.09, 0.24) });
    y -= 30;
  }

  const drawLine = (words, x, size, lineHeight) => {
    let cursorX = x;
    const spaceWidth = fonts.regular.widthOfTextAtSize(' ', size);
    words.forEach((word, index) => {
      const font = fontFor(fonts, word.bold, word.italic);
      page.drawText(word.text, { x: cursorX, y, size, font, color: rgb(0.1, 0.13, 0.28) });
      cursorX += font.widthOfTextAtSize(word.text, size) + (index < words.length - 1 ? spaceWidth : 0);
    });
    y -= lineHeight;
  };

  blocks.forEach(block => {
    const isHeading = HEADING_SIZES[block.type] !== undefined;
    const size = isHeading ? HEADING_SIZES[block.type] : 11.5;
    const lineHeight = size * 1.35;
    const indent = block.type === 'li' ? 16 : 0;
    const maxWidth = usableWidth - indent;
    const runs = isHeading ? block.runs.map(run => ({ ...run, bold: true })) : block.runs;

    const lines = wrapRuns(runs, fonts, size, maxWidth) || [];
    if (!lines.length) return;

    lines.forEach((words, index) => {
      ensure(lineHeight);
      const x = MARGIN + indent;
      if (block.type === 'li' && index === 0) {
        page.drawText('•', { x: MARGIN + 4, y, size, font: fonts.regular, color: rgb(0.1, 0.13, 0.28) });
      }
      drawLine(words, x, size, lineHeight);
    });
    y -= isHeading ? 6 : 4;
  });

  return pdf.save();
}

// ─── PDF → lines ────────────────────────────────────────────────────────

export async function pdfToLines(arrayBuffer) {
  // Uses the "legacy" build (text extraction only, no canvas rendering here)
  // since it doesn't depend on browser-only APIs like DOMMatrix at import
  // time, which keeps this working in both real browsers and test environments.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // Under Vite this needs to be a fetchable asset URL; under vitest/Node (no
  // real Worker, no dev server) pdfjs falls back to directly import()-ing
  // workerSrc, which only works with a plain resolvable module specifier.
  const isTestEnv = typeof process !== 'undefined' && !!process.env.VITEST;
  pdfjs.GlobalWorkerOptions.workerSrc = isTestEnv
    ? 'pdfjs-dist/legacy/build/pdf.worker.min.mjs'
    : (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
  const document = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  const pages = [];
  for (let number = 1; number <= document.numPages; number += 1) {
    const page = await document.getPage(number);
    const content = await page.getTextContent();
    const rows = [];
    content.items.forEach(item => {
      const y = Math.round(item.transform[5]);
      let row = rows.find(candidate => Math.abs(candidate.y - y) <= 2);
      if (!row) { row = { y, parts: [] }; rows.push(row); }
      row.parts.push({ x: item.transform[4], text: item.str });
    });
    rows.sort((a, b) => b.y - a.y);
    const lines = rows
      .map(row => row.parts.sort((a, b) => a.x - b.x).map(part => part.text).join(' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    pages.push({ lines });
  }
  return { pages };
}

// ─── lines → .docx ─────────────────────────────────────────────────────

export async function linesToDocx(pages, title) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

  const children = [];
  if (title) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: title, bold: true })] }));
  }

  pages.forEach((page, pageIndex) => {
    const lines = page.lines.length ? page.lines : [''];
    lines.forEach((line, lineIndex) => {
      children.push(new Paragraph({
        pageBreakBefore: pageIndex > 0 && lineIndex === 0,
        children: [new TextRun(line)],
      }));
    });
  });

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}

export function downloadFile(filename, data, mime) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
  a.click();
  URL.revokeObjectURL(a.href);
}
