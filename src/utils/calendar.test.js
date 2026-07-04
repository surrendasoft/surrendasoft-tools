import { describe, expect, it } from 'vitest';
import { buildIcs, padCalendar } from './calendar.js';

describe('AC-SCHEDULE calendar utilities', () => {
  it('pads calendar fields', () => {
    expect(padCalendar(4)).toBe('04');
    expect(padCalendar(12)).toBe('12');
  });

  it('builds one valid escaped VEVENT per session', () => {
    const events = [
      {
        title: 'Session 1 - Advice, planning & review',
        start: new Date(2026, 2, 3, 9, 0),
        end: new Date(2026, 2, 3, 11, 0),
        location: 'Room 1; City campus',
        description: 'Bring notes\nQuestions welcome',
      },
      {
        title: 'Session 2',
        start: new Date(2026, 2, 10, 9, 0),
        end: new Date(2026, 2, 10, 11, 0),
      },
    ];

    const ics = buildIcs(events, new Date('2026-02-01T00:00:00.000Z'));

    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ics).toMatch(/END:VCALENDAR\r\n$/);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('SUMMARY:Session 1 - Advice\\, planning & review');
    expect(ics).toContain('LOCATION:Room 1\\; City campus');
    expect(ics).toContain('DESCRIPTION:Bring notes\\nQuestions welcome');
    expect(ics).toContain('DTSTART:20260303T090000');
  });
});
