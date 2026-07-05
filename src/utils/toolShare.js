import { packJson, unpackJson } from './binaryTransfer.js';

export function toolRoutePattern(toolId, segment) {
  return new RegExp(`^#${toolId}/${segment}/(z|r)/([A-Za-z0-9_-]+)$`);
}

export function shareRoutePattern(toolId) {
  return toolRoutePattern(toolId, 'share');
}

export async function buildToolRouteUrl(toolId, segment, payload, locationLike = window.location) {
  const packed = await packJson(payload);
  const base = `${locationLike.origin}${locationLike.pathname}`;
  return `${base}#${toolId}/${segment}/${packed.compressed ? 'z' : 'r'}/${packed.data}`;
}

export async function buildToolShareUrl(toolId, payload, locationLike = window.location) {
  return buildToolRouteUrl(toolId, 'share', payload, locationLike);
}

export async function readToolRouteFromHash(toolId, segment, hash, parse = value => value) {
  const match = hash.match(toolRoutePattern(toolId, segment));
  if (!match) return null;
  try {
    const value = await unpackJson(match[2], match[1] === 'z');
    return parse(value);
  } catch { return null; }
}

export async function readToolShareFromHash(toolId, hash, parse = value => value) {
  return readToolRouteFromHash(toolId, 'share', hash, parse);
}

export function resetToolHash(toolId) {
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${toolId}`);
}
