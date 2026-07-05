import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PDFDocument } from 'pdf-lib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WordPdfConverterTool from '../tools/WordPdfConverterTool.jsx';

afterEach(() => cleanup());

async function makeDocxFile(name = 'sample.docx') {
  const { Document, Packer, Paragraph, TextRun } = await import('docx');
  const doc = new Document({ sections: [{ children: [new Paragraph({ children: [new TextRun('Hello from a Word document')] })] }] });
  const blob = await Packer.toBlob(doc);
  const buffer = await blob.arrayBuffer();
  const file = new File([buffer], name, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  file.arrayBuffer = async () => buffer;
  return file;
}

async function makePdfFile(name = 'sample.pdf') {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont('Helvetica');
  pdf.addPage([600, 800]).drawText('Hello from a PDF file', { x: 50, y: 750, size: 14, font });
  const bytes = await pdf.save();
  const file = new File([bytes], name, { type: 'application/pdf' });
  file.arrayBuffer = async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return file;
}

describe('WordPdfConverterTool', () => {
  it('defaults to Word → PDF mode and switches the drop zone copy when toggled to PDF → Word', async () => {
    const user = userEvent.setup();
    render(<WordPdfConverterTool />);
    expect(screen.getByRole('button', { name: 'Word → PDF' })).toHaveClass('active');
    expect(screen.getByText(/Choose a Word document/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'PDF → Word' }));
    expect(screen.getByRole('button', { name: 'PDF → Word' })).toHaveClass('active');
    expect(screen.getByText('Choose a PDF')).toBeInTheDocument();
  });

  it('converts a Word document to a downloadable PDF', async () => {
    const user = userEvent.setup();
    render(<WordPdfConverterTool />);
    const file = await makeDocxFile();
    await user.upload(screen.getByLabelText(/Choose a Word document/), file);
    await user.click(screen.getByRole('button', { name: 'Convert to PDF' }));

    expect(await screen.findByText('PDF ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
  });

  it('converts a PDF to a downloadable Word document', async () => {
    const user = userEvent.setup();
    render(<WordPdfConverterTool />);
    await user.click(screen.getByRole('button', { name: 'PDF → Word' }));
    const file = await makePdfFile();
    await user.upload(screen.getByLabelText(/Choose a PDF/), file);
    await user.click(screen.getByRole('button', { name: 'Convert to Word' }));

    expect(await screen.findByText('Word document ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download Word file' })).toBeInTheDocument();
  });

  it('shows an error message instead of crashing for a file that cannot be parsed', async () => {
    const user = userEvent.setup();
    const { container } = render(<WordPdfConverterTool />);
    const badFile = new File([new Uint8Array([1, 2, 3, 4])], 'broken.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    badFile.arrayBuffer = async () => new Uint8Array([1, 2, 3, 4]).buffer;
    await user.upload(screen.getByLabelText(/Choose a Word document/), badFile);
    await user.click(screen.getByRole('button', { name: 'Convert to PDF' }));

    await vi.waitFor(() => expect(container.querySelector('.pdf-error')).toBeInTheDocument());
    expect(container.querySelector('.pdf-result')).not.toBeInTheDocument();
  });

  it('shows the text-only limitation footnote', () => {
    render(<WordPdfConverterTool />);
    expect(screen.getByText(/Images, tables, columns, and exact page layout are not preserved/)).toBeInTheDocument();
  });
});
