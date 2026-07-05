import { describe, expect, it } from 'vitest';
import {
  connectionCode, decodeLocalSignal, encodeLocalSignal, extractLocalSignal,
  LOCAL_TRANSFER_FILE_LIMIT, LOCAL_TRANSFER_TEXT_LIMIT, safeFileName,
} from './localTransfer.js';

describe('AC-LOCALTRANSFER WebRTC QR signalling', () => {
  it('round-trips compressed offers and answers', async () => {
    const offer = { type: 'offer', sdp: 'v=0\r\na=candidate:1 1 UDP 123 192.168.0.10 5000 typ host', sessionId: 'same-session' };
    const answer = { type: 'answer', sdp: 'v=0\r\na=candidate:2 1 UDP 456 192.168.0.11 6000 typ host', sessionId: 'same-session' };
    const offerCode = await encodeLocalSignal(offer);
    const answerCode = await encodeLocalSignal(answer);
    expect(await decodeLocalSignal(offerCode)).toMatchObject(offer);
    expect(await decodeLocalSignal(`https://tools.example/#localtransfer/answer/${answerCode}`)).toMatchObject(answer);
    expect(connectionCode(offer)).toBe(connectionCode(answer));
  });

  it('extracts routed signals and rejects invalid connection codes', async () => {
    expect(extractLocalSignal('https://tools.example/#localtransfer/join/sslt1.0.abc')).toBe('sslt1.0.abc');
    await expect(decodeLocalSignal('not-a-connection-code')).rejects.toThrow(/could not be read/i);
  });

  it('defines safe browser transfer limits and filenames', () => {
    expect(LOCAL_TRANSFER_FILE_LIMIT).toBe(100 * 1024 * 1024);
    expect(LOCAL_TRANSFER_TEXT_LIMIT).toBe(100000);
    expect(safeFileName('client:notes?.txt')).toBe('client-notes-.txt');
  });
});
