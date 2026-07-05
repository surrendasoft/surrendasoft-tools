import { describe, expect, it } from 'vitest';
import { buildFileTransfer, buildTransferUrl, decodeTransferText, encodeTransferText, isFileTransferRoute, isSafeWebLink, QR_FILE_SOURCE_LIMIT, QR_TEXT_HARD_LIMIT, QR_TEXT_SOFT_LIMIT, readFileTransfer, readTransferPayload, validateTinyFile, validateTransferText } from './qrTextTransfer.js';

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
});
