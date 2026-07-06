import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import jsQR from 'jsqr';
import LocalDeviceTransferTool, { QrChunkPager, SignalScanner } from '../tools/LocalDeviceTransferTool.jsx';
import { splitIntoQrChunks } from '../utils/localTransfer.js';

vi.mock('jsqr', () => ({ default: vi.fn() }));

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function startMockedScanner(onSignal, options = {}) {
  const scanLabel = options.scanLabel || 'Scan return QR';
  const videoLabel = options.videoLabel || 'Return QR scanner camera';
  const rafQueue = [];
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { rafQueue.push(callback); return rafQueue.length; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const stream = { getTracks: () => [{ stop: vi.fn() }] };
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue(stream) } });

  const user = userEvent.setup();
  render(<SignalScanner onSignal={onSignal} scanLabel={scanLabel} videoLabel={videoLabel}/>);
  await user.click(screen.getByRole('button', { name: scanLabel }));
  const video = await screen.findByLabelText(videoLabel);
  Object.defineProperty(video, 'readyState', { configurable: true, value: 4 });
  Object.defineProperty(video, 'videoWidth', { configurable: true, value: 640 });
  Object.defineProperty(video, 'videoHeight', { configurable: true, value: 480 });
  await waitFor(() => expect(rafQueue.length).toBeGreaterThan(0));

  const flushFrame = () => { const callback = rafQueue.shift(); callback?.(); };
  return { flushFrame, rafQueue };
}

describe('AC-LOCALTRANSFER local device transfer UI', () => {
  it('explains the private two-QR fallback and never asks for cloud storage', () => {
    render(<LocalDeviceTransferTool />);
    expect(screen.getByText('Direct browser-to-browser transfer')).toBeInTheDocument();
    expect(screen.getByText(/No account, cloud file storage/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Show connection QR/i })).toBeInTheDocument();
    expect(screen.getByText(/not uploaded or stored by SurrendaSoft/i)).toBeInTheDocument();
    expect(screen.getByText(/copies a return code back/i)).toBeInTheDocument();
  });

  it('shows a friendly compatibility error when WebRTC is unavailable', async () => {
    vi.stubGlobal('RTCPeerConnection', undefined);
    const user = userEvent.setup();
    render(<LocalDeviceTransferTool />);
    await user.click(screen.getByRole('button', { name: /Show connection QR/i }));
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

  it('reassembles an animated QR sequence from multiple scanned frames and calls onSignal once complete', async () => {
    const encoded = `sslt1.1.${'ABCDEFGHJKMNPQRSTVWXYZ0123456789'.repeat(6)}`;
    const chunkTexts = splitIntoQrChunks(encoded, 25);
    expect(chunkTexts.length).toBeGreaterThan(2);
    const onSignal = vi.fn();
    const { flushFrame } = await startMockedScanner(onSignal);

    chunkTexts.forEach(text => {
      jsQR.mockReturnValueOnce({ data: text, location: { topLeftCorner: { x: 0, y: 0 }, topRightCorner: { x: 10, y: 0 }, bottomLeftCorner: { x: 0, y: 10 }, bottomRightCorner: { x: 10, y: 10 } } });
      flushFrame();
    });

    await waitFor(() => expect(onSignal).toHaveBeenCalledWith(encoded));
  });

  it('shows numbered capture progress before the sequence completes', async () => {
    const encoded = `sslt1.0.${'ABCDEFGHJKMNPQRSTVWXYZ0123456789'.repeat(6)}`;
    const chunkTexts = splitIntoQrChunks(encoded, 25);
    expect(chunkTexts.length).toBeGreaterThan(2);
    const onSignal = vi.fn();
    const { flushFrame } = await startMockedScanner(onSignal);

    jsQR.mockReturnValueOnce({ data: chunkTexts[0], location: { topLeftCorner: { x: 0, y: 0 }, topRightCorner: { x: 10, y: 0 }, bottomLeftCorner: { x: 0, y: 10 }, bottomRightCorner: { x: 10, y: 10 } } });
    flushFrame();

    const progress = await screen.findByRole('status', { name: new RegExp(`Captured 1 of ${chunkTexts.length}`, 'i') });
    expect(progress.querySelectorAll('.ldt-chunk-part.done')).toHaveLength(1);
    expect(screen.getByText(/Still need part/i)).toBeInTheDocument();
    expect(onSignal).not.toHaveBeenCalled();
  });

  it('offers an in-app pairing scanner on the start screen', () => {
    render(<LocalDeviceTransferTool />);
    expect(screen.getByRole('button', { name: 'Open camera to scan' })).toBeInTheDocument();
    expect(screen.getByText(/Point at the connection QR on the other screen/i)).toBeInTheDocument();
  });

  it('lets users jump directly to a numbered QR part in the pager', async () => {
    const encoded = `sslt1.1.${'ABCDEFGHJKMNPQRSTVWXYZ0123456789'.repeat(6)}`;
    const chunks = splitIntoQrChunks(encoded);
    expect(chunks.length).toBeGreaterThan(2);

    const user = userEvent.setup();
    render(<QrChunkPager value={encoded} peer={null} roleLabel="Test QR"/>);

    expect(screen.getByRole('tab', { name: 'Show part 1' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: `Show part ${chunks.length}` }));
    expect(screen.getByRole('tab', { name: `Show part ${chunks.length}` })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(new RegExp(`Part ${chunks.length} of ${chunks.length}`))).toBeInTheDocument();
  });

  it('ignores QR frames that are not valid connection chunks and keeps scanning', async () => {
    const encoded = `sslt1.0.${'ABCDEFGHJKMNPQRSTVWXYZ0123456789'.repeat(3)}`;
    const chunkTexts = splitIntoQrChunks(encoded, 25);
    const onSignal = vi.fn();
    const { flushFrame } = await startMockedScanner(onSignal);

    jsQR.mockReturnValueOnce({ data: 'not-a-valid-chunk', location: { topLeftCorner: { x: 0, y: 0 }, topRightCorner: { x: 10, y: 0 }, bottomLeftCorner: { x: 0, y: 10 }, bottomRightCorner: { x: 10, y: 10 } } });
    flushFrame();
    chunkTexts.forEach(text => {
      jsQR.mockReturnValueOnce({ data: text, location: { topLeftCorner: { x: 0, y: 0 }, topRightCorner: { x: 10, y: 0 }, bottomLeftCorner: { x: 0, y: 10 }, bottomRightCorner: { x: 10, y: 10 } } });
      flushFrame();
    });

    await waitFor(() => expect(onSignal).toHaveBeenCalledWith(encoded));
  });
});
