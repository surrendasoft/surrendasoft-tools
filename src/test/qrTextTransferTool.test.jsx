import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QrTextTransferTool from '../tools/QrTextTransferTool.jsx';
import { buildFileTransfer, encodeTransferText } from '../utils/qrTextTransfer.js';

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('AC-TEXTQR browser-only transfer workflow', () => {
  it('generates a transfer QR from text and offers copy/download actions', async () => {
    const user = userEvent.setup();
    render(<QrTextTransferTool />);
    await user.type(screen.getByLabelText('Text to transfer'), 'Hello from the laptop');
    await user.click(screen.getByRole('button', { name: /Generate transfer QR/ }));

    expect(screen.getByLabelText('Generated transfer QR')).toBeInTheDocument();
    expect(screen.getByText(/nothing is uploaded/i)).toBeInTheDocument();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    await user.click(screen.getByRole('button', { name: 'Copy text' }));
    expect(writeText).toHaveBeenCalledWith('Hello from the laptop');
  });

  it('opens an encoded receive route and copies the decoded text', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/#textqr/receive/${encodeTransferText('Phone → laptop note')}`);
    render(<QrTextTransferTool />);

    expect(screen.getByRole('heading', { name: 'Text transferred' })).toBeInTheDocument();
    expect(screen.getByText('Phone → laptop note')).toBeInTheDocument();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    await user.click(screen.getByRole('button', { name: 'Copy text' }));
    expect(writeText).toHaveBeenCalledWith('Phone → laptop note');
  });

  it('switches to the camera/image scanner without creating a room', async () => {
    const user = userEvent.setup();
    render(<QrTextTransferTool />);
    await user.click(screen.getByRole('button', { name: /Scan QR/ }));
    expect(screen.getByRole('button', { name: /Start camera scanner/ })).toBeInTheDocument();
    expect(screen.getByText(/phone → laptop/i)).toBeInTheDocument();
  });

  it('creates a QR containing a tiny file', async () => {
    const user = userEvent.setup();
    render(<QrTextTransferTool />);
    await user.click(screen.getByRole('button', { name: 'Tiny file' }));
    const contents = new TextEncoder().encode('Small browser-only transfer');
    const file = new File([contents], 'note.txt', { type: 'text/plain' });
    file.arrayBuffer = async () => contents.buffer;
    await user.upload(screen.getByLabelText(/Choose a tiny file/i), file);
    await user.click(screen.getByRole('button', { name: 'Create file QR' }));

    expect(await screen.findByLabelText('Generated file transfer QR')).toBeInTheDocument();
    expect(screen.getByText(/complete file and its metadata are inside/i)).toBeInTheDocument();
  });

  it('auto-condenses an image and shows original versus QR previews', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 1200, height: 800, close: vi.fn() }));
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback, type) => callback(new Blob([new Uint8Array(900)], { type })));
    const arrayBufferDescriptor = Object.getOwnPropertyDescriptor(File.prototype, 'arrayBuffer');
    Object.defineProperty(File.prototype, 'arrayBuffer', { configurable: true, value: async function arrayBuffer() { return new Uint8Array(this.size).buffer; } });
    render(<QrTextTransferTool />);
    await user.click(screen.getByRole('button', { name: 'Tiny file' }));
    const image = new File([new Uint8Array(80 * 1024)], 'large-photo.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText('Choose a tiny file or image'), image);

    expect(screen.getByAltText('Original selected preview')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Auto-condense & create QR' }));
    expect(await screen.findByAltText('Condensed QR image preview')).toBeInTheDocument();
    expect(screen.getAllByAltText('Original selected preview')).toHaveLength(1);
    expect(screen.getByText('QR version being sent')).toBeInTheDocument();
    expect(screen.getByText(/This QR version is what will be sent/i)).toBeInTheDocument();

    toBlob.mockRestore();
    vi.unstubAllGlobals();
    if (arrayBufferDescriptor) Object.defineProperty(File.prototype, 'arrayBuffer', arrayBufferDescriptor);
    else delete File.prototype.arrayBuffer;
  });

  it('reconstructs a tiny file from its receive route', async () => {
    const contents = new TextEncoder().encode('Recovered entirely from the QR URL');
    const file = { name: 'recovered.txt', type: 'text/plain', size: contents.length, arrayBuffer: async () => contents.buffer };
    const transfer = await buildFileTransfer(file, window.location);
    window.history.replaceState(null, '', new URL(transfer.url).hash);
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:received-file');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    render(<QrTextTransferTool />);

    expect(await screen.findByRole('heading', { name: 'File reconstructed' })).toBeInTheDocument();
    expect(screen.getByText('recovered.txt')).toBeInTheDocument();
    expect(screen.getByText('Recovered entirely from the QR URL')).toBeInTheDocument();
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });

  it('previews a reconstructed QR image in the receiving browser', async () => {
    const bytes = new Uint8Array(320);
    const file = { name: 'picture-qr.webp', type: 'image/webp', size: bytes.length, arrayBuffer: async () => bytes.buffer };
    const transfer = await buildFileTransfer(file, window.location);
    window.history.replaceState(null, '', new URL(transfer.url).hash);
    render(<QrTextTransferTool />);

    expect(await screen.findByAltText('picture-qr.webp')).toBeInTheDocument();
    expect(screen.getByText('This is the condensed QR version.')).toBeInTheDocument();
  });
});
