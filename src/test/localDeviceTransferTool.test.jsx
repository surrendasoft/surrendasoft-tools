import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LocalDeviceTransferTool, { SignalScanner } from '../tools/LocalDeviceTransferTool.jsx';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

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

  it('attaches the camera stream after the scanner video mounts', async () => {
    const user = userEvent.setup();
    const stopTrack = vi.fn();
    const stream = { getTracks: () => [{ stop: stopTrack }] };
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    const originalMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();

    render(<SignalScanner onSignal={vi.fn()}/>);
    await user.click(screen.getByRole('button', { name: 'Scan return QR' }));
    const video = await screen.findByLabelText('Return QR scanner camera');
    await waitFor(() => expect(video.srcObject).toBe(stream));
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false }));
    expect(play).toHaveBeenCalled();

    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: originalMediaDevices });
  });
});
