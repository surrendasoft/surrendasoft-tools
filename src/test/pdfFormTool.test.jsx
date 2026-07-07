import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import PdfFormTool from '../tools/PdfFormTool.jsx';
import { createSampleFormPdf } from '../utils/pdfForm.js';

afterEach(() => cleanup());

async function makeSamplePdfFile() {
  const bytes = await createSampleFormPdf();
  return new File([bytes], 'application.pdf', { type: 'application/pdf' });
}

describe('PdfFormTool', () => {
  it('renders the drop zone', () => {
    const { container } = render(<PdfFormTool />);
    expect(container.querySelector('.pdfform-root')).toBeInTheDocument();
    expect(screen.getByLabelText(/Drop a PDF with fillable form fields/)).toBeInTheDocument();
  });

  it('loads form fields from a fillable PDF', async () => {
    const user = userEvent.setup();
    render(<PdfFormTool />);
    await user.upload(screen.getByLabelText(/Drop a PDF with fillable form fields/), await makeSamplePdfFile());

    await waitFor(() => expect(screen.getByText(/Form fields/i)).toBeInTheDocument());
    expect(screen.getByDisplayValue('Alex Example')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download filled PDF/i })).toBeInTheDocument();
  });

  it('rejects non-PDF files', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<PdfFormTool />);
    await user.upload(screen.getByLabelText(/Drop a PDF with fillable form fields/), new File(['x'], 'notes.txt', { type: 'text/plain' }));
    expect(await screen.findByText(/Choose a PDF file/i)).toBeInTheDocument();
  });
});
