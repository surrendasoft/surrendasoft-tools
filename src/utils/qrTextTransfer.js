export const QR_TEXT_SOFT_LIMIT = 1200;
export const QR_TEXT_HARD_LIMIT = 1500;
export const QR_FILE_SOURCE_LIMIT = 20 * 1024;
export const QR_URL_HARD_LIMIT = 1900;
export const BLOCKED_TINY_FILE_EXTENSIONS = ['exe', 'bat', 'cmd', 'sh', 'msi', 'scr', 'jar', 'app', 'dmg'];

const bytesToBase64Url = bytes => {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64UrlToBytes = encoded => {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
};

export function encodeTransferText(text) {
  return bytesToBase64Url(new TextEncoder().encode(text));
}

export function decodeTransferText(encoded) {
  return new TextDecoder().decode(base64UrlToBytes(encoded));
}

export function validateTransferText(text) {
  if (!text.trim()) return { valid: false, error: 'Enter some text or a link to transfer.', warning: '' };
  if (text.length > QR_TEXT_HARD_LIMIT) return { valid: false, error: `Text is too long for reliable QR transfer. Keep it under ${QR_TEXT_HARD_LIMIT.toLocaleString()} characters.`, warning: '' };
  if (encodeTransferText(text).length > QR_URL_HARD_LIMIT - 100) return { valid: false, error: 'This text uses too many encoded bytes for a reliable QR code. Shorten it and try again.', warning: '' };
  return { valid: true, error: '', warning: text.length > QR_TEXT_SOFT_LIMIT ? 'This is a dense QR code and may be harder to scan. Shorten the text for the most reliable transfer.' : '' };
}

export function buildTransferUrl(text, locationLike = window.location) {
  const base = `${locationLike.origin}${locationLike.pathname}`;
  return `${base}#textqr/receive/${encodeTransferText(text)}`;
}

export function readTransferPayload(value) {
  try {
    const hash = value.startsWith('#') ? value : new URL(value, window.location.href).hash;
    const match = hash.match(/^#textqr\/receive\/([A-Za-z0-9_-]+)$/);
    return match ? decodeTransferText(match[1]) : null;
  } catch { return null; }
}

export function isSafeWebLink(value) {
  try { return ['http:', 'https:'].includes(new URL(value.trim()).protocol); } catch { return false; }
}

export function validateTinyFile(file) {
  if (!file) return { valid: false, error: 'Choose a tiny file to transfer.' };
  const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
  if (BLOCKED_TINY_FILE_EXTENSIONS.includes(extension)) return { valid: false, error: `.${extension} files are blocked for safety.` };
  if (file.size > QR_FILE_SOURCE_LIMIT) return { valid: false, error: 'This file is over 20 KB. QR file transfer is designed for tiny files only.' };
  return { valid: true, error: '' };
}

const compressBytes = async bytes => {
  if (typeof CompressionStream === 'undefined') return { bytes, compressed: false };
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    return compressed.length < bytes.length ? { bytes: compressed, compressed: true } : { bytes, compressed: false };
  } catch { return { bytes, compressed: false }; }
};

const decompressBytes = async bytes => {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot decompress the transferred file.');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

const cleanFileName = name => (name.split(/[\\/]/).pop() || 'transfer.bin').slice(0, 120);

export async function buildFileTransfer(file, locationLike = window.location) {
  const validation = validateTinyFile(file);
  if (!validation.valid) throw new Error(validation.error);
  const originalBytes = new Uint8Array(await file.arrayBuffer());
  const packed = await compressBytes(originalBytes);
  const name = encodeTransferText(cleanFileName(file.name));
  const mime = encodeTransferText(file.type || 'application/octet-stream');
  const data = bytesToBase64Url(packed.bytes);
  const base = `${locationLike.origin}${locationLike.pathname}`;
  const url = `${base}#textqr/file/${packed.compressed ? 'z' : 'r'}/${name}/${mime}/${data}`;
  if (url.length > QR_URL_HARD_LIMIT) throw new Error(`This file compresses to ${packed.bytes.length.toLocaleString()} bytes, which is still too large for a reliable QR code. Try a smaller or more compressible file.`);
  return { url, originalSize: originalBytes.length, packedSize: packed.bytes.length, compressed: packed.compressed, name: cleanFileName(file.name), mimeType: file.type || 'application/octet-stream' };
}

export async function readFileTransfer(value) {
  try {
    const hash = value.startsWith('#') ? value : new URL(value, window.location.href).hash;
    const match = hash.match(/^#textqr\/file\/(z|r)\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)$/);
    if (!match) return null;
    const packed = base64UrlToBytes(match[4]);
    const bytes = match[1] === 'z' ? await decompressBytes(packed) : packed;
    const name = cleanFileName(decodeTransferText(match[2]));
    const mimeType = decodeTransferText(match[3]);
    return { name, mimeType, bytes, originalSize: bytes.length, packedSize: packed.length, compressed: match[1] === 'z' };
  } catch { return null; }
}

export const isFileTransferRoute = value => {
  const hash = value.startsWith('#') ? value : (() => { try { return new URL(value, window.location.href).hash; } catch { return ''; } })();
  return hash.startsWith('#textqr/file/');
};

export const isTextLikeFile = file => file.mimeType.startsWith('text/') || /\.(txt|md|json|csv|xml|yaml|yml|css|js|ts|html)$/i.test(file.name);
