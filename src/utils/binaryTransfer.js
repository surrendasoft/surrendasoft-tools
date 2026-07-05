// Shared helpers for packing data into URL-safe strings, so it can be embedded in a
// link or QR code without any backend. Used by tools that transfer data purely through
// the URL itself (QR text/file transfer, Workflow Diagram share links, etc).

// Past this many characters, a QR code gets dense enough that it's unreliable to scan
// off a phone camera at normal size — tools should fall back to "copy link" instead.
export const QR_URL_SAFE_LIMIT = 1900;

export const bytesToBase64Url = bytes => {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

export const base64UrlToBytes = encoded => {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
};

export const encodeTextBase64Url = text => bytesToBase64Url(new TextEncoder().encode(text));
export const decodeTextBase64Url = encoded => new TextDecoder().decode(base64UrlToBytes(encoded));

export async function compressBytes(bytes) {
  if (typeof CompressionStream === 'undefined') return { bytes, compressed: false };
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    return compressed.length < bytes.length ? { bytes: compressed, compressed: true } : { bytes, compressed: false };
  } catch { return { bytes, compressed: false }; }
}

export async function decompressBytes(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot decompress the transferred data.');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Packs an arbitrary JSON-serialisable value as gzip-if-it-helps + base64url, ready to
// drop straight into a URL segment. `compressed` tells the reader which path was used.
export async function packJson(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const packed = await compressBytes(bytes);
  return { data: bytesToBase64Url(packed.bytes), compressed: packed.compressed, packedSize: packed.bytes.length, originalSize: bytes.length };
}

export async function unpackJson(data, compressed) {
  const packed = base64UrlToBytes(data);
  const bytes = compressed ? await decompressBytes(packed) : packed;
  return JSON.parse(new TextDecoder().decode(bytes));
}
