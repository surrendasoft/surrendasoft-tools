// Uses the real `qrcode` library (not the lightweight mock in test/setup.js) so these
// assertions reflect actual QR module counts, not a stand-in approximation.
import { vi } from 'vitest';
vi.unmock('qrcode');

import { describe, expect, it } from 'vitest';
import { computeQrCanvasSize, QR_MAX_CANVAS_PX, QR_MIN_CANVAS_PX } from './qrSizing.js';

describe('AC-LOCALTRANSFER dynamic QR canvas sizing', () => {
  it('grows the canvas as the payload needs more QR modules', () => {
    const small = computeQrCanvasSize('short-code', 'M');
    const medium = computeQrCanvasSize('A'.repeat(200), 'M');
    const large = computeQrCanvasSize('A'.repeat(800), 'M');
    expect(small).toBeLessThan(medium);
    expect(medium).toBeLessThan(large);
  });

  it('clamps results within the configured min and max canvas size', () => {
    expect(computeQrCanvasSize('x', 'M')).toBeGreaterThanOrEqual(QR_MIN_CANVAS_PX);
    expect(computeQrCanvasSize('A'.repeat(5000), 'L')).toBeLessThanOrEqual(QR_MAX_CANVAS_PX);
  });

  it('sizes a realistic ~800 char trimmed/base32 offer well above the old fixed 340px box', () => {
    const offer = 'sslt1.1.' + 'A0BCDEFGHJKMNPQRSTVWXYZ12345679'.repeat(25);
    const width = computeQrCanvasSize(offer, 'M');
    expect(width).toBeGreaterThan(340);
  });

  it('falls back to the minimum size if QRCode.create cannot encode the input', () => {
    expect(computeQrCanvasSize(null, 'M')).toBe(QR_MIN_CANVAS_PX);
  });
});
