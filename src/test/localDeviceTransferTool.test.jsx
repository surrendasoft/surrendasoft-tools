import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LocalDeviceTransferTool from '../tools/LocalDeviceTransferTool.jsx';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('AC-LOCALTRANSFER local device transfer UI', () => {
  it('explains the private two-QR fallback and never asks for cloud storage', () => {
    render(<LocalDeviceTransferTool />);
    expect(screen.getByText('Direct browser-to-browser transfer')).toBeInTheDocument();
    expect(screen.getByText(/No account, cloud file storage/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create pairing QR/i })).toBeInTheDocument();
    expect(screen.getByText(/not uploaded or stored by SurrendaSoft/i)).toBeInTheDocument();
  });

  it('shows a friendly compatibility error when WebRTC is unavailable', async () => {
    vi.stubGlobal('RTCPeerConnection', undefined);
    const user = userEvent.setup();
    render(<LocalDeviceTransferTool />);
    await user.click(screen.getByRole('button', { name: /Create pairing QR/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/WebRTC is not available/i);
  });
});
