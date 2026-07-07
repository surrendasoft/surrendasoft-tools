import { describe, expect, it } from 'vitest';
import { buildKeepRegions, formatVideoTime, keptDuration, trimmedFileName } from './videoTrim.js';

describe('formatVideoTime', () => {
  it('formats minutes and seconds', () => {
    expect(formatVideoTime(65)).toBe('1:05');
    expect(formatVideoTime(0)).toBe('0:00');
  });
});

describe('buildKeepRegions', () => {
  it('returns one region for simple start/end trim', () => {
    expect(buildKeepRegions({ duration: 60, trimStart: 5, trimEnd: 50, middleCut: false })).toEqual([
      { start: 5, end: 50 },
    ]);
  });

  it('splits kept video when a middle section is removed', () => {
    expect(buildKeepRegions({
      duration: 60,
      trimStart: 0,
      trimEnd: 60,
      middleCut: true,
      cutStart: 20,
      cutEnd: 40,
    })).toEqual([
      { start: 0, end: 20 },
      { start: 40, end: 60 },
    ]);
  });

  it('ignores middle cut when the removed range is too small', () => {
    expect(buildKeepRegions({
      duration: 10,
      trimStart: 1,
      trimEnd: 9,
      middleCut: true,
      cutStart: 4,
      cutEnd: 4.02,
    })).toEqual([{ start: 1, end: 9 }]);
  });
});

describe('keptDuration', () => {
  it('sums kept regions', () => {
    expect(keptDuration([{ start: 0, end: 10 }, { start: 20, end: 30 }])).toBe(20);
  });
});

describe('trimmedFileName', () => {
  it('preserves webm extension when trimming webm files', () => {
    expect(trimmedFileName('clip.webm')).toBe('clip-trimmed.webm');
    expect(trimmedFileName('clip.mp4')).toBe('clip-trimmed.mp4');
  });
});
