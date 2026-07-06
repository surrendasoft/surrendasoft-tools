import { compressBytes, decompressBytes } from './binaryTransfer.js';

export const LOCAL_TRANSFER_SIGNAL_PREFIX = 'sslt1';
export const LOCAL_TRANSFER_CHUNK_PREFIX = 'sslc1';
export const LOCAL_TRANSFER_FILE_LIMIT = 100 * 1024 * 1024;
export const LOCAL_TRANSFER_TEXT_LIMIT = 100000;
export const LOCAL_TRANSFER_CHUNK_SIZE = 32 * 1024;
export const LOCAL_TRANSFER_QR_CHUNK_CHARS = 90;
// Above this size we fall back to chunked QRs on mobile (rare).
export const LOCAL_TRANSFER_SINGLE_QR_MAX_CHARS = 1200;

export function isMobilePairingDevice() {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  const narrow = window.innerWidth <= 768;
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  return narrow && (coarse || mobileUa);
}

export const createTransferId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

// Crockford's Base32 — uppercase letters + digits only (no I/L/O/U, so it can't be
// confused when read aloud or typed), and safe for QR "alphanumeric" mode, which is
// meaningfully denser-per-module than the "byte" mode base64url forces QR into.
const BASE32_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function bytesToBase32(bytes) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let index = 0; index < bytes.length; index += 1) {
    value = (value << 8) | bytes[index];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32ToBytes(encoded) {
  const clean = String(encoded || '').toUpperCase().replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (let index = 0; index < clean.length; index += 1) {
    const digit = BASE32_ALPHABET.indexOf(clean[index]);
    if (digit === -1) throw new Error('This connection code looks damaged or incomplete.');
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Uint8Array.from(bytes);
}

async function packJsonBase32(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const packed = await compressBytes(bytes);
  return { data: bytesToBase32(packed.bytes), compressed: packed.compressed };
}

async function unpackJsonBase32(data, compressed) {
  const packed = base32ToBytes(data);
  const bytes = compressed ? await decompressBytes(packed) : packed;
  return JSON.parse(new TextDecoder().decode(bytes));
}

// Drops SDP candidate lines that rarely help and just add bulk to the QR payload:
// TCP host candidates (WebRTC only falls back to them when UDP is blocked outright,
// which is uncommon on a home/office LAN) and IPv6 host candidates (kept only if
// removing them would leave zero usable candidates, e.g. an IPv6-only network).
export function trimSdpForSignalling(sdp) {
  const source = String(sdp || '');
  const lines = source.split(/\r\n|\n/);
  const isCandidate = line => line.startsWith('a=candidate');
  const keepCandidate = line => {
    const parts = line.split(' ');
    const transport = (parts[2] || '').toLowerCase();
    const address = parts[4] || '';
    return transport === 'udp' && !address.includes(':');
  };
  const originalCandidates = lines.filter(isCandidate).length;
  const kept = lines.filter(line => !isCandidate(line) || keepCandidate(line));
  const keptCandidates = kept.filter(isCandidate).length;
  if (originalCandidates > 0 && keptCandidates === 0) return source;
  return kept.join('\r\n');
}

export async function encodeLocalSignal(signal) {
  if (!signal || !['offer', 'answer'].includes(signal.type) || !signal.sdp) throw new Error('This connection signal is incomplete.');
  const sdp = trimSdpForSignalling(signal.sdp);
  const packed = await packJsonBase32({ v: 1, type: signal.type, sdp, sessionId: signal.sessionId || '', createdAt: signal.createdAt || new Date().toISOString() });
  return `${LOCAL_TRANSFER_SIGNAL_PREFIX}.${packed.compressed ? '1' : '0'}.${packed.data}`;
}

export function extractLocalSignal(input) {
  let value = String(input || '').trim();
  const route = value.match(/#localtransfer\/(?:join|answer)\/([^\s#]+)/i);
  if (route) value = route[1];
  return value.replace(/\s+/g, '');
}

function parseEncodedSignal(value) {
  const firstDot = value.indexOf('.');
  const secondDot = value.indexOf('.', firstDot + 1);
  if (firstDot < 0 || secondDot < 0) return null;
  const prefix = value.slice(0, firstDot);
  const compressed = value.slice(firstDot + 1, secondDot);
  const data = value.slice(secondDot + 1).toUpperCase();
  if (prefix !== LOCAL_TRANSFER_SIGNAL_PREFIX || !['0', '1'].includes(compressed) || !data) return null;
  return { compressed, data };
}

export async function decodeLocalSignal(input) {
  const value = extractLocalSignal(input);
  const parsed = parseEncodedSignal(value);
  if (!parsed) throw new Error('This connection code could not be read. Paste the full code with no line breaks, or finish scanning every QR part.');
  try {
    const signal = await unpackJsonBase32(parsed.data, parsed.compressed === '1');
    if (signal?.v !== 1 || !['offer', 'answer'].includes(signal.type) || typeof signal.sdp !== 'string' || !signal.sdp) throw new Error('invalid');
    return signal;
  } catch (error) {
    if (String(error?.message || '').includes('decompress') || String(error?.message || '').includes('damaged or incomplete')) {
      throw new Error('This connection code looks incomplete. Copy the entire code again, or wait until every QR part shows as captured.');
    }
    throw new Error('This connection code could not be read. Paste the full code with no line breaks, or finish scanning every QR part.');
  }
}

// ─── Animated / chunked QR framing ─────────────────────────────────────────
// Splits an already-encoded signal (from encodeLocalSignal) into a sequence of
// small, low-density QR frames, and reassembles them back into the exact same
// string on the other end. Used only for the "return answer" QR, which is the
// one a laptop's fixed-focus camera has to scan — see LocalDeviceTransferTool.jsx.

const randomChunkSessionId = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export function encodeQrChunk({ sessionId, index, total, compressed, data }) {
  return `${LOCAL_TRANSFER_CHUNK_PREFIX}.${sessionId}.${index}.${total}.${compressed}.${data}`;
}

export function decodeQrChunk(text) {
  const value = String(text || '').trim().replace(/\s+/g, '');
  const parts = value.split('.');
  if (parts.length !== 6) throw new Error('This QR part could not be read.');
  const [prefix, sessionId, indexText, totalText, compressed, data] = parts;
  const index = Number(indexText);
  const total = Number(totalText);
  const valid = prefix === LOCAL_TRANSFER_CHUNK_PREFIX && sessionId && ['0', '1'].includes(compressed)
    && Number.isInteger(index) && Number.isInteger(total) && total > 0 && index >= 0 && index < total && data;
  if (!valid) throw new Error('This QR part could not be read.');
  return { sessionId, index, total, compressed, data: data.toUpperCase() };
}

export function splitIntoQrChunks(encodedSignal, targetCharsPerChunk = LOCAL_TRANSFER_QR_CHUNK_CHARS) {
  const value = extractLocalSignal(encodedSignal);
  const parsed = parseEncodedSignal(value);
  if (!parsed) throw new Error('This connection code could not be split into parts.');
  const sessionId = randomChunkSessionId();
  const data = parsed.data;
  const total = Math.max(1, Math.ceil(data.length / targetCharsPerChunk));
  const chunks = [];
  for (let index = 0; index < total; index += 1) {
    const slice = data.slice(index * targetCharsPerChunk, (index + 1) * targetCharsPerChunk);
    chunks.push(encodeQrChunk({ sessionId, index, total, compressed: parsed.compressed, data: slice }));
  }
  return chunks;
}

export function assembleQrChunks(chunkMap, total, compressed) {
  const parts = [];
  for (let index = 0; index < total; index += 1) {
    if (!chunkMap.has(index)) throw new Error('Some connection QR parts are still missing.');
    parts.push(chunkMap.get(index));
  }
  return `${LOCAL_TRANSFER_SIGNAL_PREFIX}.${compressed}.${parts.join('')}`;
}

export const buildJoinUrl = code => `${window.location.origin}${window.location.pathname}${window.location.search}#localtransfer/join/${code}`;

export function connectionCode(signal) {
  const source = signal.sessionId || signal.sdp || '';
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return String(hash >>> 0).padStart(10, '0').slice(-6);
}

export function waitForIceGathering(peer, timeout = 12000) {
  if (peer.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      peer.removeEventListener?.('icegatheringstatechange', check);
      resolve();
    };
    const check = () => { if (peer.iceGatheringState === 'complete') finish(); };
    const timer = setTimeout(finish, timeout);
    peer.addEventListener?.('icegatheringstatechange', check);
  });
}

export async function sha256Hex(buffer) {
  if (!globalThis.crypto?.subtle) return '';
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export const safeFileName = name => String(name || 'received-file').replace(/[\\/:*?"<>|]/g, '-');
