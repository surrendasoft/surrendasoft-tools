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
});
