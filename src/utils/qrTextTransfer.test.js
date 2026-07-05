import { describe, expect, it } from 'vitest';
import { buildTransferUrl, decodeTransferText, encodeTransferText, isSafeWebLink, QR_TEXT_HARD_LIMIT, QR_TEXT_SOFT_LIMIT, readTransferPayload, validateTransferText } from './qrTextTransfer.js';

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
