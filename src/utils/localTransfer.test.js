import { describe, expect, it } from 'vitest';
import {
  assembleQrChunks, base32ToBytes, bytesToBase32, connectionCode, decodeLocalSignal, decodeQrChunk,
  encodeLocalSignal, encodeQrChunk, extractLocalSignal, LOCAL_TRANSFER_FILE_LIMIT, LOCAL_TRANSFER_TEXT_LIMIT,
  safeFileName, splitIntoQrChunks, trimSdpForSignalling,
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

describe('AC-LOCALTRANSFER animated chunked QR pairing', () => {
  it('trims TCP and IPv6 host candidates from SDP but keeps IPv4 UDP ones', () => {
    const sdp = [
      'v=0',
      'o=- 1 1 IN IP4 0.0.0.0',
      'a=candidate:1 1 udp 2122194687 192.168.0.10 5000 typ host generation 0',
      'a=candidate:2 1 tcp 1518214911 192.168.0.10 9 typ host tcptype active generation 0',
      'a=candidate:3 1 udp 2122129151 fe80::1234:5678:9abc:def0 5001 typ host generation 0',
      'a=candidate:4 1 udp 1685987071 203.0.113.5 5002 typ srflx raddr 192.168.0.10 rport 5000 generation 0',
    ].join('\r\n');
    const trimmed = trimSdpForSignalling(sdp);
    expect(trimmed).toContain('192.168.0.10 5000 typ host');
    expect(trimmed).toContain('203.0.113.5 5002 typ srflx');
    expect(trimmed).not.toContain('tcptype');
    expect(trimmed).not.toContain('fe80::1234:5678:9abc:def0');
  });

  it('never trims away every candidate, even on an IPv6-only network', () => {
    const sdp = 'v=0\r\na=candidate:1 1 udp 2122194687 fe80::1 5000 typ host generation 0';
    expect(trimSdpForSignalling(sdp)).toBe(sdp);
  });

  it('round-trips arbitrary bytes through Crockford Base32', () => {
    const original = new Uint8Array([0, 1, 2, 3, 4, 5, 250, 251, 252, 253, 254, 255, 42, 128]);
    const encoded = bytesToBase32(original);
    expect(encoded).toMatch(/^[0-9A-Z]+$/);
    expect(Array.from(base32ToBytes(encoded))).toEqual(Array.from(original));
  });

  it('round-trips QR chunk framing and rejects malformed input', () => {
    const chunk = encodeQrChunk({ sessionId: 'ABC123', index: 1, total: 3, compressed: '1', data: 'HELLO' });
    expect(decodeQrChunk(chunk)).toEqual({ sessionId: 'ABC123', index: 1, total: 3, compressed: '1', data: 'HELLO' });
    expect(() => decodeQrChunk('not a chunk')).toThrow(/could not be read/i);
    expect(() => decodeQrChunk('sslc1.ABC123.5.3.1.HELLO')).toThrow(/could not be read/i);
  });

  it('splits an encoded signal into QR chunks and reassembles it regardless of arrival order', () => {
    const encoded = 'sslt1.1.' + 'ABCDEFGHJKMNPQRSTVWXYZ0123456789'.repeat(10);
    const chunks = splitIntoQrChunks(encoded, 20);
    expect(chunks.length).toBeGreaterThan(1);
    const parsedChunks = chunks.map(decodeQrChunk);
    const { total, compressed } = parsedChunks[0];
    expect(parsedChunks.every(part => part.total === total && part.compressed === compressed)).toBe(true);

    const shuffled = [...parsedChunks].reverse();
    const map = new Map(shuffled.map(part => [part.index, part.data]));
    // Feeding a duplicate before completion should not disturb the final assembly.
    map.set(parsedChunks[0].index, parsedChunks[0].data);
    expect(assembleQrChunks(map, total, compressed)).toBe(encoded);
  });

  it('refuses to assemble while parts are still missing', () => {
    const chunks = splitIntoQrChunks('sslt1.0.' + 'A'.repeat(50), 20).map(decodeQrChunk);
    const map = new Map([[0, chunks[0].data]]);
    expect(() => assembleQrChunks(map, chunks[0].total, chunks[0].compressed)).toThrow(/missing/i);
  });
});
