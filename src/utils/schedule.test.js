import { describe, expect, it } from 'vitest';
import {
  buildScheduleEvents, groupEventsByDate, previewScheduleTemplate, renderScheduleTemplate, scheduleDateKey,
} from './schedule.js';

describe('schedule templates', () => {
  it('renders week and session chips', () => {
    const rendered = renderScheduleTemplate('Week {{week}} · Session {{session}} — {{title}}', {
      week: 2, session: 2, baseTitle: 'Lab', dateLabel: 'Mon', timeLabel: '9–11',
    });
    expect(rendered).toBe('Week 2 · Session 2 — Lab');
  });

  it('builds events with title and description patterns', () => {
    const { events } = buildScheduleEvents({
      title: 'Counselling Lecture',
      titleTemplate: 'Session {{session}} - {{title}}',
      descriptionTemplate: 'Week {{week}} on {{date}}',
      date: '2026-03-03',
      start: '09:00',
      end: '11:00',
      repeat: 'weekly',
      sessions: 3,
      location: 'City campus',
    });
    expect(events).toHaveLength(3);
    expect(events[2].title).toBe('Session 3 - Counselling Lecture');
    expect(events[2].description).toMatch(/^Week 3 on /);
    expect(events[2].location).toBe('City campus');
  });

  it('groups events by date for calendar preview', () => {
    const { events } = buildScheduleEvents({
      title: 'Workshop',
      titleTemplate: '{{title}}',
      descriptionTemplate: '',
      date: '2026-03-03',
      start: '09:00',
      end: '10:00',
      repeat: 'weekly',
      sessions: 2,
      location: '',
    });
    const grouped = groupEventsByDate(events);
    expect(grouped.size).toBe(2);
    expect(grouped.get(scheduleDateKey(events[0].start))).toHaveLength(1);
  });

  it('previews first session from form state', () => {
    const preview = previewScheduleTemplate('Week {{week}} - {{title}}', {
      title: 'Counselling Lecture',
      date: '2026-03-03',
      start: '09:00',
      end: '11:00',
      repeat: 'weekly',
    });
    expect(preview).toBe('Week 1 - Counselling Lecture');
  });
});
