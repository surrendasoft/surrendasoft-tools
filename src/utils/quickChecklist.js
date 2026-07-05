import { buildToolShareUrl, readToolShareFromHash } from './toolShare.js';

export const QUICK_CHECKLIST_TOOL_ID = 'checklist';
export const MAX_CHECKLIST_ITEMS = 30;
export const MAX_CHECKLIST_TEXT = 80;
export const MAX_CHECKLIST_TITLE = 80;
export const CHECKLIST_LINK_WARNING = 2000;
export const CHECKLIST_QR_HARD = 3000;
export const CHECKLIST_LINK_HARD = 8000;

let checklistIdSeed = 0;
export const makeChecklistItem = (text = '') => ({ id: `c-${Date.now().toString(36)}-${(checklistIdSeed++).toString(36)}`, text: text.slice(0, MAX_CHECKLIST_TEXT), done: false });

export function blankChecklist() {
  return { type: 'checklist', v: 1, title: '', updatedAt: '', updatedBy: '', version: 0, items: [makeChecklistItem()] };
}

const clean = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';

export function validateChecklistPayload(raw) {
  if (!raw || typeof raw !== 'object' || raw.type !== 'checklist' || Number(raw.v) !== 1 || !Array.isArray(raw.items)) return null;
  const items = raw.items.slice(0, MAX_CHECKLIST_ITEMS).map((item, index) => {
    if (!item || typeof item !== 'object') return null;
    const text = clean(item.text, MAX_CHECKLIST_TEXT).trim();
    if (!text) return null;
    return { id: clean(item.id, 40) || `item-${index + 1}`, text, done: Boolean(item.done) };
  }).filter(Boolean);
  if (!items.length) return null;
  const updatedAt = typeof raw.updatedAt === 'string' && !Number.isNaN(Date.parse(raw.updatedAt)) ? raw.updatedAt : '';
  return {
    type: 'checklist',
    v: 1,
    title: clean(raw.title, MAX_CHECKLIST_TITLE),
    updatedAt,
    updatedBy: clean(raw.updatedBy, MAX_CHECKLIST_TITLE),
    version: Math.max(1, Math.floor(Number(raw.version) || 1)),
    items,
  };
}

export function checklistItemsForShare(items) {
  return items.map(item => ({ ...item, text: item.text.trim() })).filter(item => item.text).slice(0, MAX_CHECKLIST_ITEMS);
}

export function createChecklistSnapshot(checklist, now = new Date()) {
  const items = checklistItemsForShare(checklist.items || []);
  if (!items.length) throw new Error('Add at least one checklist item.');
  return {
    type: 'checklist',
    v: 1,
    title: clean(checklist.title, MAX_CHECKLIST_TITLE).trim(),
    updatedAt: now.toISOString(),
    updatedBy: clean(checklist.updatedBy, MAX_CHECKLIST_TITLE).trim(),
    version: Math.max(0, Math.floor(Number(checklist.version) || 0)) + 1,
    items,
  };
}

export const getChecklistShareUrl = (payload, locationLike = window.location) => buildToolShareUrl(QUICK_CHECKLIST_TOOL_ID, payload, locationLike);
export const readChecklistShare = hash => readToolShareFromHash(QUICK_CHECKLIST_TOOL_ID, hash, validateChecklistPayload);

export function checklistToText(checklist) {
  const items = checklistItemsForShare(checklist.items || []);
  const completed = items.filter(item => item.done).length;
  const updated = checklist.updatedAt ? new Date(checklist.updatedAt).toLocaleString('en-AU', { weekday: 'long', hour: 'numeric', minute: '2-digit' }) : 'Not shared yet';
  return [
    checklist.title.trim() || 'Untitled checklist',
    '',
    ...items.map(item => `${item.done ? '☑' : '☐'} ${item.text}`),
    '',
    `${completed} of ${items.length} complete`,
    `Last updated: ${updated}`,
    `Version: ${checklist.version || 0}`,
    checklist.updatedBy && `Updated by: ${checklist.updatedBy}`,
  ].filter(value => value !== false && value !== undefined).join('\n');
}

export function checklistFilename(title) {
  const slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70);
  return `${slug || 'checklist'}.txt`;
}
