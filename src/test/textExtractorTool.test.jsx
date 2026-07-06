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

vi.mock('pdfjs-dist', () => ({
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

  it('extracts and displays text from a plain text file', async () => {
    const user = userEvent.setup();
    render(<TextExtractorTool />);
    const file = makeFile('notes.txt', 'text/plain', 'Hello from a text file');

    await user.upload(screen.getByLabelText(/Drop images, PDFs, Word docs, or text files/), file);

    expect(await screen.findByText('Done')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View text' }));
    expect(screen.getByRole('textbox')).toHaveValue('Hello from a text file');
  });

  it('extracts text from a Word document', async () => {
    const user = userEvent.setup();
    render(<TextExtractorTool />);
    const file = await makeDocxFile('letter.docx', 'Extracted from a docx');

    await user.upload(screen.getByLabelText(/Drop images, PDFs, Word docs, or text files/), file);

    expect(await screen.findByText('Done')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View text' }));
    expect(screen.getByRole('textbox').value).toContain('Extracted from a docx');
  });

  it('runs OCR on an image file and displays the recognised text', async () => {
    const user = userEvent.setup();
    render(<TextExtractorTool />);
    const file = makeFile('photo.png', 'image/png');

    await user.upload(screen.getByLabelText(/Drop images, PDFs, Word docs, or text files/), file);

    expect(await screen.findByText('Done')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View text' }));
    expect(screen.getByRole('textbox')).toHaveValue('OCR extracted text');
  });

  it('reads a PDF text layer directly and falls back to OCR for pages without one', async () => {
    const user = userEvent.setup();
    render(<TextExtractorTool />);
    const file = makeFile('scan.pdf', 'application/pdf');

    await user.upload(screen.getByLabelText(/Drop images, PDFs, Word docs, or text files/), file);

    expect(await screen.findByText('Done')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View text' }));
    const combined = screen.getByRole('textbox').value;
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

    expect(await screen.findByText('Failed')).toBeInTheDocument();
    expect(screen.getByText(/isn't supported/)).toBeInTheDocument();
  });

  it('offers copy and download actions once a file is done', async () => {
    const user = userEvent.setup();
    render(<TextExtractorTool />);
    const file = makeFile('notes.txt', 'text/plain', 'Copy me');

    await user.upload(screen.getByLabelText(/Drop images, PDFs, Word docs, or text files/), file);

    expect(await screen.findByText('Done')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download .txt' })).toBeInTheDocument();
  });

  it('processes multiple queued files one after another', async () => {
    const user = userEvent.setup();
    render(<TextExtractorTool />);
    const fileA = makeFile('a.txt', 'text/plain', 'First file');
    const fileB = makeFile('b.txt', 'text/plain', 'Second file');

    await user.upload(screen.getByLabelText(/Drop images, PDFs, Word docs, or text files/), [fileA, fileB]);

    await waitFor(() => expect(screen.getAllByText('Done')).toHaveLength(2));
    expect(screen.getByRole('button', { name: 'Copy all text' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download combined .txt' })).toBeInTheDocument();
  });

  it('discloses that OCR downloads its engine from a CDN', () => {
    render(<TextExtractorTool />);
    expect(screen.getByText(/tesseract\.js/)).toBeInTheDocument();
  });
});
