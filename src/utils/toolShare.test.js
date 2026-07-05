import { afterEach, describe, expect, it } from 'vitest';
import { buildToolShareUrl, readToolShareFromHash, resetToolHash } from '../utils/toolShare.js';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('toolShare', () => {
  it('round-trips JSON through a tool share URL', async () => {
    const location = { origin: 'https://example.com', pathname: '/app/' };
    const url = await buildToolShareUrl('regex', { pattern: '\\d+', flags: 'g', input: 'abc 123' }, location);
    const hash = new URL(url).hash;
    expect(hash).toMatch(/^#regex\/share\/(z|r)\//);
    const payload = await readToolShareFromHash('regex', hash);
    expect(payload).toEqual({ pattern: '\\d+', flags: 'g', input: 'abc 123' });
  });

  it('returns null for another tool id', async () => {
    const url = await buildToolShareUrl('diff', { left: 'a', right: 'b' });
    const payload = await readToolShareFromHash('regex', new URL(url).hash);
    expect(payload).toBeNull();
  });

  it('resetToolHash strips the share payload', () => {
    window.history.replaceState(null, '', '/app/#workflow/share/z/abc');
    resetToolHash('workflow');
    expect(window.location.hash).toBe('#workflow');
  });
});
