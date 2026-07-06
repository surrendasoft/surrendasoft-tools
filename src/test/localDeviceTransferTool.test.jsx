import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import jsQR from 'jsqr';
import LocalDeviceTransferTool, { SignalScanner, SingleConnectionQr } from '../tools/LocalDeviceTransferTool.jsx';
import { isMobilePairingDevice, splitIntoQrChunks } from '../utils/localTransfer.js';

vi.mock('jsqr', () => ({ default: vi.fn() }));

const originalInnerWidth = window.innerWidth;
const originalUserAgent = navigator.userAgent;

function mockViewport({ width = 1024, coarse = false, mobileUa = false } = {}) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: mobileUa ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' });
  window.matchMedia.mockImplementation(query => ({
    matches: query === '(pointer: coarse)' ? coarse : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: originalUserAgent });
  window.matchMedia.mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

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
  beforeEach(() => mockViewport());

  it('explains the private two-QR fallback and never asks for cloud storage', () => {
    render(<LocalDeviceTransferTool />);
    expect(screen.getByText('Direct browser-to-browser transfer')).toBeInTheDocument();
    expect(screen.getByText(/No account, cloud file storage/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start connection/i })).toBeInTheDocument();
    expect(screen.getByText(/not uploaded or stored by SurrendaSoft/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open camera to scan' })).not.toBeInTheDocument();
  });

  it('shows mobile QR scanning on narrow touch devices', () => {
    mockViewport({ width: 390, coarse: true, mobileUa: true });
    render(<LocalDeviceTransferTool />);
    expect(screen.getByRole('button', { name: /Show QR code/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open camera to scan' })).toBeInTheDocument();
    expect(screen.getByText(/Point at the single QR on the other phone/i)).toBeInTheDocument();
  });

  it('shows a friendly compatibility error when WebRTC is unavailable', async () => {
    vi.stubGlobal('RTCPeerConnection', undefined);
    const user = userEvent.setup();
    render(<LocalDeviceTransferTool />);
    await user.click(screen.getByRole('button', { name: /Start connection/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/WebRTC is not available/i);
  });

  it('attaches the camera stream after the scanner video mounts', async () => {
    const user = userEvent.setup();
    const stopTrack = vi.fn();
    const stream = { getTracks: () => [{ stop: stopTrack }] };
    const getUserMedia = vi.fn().mockResolvedValue(stream);
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
  });

  it('reads a single full connection QR in one scan', async () => {
    const encoded = `sslt1.1.${'ABCDEFGHJKMNPQRSTVWXYZ0123456789'.repeat(4)}`;
    const onSignal = vi.fn();
    const { flushFrame } = await startMockedScanner(onSignal, { scanLabel: 'Open camera to scan', videoLabel: 'Pairing QR scanner camera' });
    jsQR.mockReturnValueOnce({ data: encoded, location: { topLeftCorner: { x: 0, y: 0 }, topRightCorner: { x: 10, y: 0 }, bottomLeftCorner: { x: 0, y: 10 }, bottomRightCorner: { x: 10, y: 10 } } });
    flushFrame();
    await waitFor(() => expect(onSignal).toHaveBeenCalledWith(encoded));
  });

  it('still reassembles legacy chunked QR sequences', async () => {
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

  it('renders a single mobile connection QR for a typical payload', () => {
    const encoded = `sslt1.1.${'ABCDEFGHJKMNPQRSTVWXYZ0123456789'.repeat(6)}`;
    render(<SingleConnectionQr value={encoded} peer={null} roleLabel="Test QR"/>);
    expect(screen.getByText(/One QR — hold the other phone steady/i)).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Show part 2' })).not.toBeInTheDocument();
  });

  it('detects mobile pairing devices from viewport and pointer hints', () => {
    mockViewport({ width: 390, coarse: true, mobileUa: true });
    expect(isMobilePairingDevice()).toBe(true);
    mockViewport({ width: 1280, coarse: false });
    expect(isMobilePairingDevice()).toBe(false);
  });
});
