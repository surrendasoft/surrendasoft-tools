import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SignPdfTool from '../tools/SignPdfTool.jsx';

const renderMock = vi.fn(() => ({ promise: Promise.resolve() }));

vi.mock('../utils/pdfjs.js', () => ({
  openPdfDocument: vi.fn(async () => ({
    pdfjs: {},
    doc: {
      numPages: 1,
      getPage: () => Promise.resolve({
        getViewport: ({ scale }) => ({ width: 612 * scale, height: 792 * scale }),
        render: (...args) => renderMock(...args),
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

function dragBox(stage, from, to) {
  fireEvent.pointerDown(stage, { clientX: from.x, clientY: from.y, pointerId: 1, button: 0 });
  fireEvent.pointerMove(stage, { clientX: to.x, clientY: to.y, pointerId: 1, button: 0 });
  fireEvent.pointerUp(stage, { clientX: to.x, clientY: to.y, pointerId: 1, button: 0 });
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

  it('creates a text box when the user drags on the page', async () => {
    const user = userEvent.setup();
    const { container } = render(<SignPdfTool />);
    await user.upload(screen.getByLabelText(/Choose a PDF to fill and sign/i), await makePdfFile());
    await waitFor(() => expect(container.querySelector('.sign-stage')).toBeInTheDocument());

    const stage = container.querySelector('.sign-stage');
    stage.getBoundingClientRect = () => ({ left: 0, top: 0, width: 612, height: 792, right: 612, bottom: 792 });
    dragBox(stage, { x: 80, y: 120 }, { x: 280, y: 160 });

    await waitFor(() => expect(container.querySelector('.sign-text-box')).toBeInTheDocument());
    expect(container.querySelector('.sign-text-box-input')).toBeInTheDocument();
  });

  it('re-renders the PDF when zoom changes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SignPdfTool />);
    await user.upload(screen.getByLabelText(/Choose a PDF to fill and sign/i), await makePdfFile());
    await waitFor(() => expect(renderMock).toHaveBeenCalled());
    const initialCalls = renderMock.mock.calls.length;

    await user.click(screen.getByLabelText(/Zoom in/i));
    vi.advanceTimersByTime(200);
    await waitFor(() => expect(renderMock.mock.calls.length).toBeGreaterThan(initialCalls));
    vi.useRealTimers();
  });
});
