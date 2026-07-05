import { packJson, unpackJson } from './binaryTransfer.js';

export const LOCAL_TRANSFER_SIGNAL_PREFIX = 'sslt1';
export const LOCAL_TRANSFER_FILE_LIMIT = 100 * 1024 * 1024;
export const LOCAL_TRANSFER_TEXT_LIMIT = 100000;
export const LOCAL_TRANSFER_CHUNK_SIZE = 32 * 1024;

export const createTransferId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export async function encodeLocalSignal(signal) {
  if (!signal || !['offer', 'answer'].includes(signal.type) || !signal.sdp) throw new Error('This connection signal is incomplete.');
  const packed = await packJson({ v: 1, type: signal.type, sdp: signal.sdp, sessionId: signal.sessionId || '', createdAt: signal.createdAt || new Date().toISOString() });
  return `${LOCAL_TRANSFER_SIGNAL_PREFIX}.${packed.compressed ? '1' : '0'}.${packed.data}`;
}

export async function decodeLocalSignal(input) {
  const value = extractLocalSignal(input);
  const [prefix, compressed, data] = value.split('.');
  if (prefix !== LOCAL_TRANSFER_SIGNAL_PREFIX || !['0', '1'].includes(compressed) || !data) throw new Error('This connection code could not be read.');
  try {
    const signal = await unpackJson(data, compressed === '1');
    if (signal?.v !== 1 || !['offer', 'answer'].includes(signal.type) || typeof signal.sdp !== 'string' || !signal.sdp) throw new Error();
    return signal;
  } catch {
    throw new Error('This connection code could not be read.');
  }
}

export function extractLocalSignal(input) {
  const value = String(input || '').trim();
  const route = value.match(/#localtransfer\/(?:join|answer)\/([^\s]+)/);
  return route ? route[1] : value;
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
