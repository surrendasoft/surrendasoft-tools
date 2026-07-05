import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QrTextTransferTool from '../tools/QrTextTransferTool.jsx';
import { encodeTransferText } from '../utils/qrTextTransfer.js';

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
});
