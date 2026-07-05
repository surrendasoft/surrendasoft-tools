import { base64UrlToBytes, bytesToBase64Url, compressBytes as sharedCompressBytes, decompressBytes as sharedDecompressBytes, decodeTextBase64Url, encodeTextBase64Url, QR_URL_SAFE_LIMIT } from './binaryTransfer.js';

export const QR_TEXT_SOFT_LIMIT = 1200;
export const QR_TEXT_HARD_LIMIT = 1500;
export const QR_FILE_SOURCE_LIMIT = 20 * 1024;
export const QR_IMAGE_SOURCE_LIMIT = 15 * 1024 * 1024;
export const QR_URL_HARD_LIMIT = QR_URL_SAFE_LIMIT;
export const QR_IMAGE_TARGET_BYTES = 1100;
export const BLOCKED_TINY_FILE_EXTENSIONS = ['exe', 'bat', 'cmd', 'sh', 'msi', 'scr', 'jar', 'app', 'dmg'];

export const encodeTransferText = encodeTextBase64Url;
export const decodeTransferText = decodeTextBase64Url;

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

export const isCondensableImage = file => Boolean(file?.type?.startsWith('image/')) && file.type !== 'image/svg+xml';

export function validateTransferSource(file) {
  if (!file) return { valid: false, error: 'Choose a tiny file or image to transfer.' };
  if (file.type?.startsWith('image/') && !isCondensableImage(file)) return { valid: false, error: 'SVG images are not supported in QR image mode. Convert the image to PNG, JPG, or WebP first.' };
  if (isCondensableImage(file)) {
    if (file.size > QR_IMAGE_SOURCE_LIMIT) return { valid: false, error: 'This image is over 15 MB. Choose a smaller source image.' };
    return { valid: true, error: '' };
  }
  return validateTinyFile(file);
}

const canvasBlob = (canvas, type, quality) => new Promise(resolve => canvas.toBlob(resolve, type, quality));

export async function condenseImageForQr(file) {
  if (!isCondensableImage(file)) throw new Error('Choose a JPG, PNG, WebP, GIF, or other browser-readable image.');
  if (file.size > QR_IMAGE_SOURCE_LIMIT) throw new Error('This image is over 15 MB. Choose a smaller source image.');

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('This browser could not read that image format. Try JPG, PNG, or WebP.');
  }

  const dimensions = [128, 112, 96, 80, 72, 64, 56, 48, 40, 32];
  const qualities = [0.72, 0.58, 0.46, 0.34, 0.24, 0.16, 0.1];
  let best = null;

  for (const maximum of dimensions) {
    const scale = Math.min(1, maximum / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    for (const quality of qualities) {
      let blob = await canvasBlob(canvas, 'image/webp', quality);
      let type = 'image/webp';
      if (!blob || blob.type !== 'image/webp') {
        blob = await canvasBlob(canvas, 'image/jpeg', quality);
        type = 'image/jpeg';
      }
      if (!blob) continue;
      best = { blob, width, height, quality, type };
      if (blob.size <= QR_IMAGE_TARGET_BYTES) break;
    }
    if (best?.blob.size <= QR_IMAGE_TARGET_BYTES) break;
  }

  bitmap.close?.();
  if (!best || best.blob.size > QR_IMAGE_TARGET_BYTES) throw new Error('This image could not be condensed enough for a reliable QR code. Try a simpler image or crop it first.');

  const extension = best.type === 'image/webp' ? 'webp' : 'jpg';
  const baseName = cleanFileName(file.name).replace(/\.[^.]+$/, '').slice(0, 80) || 'qr-image';
  const output = new File([best.blob], `${baseName}-qr.${extension}`, { type: best.type });
  return { file: output, width: best.width, height: best.height, quality: best.quality, originalSize: file.size, condensedSize: output.size };
}

const cleanFileName = name => (name.split(/[\\/]/).pop() || 'transfer.bin').slice(0, 120);

export async function buildFileTransfer(file, locationLike = window.location) {
  const validation = validateTinyFile(file);
  if (!validation.valid) throw new Error(validation.error);
  const originalBytes = new Uint8Array(await file.arrayBuffer());
  const packed = await sharedCompressBytes(originalBytes);
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
    const bytes = match[1] === 'z' ? await sharedDecompressBytes(packed) : packed;
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

// ── vCard helpers ──────────────────────────────────────────────────────────

const escapeVCard = v => String(v || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

export function buildVCard({ firstName = '', lastName = '', phone = '', phoneType = 'CELL', email = '', company = '', website = '', note = '' } = {}) {
  const fn = [firstName, lastName].filter(Boolean).join(' ') || phone || email || 'Contact';
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCard(fn)}`,
    `N:${escapeVCard(lastName)};${escapeVCard(firstName)};;;`,
    phone && `TEL;TYPE=${phoneType || 'CELL'}:${phone}`,
    email && `EMAIL:${email.toLowerCase()}`,
    company && `ORG:${escapeVCard(company)}`,
    website && `URL:${website}`,
    note && `NOTE:${escapeVCard(note)}`,
    'END:VCARD',
  ];
  return lines.filter(Boolean).join('\r\n');
}

export function parseVCard(text) {
  const get = key => {
    const m = text.match(new RegExp(`^${key}(?:;[^:]*)?:(.*)$`, 'm'));
    return (m?.[1] ?? '').trim().replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
  };
  const fn = get('FN');
  const n = get('N').split(';');
  const lastName  = n[0] || '';
  const firstName = n[1] || '';
  const phone = (() => { const m = text.match(/^TEL(?:;[^:]*)?:(.*)$/m); return (m?.[1] ?? '').trim(); })();
  const phoneType = (() => { const m = text.match(/^TEL;TYPE=([^:;]+)/m); return (m?.[1] ?? 'CELL').trim(); })();
  return {
    fullName: fn || [firstName, lastName].filter(Boolean).join(' '),
    firstName, lastName, phone, phoneType,
    email:   get('EMAIL').toLowerCase() || '',
    company: get('ORG'),
    website: get('URL'),
    note:    get('NOTE'),
  };
}

export function parseAllVCards(text) {
  const blocks = [...text.matchAll(/BEGIN:VCARD[\s\S]*?END:VCARD/gi)];
  return blocks.length > 0 ? blocks.map(m => parseVCard(m[0])) : [parseVCard(text)];
}

// ── Event transfer URL helpers ─────────────────────────────────────────────

export function buildEventTransferUrl(icsText, locationLike = window.location) {
  const base = `${locationLike.origin}${locationLike.pathname}`;
  return `${base}#textqr/event/${encodeTransferText(icsText)}`;
}

export function isEventTransferRoute(value) {
  const hash = value.startsWith('#') ? value : (() => { try { return new URL(value, window.location.href).hash; } catch { return ''; } })();
  return hash.startsWith('#textqr/event/');
}

export function readEventPayload(value) {
  try {
    const hash = value.startsWith('#') ? value : new URL(value, window.location.href).hash;
    const match = hash.match(/^#textqr\/event\/([A-Za-z0-9_-]+)$/);
    return match ? decodeTransferText(match[1]) : null;
  } catch { return null; }
}
