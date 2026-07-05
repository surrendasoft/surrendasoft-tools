import { describe, expect, it } from 'vitest';
import {
  buildResponse, clientIntakeTemplate, defaultAnswerValue, feedbackTemplate,
  responseToCsv, responseToText, sanitizeForm, sanitizeResponse,
} from '../utils/quickForm.js';
import { buildToolRouteUrl, buildToolShareUrl, readToolRouteFromHash, readToolShareFromHash } from '../utils/toolShare.js';

describe('quickForm utils', () => {
  it('sanitizes a form and caps field count', () => {
    const form = sanitizeForm({
      title: 'Test',
      fields: Array.from({ length: 12 }, (_, i) => ({ id: `f${i}`, type: 'text', label: `Field ${i}` })),
    });
    expect(form.fields).toHaveLength(10);
  });

  it('builds and formats a response', () => {
    const form = clientIntakeTemplate();
    const response = buildResponse(form, {
      [form.fields[0].id]: 'Jane Doe',
      [form.fields[1].id]: '0412 000 000',
      [form.fields[2].id]: 'jane@example.com',
    });
    expect(response.fields[0].value).toBe('Jane Doe');
    expect(responseToText(response)).toContain('Jane Doe');
    expect(responseToCsv(response)).toContain('"Jane Doe"');
    expect(sanitizeResponse(response)).toBeTruthy();
  });

  it('sanitizes rating and range field bounds', () => {
    const form = sanitizeForm({
      title: 'Survey',
      fields: [
        { id: 'r1', type: 'rating', label: 'Score', max: 99 },
        { id: 's1', type: 'range', label: 'Scale', min: 5, max: 5, step: -1 },
      ],
    });
    expect(form.fields[0].max).toBe(10);
    expect(form.fields[1].min).toBe(5);
    expect(form.fields[1].max).toBe(6);
    expect(form.fields[1].step).toBe(1);
  });

  it('provides sensible default answer values per field type', () => {
    expect(defaultAnswerValue({ type: 'checkbox' })).toBe(false);
    expect(defaultAnswerValue({ type: 'rating' })).toBe(0);
    expect(defaultAnswerValue({ type: 'range', min: 2, max: 8 })).toBe(5);
    expect(defaultAnswerValue({ type: 'text' })).toBe('');
  });

  it('formats a star rating answer as "n/max" and blank when unrated', () => {
    const form = feedbackTemplate();
    const ratingField = form.fields.find(f => f.type === 'rating');
    const rated = buildResponse(form, { [ratingField.id]: 4 });
    expect(rated.fields.find(f => f.id === ratingField.id).value).toBe('4/5');
    const unrated = buildResponse(form, { [ratingField.id]: 0 });
    expect(unrated.fields.find(f => f.id === ratingField.id).value).toBe('');
  });
});

describe('quickForm share routes', () => {
  it('round-trips a form through a share link', async () => {
    const form = clientIntakeTemplate();
    const url = await buildToolShareUrl('quickform', form, { origin: 'https://example.com', pathname: '/app/' });
    const loaded = await readToolShareFromHash('quickform', new URL(url).hash, sanitizeForm);
    expect(loaded.title).toBe('Client intake');
    expect(loaded.fields).toHaveLength(6);
  });

  it('round-trips a completed response through a response link', async () => {
    const form = clientIntakeTemplate();
    const response = buildResponse(form, { [form.fields[0].id]: 'Sam' });
    const url = await buildToolRouteUrl('quickform', 'response', response, { origin: 'https://example.com', pathname: '/app/' });
    const loaded = await readToolRouteFromHash('quickform', 'response', new URL(url).hash, sanitizeResponse);
    expect(loaded.fields[0].value).toBe('Sam');
  });
});
