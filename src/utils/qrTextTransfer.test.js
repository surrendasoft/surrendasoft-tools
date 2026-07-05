import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildFileTransfer, buildTransferUrl, condenseImageForQr, decodeTransferText, encodeTransferText, isFileTransferRoute, isSafeWebLink, QR_FILE_SOURCE_LIMIT, QR_IMAGE_SOURCE_LIMIT, QR_TEXT_HARD_LIMIT, QR_TEXT_SOFT_LIMIT, readFileTransfer, readTransferPayload, validateTinyFile, validateTransferSource, validateTransferText } from './qrTextTransfer.js';

afterEach(() => vi.restoreAllMocks());

describe('QR Text Transfer encoding and limits', () => {
  it('round-trips Unicode, punctuation, and line breaks', () => {
    const text = 'Hello 👋\nSydney café — 100% ready?';
    expect(decodeTransferText(encodeTransferText(text))).toBe(text);
  });

  it('builds a same-site hash URL that can be decoded without a backend', () => {
    const url = buildTransferUrl('Hello world', { origin: 'https://tools.example', pathname: '/app/' });
    expect(url).toMatch(/^https:\/\/tools\.example\/app\/#textqr\/receive\//);
    expect(readTransferPayload(url)).toBe('Hello world');
    expect(readTransferPayload(new URL(url).hash)).toBe('Hello world');
  });

  it('warns for dense QR text and blocks the hard maximum', () => {
    expect(validateTransferText('')).toMatchObject({ valid: false });
    expect(validateTransferText('a'.repeat(QR_TEXT_SOFT_LIMIT + 1))).toMatchObject({ valid: true, warning: expect.any(String) });
    expect(validateTransferText('a'.repeat(QR_TEXT_HARD_LIMIT + 1))).toMatchObject({ valid: false, error: expect.any(String) });
  });

  it('only recognises HTTP and HTTPS links as openable', () => {
    expect(isSafeWebLink('https://surrendasoft.com')).toBe(true);
    expect(isSafeWebLink('javascript:alert(1)')).toBe(false);
    expect(isSafeWebLink('Just a note')).toBe(false);
  });
});

describe('QR tiny-file transfer', () => {
  it('packs and reconstructs a tiny text file without a backend', async () => {
    const original = new TextEncoder().encode('Session 1: Monday\nSession 2: Wednesday\n'.repeat(8));
    const file = { name: 'schedule.txt', type: 'text/plain', size: original.length, arrayBuffer: async () => original.buffer };
    const transfer = await buildFileTransfer(file, { origin: 'https://tools.example', pathname: '/app/' });
    const received = await readFileTransfer(transfer.url);

    expect(isFileTransferRoute(transfer.url)).toBe(true);
    expect(transfer.url.length).toBeLessThanOrEqual(1900);
    expect(received.name).toBe('schedule.txt');
    expect(received.mimeType).toBe('text/plain');
    expect(new TextDecoder().decode(received.bytes)).toBe(new TextDecoder().decode(original));
  });

  it('blocks unsafe executable extensions and oversized source files', () => {
    expect(validateTinyFile({ name: 'installer.exe', size: 10 })).toMatchObject({ valid: false });
    expect(validateTinyFile({ name: 'notes.txt', size: QR_FILE_SOURCE_LIMIT + 1 })).toMatchObject({ valid: false });
  });

  it('allows a large image source for local condensation but limits it to 15 MB', () => {
    expect(validateTransferSource({ name: 'photo.jpg', type: 'image/jpeg', size: 3 * 1024 * 1024 })).toMatchObject({ valid: true });
    expect(validateTransferSource({ name: 'photo.jpg', type: 'image/jpeg', size: QR_IMAGE_SOURCE_LIMIT + 1 })).toMatchObject({ valid: false });
    expect(validateTransferSource({ name: 'drawing.svg', type: 'image/svg+xml', size: 2000 })).toMatchObject({ valid: false });
  });

  it('resizes and recompresses an image into a QR-sized browser file', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 800, height: 400, close: vi.fn() }));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() });
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback, type) => callback(new Blob([new Uint8Array(900)], { type })));
    const image = new File([new Uint8Array(5000)], 'holiday.jpg', { type: 'image/jpeg' });
    const condensed = await condenseImageForQr(image);

    expect(condensed.file.name).toBe('holiday-qr.webp');
    expect(condensed.file.size).toBe(900);
    expect(condensed.width).toBe(128);
    expect(condensed.height).toBe(64);
  });
});
