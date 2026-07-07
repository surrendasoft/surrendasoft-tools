import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SignPdfTool from '../tools/SignPdfTool.jsx';

vi.mock('../utils/pdfjs.js', () => ({
  openPdfDocument: vi.fn(async () => ({
    pdfjs: {},
    doc: {
      numPages: 1,
      getPage: () => Promise.resolve({
        getViewport: () => ({ width: 612, height: 792 }),
        render: () => ({ promise: Promise.resolve() }),
      }),
    },
  })),
}));

afterEach(() => cleanup());

async function makePdfFile() {
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  const bytes = await pdf.save();
  return new File([bytes], 'form.pdf', { type: 'application/pdf' });
}

describe('SignPdfTool', () => {
  it('renders the drop zone', () => {
    const { container } = render(<SignPdfTool />);
    expect(container.querySelector('.pdf-drop')).toBeInTheDocument();
    expect(screen.getByText(/Choose a PDF to fill and sign/i)).toBeInTheDocument();
  });

  it('loads a PDF and shows fill and sign controls', async () => {
    const user = userEvent.setup();
    render(<SignPdfTool />);
    await user.upload(screen.getByLabelText(/Choose a PDF to fill and sign/i), await makePdfFile());

    await waitFor(() => expect(screen.getByRole('tab', { name: /Add text/i })).toBeInTheDocument());
    expect(screen.getByRole('tab', { name: /Signature/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download completed PDF/i })).toBeInTheDocument();
  });

  it('requires text or a signature before download', async () => {
    const user = userEvent.setup();
    render(<SignPdfTool />);
    await user.upload(screen.getByLabelText(/Choose a PDF to fill and sign/i), await makePdfFile());
    await waitFor(() => expect(screen.getByRole('button', { name: /Download completed PDF/i })).toBeEnabled());

    await user.click(screen.getByRole('button', { name: /Download completed PDF/i }));
    expect(await screen.findByText(/Add some text or a signature first/i)).toBeInTheDocument();
  });
});
