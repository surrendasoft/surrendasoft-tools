import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TextExtractorTool from '../tools/TextExtractorTool.jsx';

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(async (lang, oem, options = {}) => ({
    recognize: vi.fn(async () => {
      options.logger?.({ status: 'recognizing text', progress: 0.5 });
      options.logger?.({ status: 'recognizing text', progress: 1 });
      return { data: { text: 'OCR extracted text' } };
    }),
    terminate: vi.fn(async () => {}),
  })),
}));

vi.mock('../utils/pdfjs.js', () => ({
  loadPdfJs: vi.fn(async () => ({
    GlobalWorkerOptions: {},
    getDocument: vi.fn(() => ({
      promise: Promise.resolve({
        numPages: 2,
        getPage: number => Promise.resolve({
          getTextContent: () => Promise.resolve({ items: number === 1 ? [{ str: 'Real text layer content' }] : [] }),
          getViewport: () => ({ width: 20, height: 20 }),
          render: () => ({ promise: Promise.resolve() }),
        }),
      }),
    })),
  })),
}));

afterEach(() => cleanup());

function makeFile(name, type, content = 'sample content') {
  const file = new File([content], name, { type });
  file.arrayBuffer = async () => new TextEncoder().encode(content).buffer;
  file.text = async () => content;
  return file;
}

async function makeDocxFile(name = 'sample.docx', text = 'Hello from a Word document') {
  const { Document, Packer, Paragraph, TextRun } = await import('docx');
  const doc = new Document({ sections: [{ children: [new Paragraph({ children: [new TextRun(text)] })] }] });
  const blob = await Packer.toBlob(doc);
  const buffer = await blob.arrayBuffer();
  const file = new File([buffer], name, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  file.arrayBuffer = async () => buffer;
  return file;
}

describe('TextExtractorTool', () => {
  it('renders the drop zone', () => {
    const { container } = render(<TextExtractorTool />);
    expect(container.querySelector('.txtx-root')).toBeInTheDocument();
    expect(screen.getByLabelText(/Drop images, PDFs, Word docs, or text files/)).toBeInTheDocument();
  });

  it('extracts and displays text from a plain text file without extra clicks', async () => {
    const user = userEvent.setup();
    render(<TextExtractorTool />);
    const file = makeFile('notes.txt', 'text/plain', 'Hello from a text file');

    await user.upload(screen.getByLabelText(/Drop images, PDFs, Word docs, or text files/), file);

    expect(await screen.findByDisplayValue('Hello from a text file')).toBeInTheDocument();
  });

  it('extracts text from a Word document', async () => {
    const user = userEvent.setup();
    render(<TextExtractorTool />);
    const file = await makeDocxFile('letter.docx', 'Extracted from a docx');

    await user.upload(screen.getByLabelText(/Drop images, PDFs, Word docs, or text files/), file);

    expect(await screen.findByDisplayValue(/Extracted from a docx/)).toBeInTheDocument();
  });

  it('runs OCR on an image file and displays the recognised text', async () => {
    const user = userEvent.setup();
    render(<TextExtractorTool />);
    const file = makeFile('photo.png', 'image/png');

    await user.upload(screen.getByLabelText(/Drop images, PDFs, Word docs, or text files/), file);

    expect(await screen.findByDisplayValue('OCR extracted text')).toBeInTheDocument();
  });

  it('reads a PDF text layer directly and falls back to OCR for pages without one', async () => {
    const user = userEvent.setup();
    render(<TextExtractorTool />);
    const file = makeFile('scan.pdf', 'application/pdf');

    await user.upload(screen.getByLabelText(/Drop images, PDFs, Word docs, or text files/), file);

    const combined = (await screen.findByDisplayValue(/Real text layer content/)).value;
    expect(combined).toContain('Real text layer content');
    expect(combined).toContain('OCR extracted text');
    expect(combined).toContain('--- Page 1 ---');
    expect(combined).toContain('--- Page 2 ---');
  });

  it('rejects an unsupported file type with a clear message', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<TextExtractorTool />);
    const file = makeFile('archive.zip', 'application/zip');

    await user.upload(screen.getByLabelText(/Drop images, PDFs, Word docs, or text files/), file);

    expect(await screen.findByText(/isn't supported/)).toBeInTheDocument();
  });

  it('offers copy and download actions once a file is done', async () => {
    const user = userEvent.setup();
    render(<TextExtractorTool />);
    const file = makeFile('notes.txt', 'text/plain', 'Copy me');

    await user.upload(screen.getByLabelText(/Drop images, PDFs, Word docs, or text files/), file);

    await screen.findByDisplayValue('Copy me');
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download .txt' })).toBeInTheDocument();
  });

  it('processes multiple queued files one after another', async () => {
    const user = userEvent.setup();
    render(<TextExtractorTool />);
    const fileA = makeFile('a.txt', 'text/plain', 'First file');
    const fileB = makeFile('b.txt', 'text/plain', 'Second file');

    await user.upload(screen.getByLabelText(/Drop images, PDFs, Word docs, or text files/), [fileA, fileB]);

    await waitFor(() => expect(screen.getByDisplayValue('Second file')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Copy all text' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download combined .txt' })).toBeInTheDocument();
  });

  it('switches extracted text when selecting another finished file', async () => {
    const user = userEvent.setup();
    render(<TextExtractorTool />);
    const fileA = makeFile('a.txt', 'text/plain', 'First file');
    const fileB = makeFile('b.txt', 'text/plain', 'Second file');

    await user.upload(screen.getByLabelText(/Drop images, PDFs, Word docs, or text files/), [fileA, fileB]);
    await waitFor(() => expect(screen.getByDisplayValue('Second file')).toBeInTheDocument());

    await user.click(screen.getByRole('tab', { name: /a\.txt/i }));
    expect(screen.getByDisplayValue('First file')).toBeInTheDocument();
  });

  it('discloses that OCR downloads its engine from a CDN', () => {
    render(<TextExtractorTool />);
    expect(screen.getByText(/tesseract\.js/)).toBeInTheDocument();
  });
});
