import { describe, expect, it } from 'vitest';
import {
  checklistFilename, checklistToText, createChecklistSnapshot, getChecklistShareUrl,
  readChecklistShare, validateChecklistPayload,
} from './quickChecklist.js';

describe('Quick Checklist Share payloads', () => {
  const draft = {
    type: 'checklist', v: 1, title: 'Event Setup Checklist', updatedAt: '', updatedBy: 'Laurence', version: 0,
    items: [
      { id: 'a1', text: 'Set up chairs', done: true },
      { id: 'a2', text: 'Test microphone', done: false },
      { id: 'empty', text: '   ', done: false },
    ],
  };

  it('creates versioned snapshots while ignoring empty rows', () => {
    const snapshot = createChecklistSnapshot(draft, new Date('2026-07-05T11:42:00.000Z'));
    expect(snapshot.version).toBe(1);
    expect(snapshot.updatedAt).toBe('2026-07-05T11:42:00.000Z');
    expect(snapshot.items).toHaveLength(2);
    const next = createChecklistSnapshot(snapshot, new Date('2026-07-05T12:00:00.000Z'));
    expect(next.version).toBe(2);
  });

  it('round-trips through the shared compressed tool-link helpers', async () => {
    const snapshot = createChecklistSnapshot(draft, new Date('2026-07-05T11:42:00.000Z'));
    const url = await getChecklistShareUrl(snapshot, { origin: 'https://tools.example', pathname: '/app/' });
    expect(new URL(url).hash).toMatch(/^#checklist\/share\/(z|r)\//);
    const loaded = await readChecklistShare(new URL(url).hash);
    expect(loaded).toEqual(snapshot);
  });

  it('rejects malformed payloads and caps imported content', () => {
    expect(validateChecklistPayload({ type: 'wrong', items: [] })).toBeNull();
    expect(validateChecklistPayload({ type: 'checklist', v: 1, items: [] })).toBeNull();
    const loaded = validateChecklistPayload({ type: 'checklist', v: 1, title: 'x'.repeat(100), version: 3, items: Array.from({ length: 35 }, (_, index) => ({ id: `i${index}`, text: `Item ${index}`, done: false })) });
    expect(loaded.title).toHaveLength(80);
    expect(loaded.items).toHaveLength(30);
  });

  it('formats plain text and a safe download filename', () => {
    const snapshot = createChecklistSnapshot(draft, new Date('2026-07-05T11:42:00.000Z'));
    const text = checklistToText(snapshot);
    expect(text).toContain('☑ Set up chairs');
    expect(text).toContain('☐ Test microphone');
    expect(text).toContain('1 of 2 complete');
    expect(text).toContain('Version: 1');
    expect(checklistFilename(snapshot.title)).toBe('event-setup-checklist.txt');
  });
});
