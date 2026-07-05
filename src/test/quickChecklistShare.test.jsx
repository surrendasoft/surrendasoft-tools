import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QuickChecklistShareTool from '../tools/QuickChecklistShareTool.jsx';
import { createChecklistSnapshot, getChecklistShareUrl, readChecklistShare } from '../utils/quickChecklist.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/#checklist');
  localStorage.clear();
});

describe('AC-CHECKLIST sender and recipient flow', () => {
  it('creates, updates, shares, copies, and saves a checklist', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<QuickChecklistShareTool />);
    await screen.findByText(/not live syncing/i);
    await user.type(screen.getByLabelText(/Checklist title/), 'Event Setup Checklist');
    await user.type(screen.getByLabelText('Checklist item 1'), 'Set up chairs');
    await user.click(screen.getByRole('button', { name: 'Add item' }));
    await user.type(screen.getByLabelText('Checklist item 2'), 'Test microphone');
    await user.click(screen.getByRole('checkbox', { name: 'Mark item 1 complete' }));
    expect(screen.getByText('1 of 2 complete')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Generate checklist link' }));
    const link = await screen.findByLabelText('Share link');
    expect(link.value).toContain('#checklist/share/');
    const working = screen.getByLabelText('Checklist working view');
    expect(within(working).getByText('Version').parentElement).toHaveTextContent('Version1');
    await user.click(screen.getByRole('button', { name: 'Copy latest link' }));
    expect(writeText).toHaveBeenCalledWith(link.value);
    await user.click(screen.getByRole('button', { name: 'Copy as plain text' }));
    expect(writeText).toHaveBeenLastCalledWith(expect.stringContaining('☑ Set up chairs'));
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(localStorage.getItem('surrendasoft-quick-checklist-draft-v1')).toContain('Event Setup Checklist');
  });

  it('loads a link snapshot and generates a versioned updated link', async () => {
    const shared = createChecklistSnapshot({ type: 'checklist', v: 1, title: 'Event Setup', version: 0, updatedAt: '', updatedBy: 'Laurence', items: [{ id: 'a1', text: 'Set up chairs', done: false }] }, new Date('2026-07-05T11:42:00.000Z'));
    const url = await getChecklistShareUrl(shared, window.location);
    window.history.replaceState(null, '', new URL(url).hash);
    const user = userEvent.setup();
    render(<QuickChecklistShareTool />);

    expect(await screen.findByText('Loaded a checklist snapshot from a shared link.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Checklist title/)).toHaveValue('Event Setup');
    await user.click(screen.getByRole('button', { name: 'Tick Set up chairs' }));
    await user.clear(screen.getByLabelText(/Updated by/));
    await user.type(screen.getByLabelText(/Updated by/), 'Sam');
    await user.click(screen.getByRole('button', { name: 'Share updated checklist' }));
    const latestUrl = (await screen.findByLabelText('Share link')).value;
    const latest = await readChecklistShare(new URL(latestUrl).hash);
    expect(latest.version).toBe(2);
    expect(latest.items[0].done).toBe(true);
    expect(latest.updatedBy).toBe('Sam');
    expect(Date.parse(latest.updatedAt)).toBeGreaterThan(Date.parse(shared.updatedAt));
  });

  it('recovers from an unreadable checklist link', async () => {
    window.history.replaceState(null, '', '/#checklist/share/r/not-valid-json');
    render(<QuickChecklistShareTool />);
    expect(await screen.findByText(/could not be read/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Checklist title/)).toBeInTheDocument();
  });
});
