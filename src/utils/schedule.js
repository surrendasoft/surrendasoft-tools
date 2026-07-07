import { padCalendar } from './calendar.js';

export const SCHEDULE_CHIPS = [
  { id: 'week', token: '{{week}}', label: 'Week number' },
  { id: 'session', token: '{{session}}', label: 'Session number' },
  { id: 'title', token: '{{title}}', label: 'Event title' },
  { id: 'date', token: '{{date}}', label: 'Date' },
  { id: 'time', token: '{{time}}', label: 'Time' },
];

export const scheduleDateKey = date => `${date.getFullYear()}-${padCalendar(date.getMonth() + 1)}-${padCalendar(date.getDate())}`;

const createDate = (date, time) => new Date(`${date}T${time}:00`);

const sessionDate = (start, index, repeat) => {
  if (repeat !== 'monthly') return new Date(start.getTime() + index * (repeat === 'fortnightly' ? 14 : 7) * 86400000);
  const result = new Date(start);
  const day = start.getDate();
  result.setDate(1);
  result.setMonth(start.getMonth() + index);
  result.setDate(Math.min(day, new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()));
  return result;
};

export function formatScheduleDate(date) {
  return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatScheduleTime(date) {
  return date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
}

export function renderScheduleTemplate(template, context) {
  const source = String(template || '').trim();
  if (!source) return context.fallback || '';
  return source
    .replace(/\{\{week\}\}/g, String(context.week))
    .replace(/\{\{session\}\}/g, String(context.session))
    .replace(/\{\{title\}\}/g, context.baseTitle || '')
    .replace(/\{\{date\}\}/g, context.dateLabel || '')
    .replace(/\{\{time\}\}/g, context.timeLabel || '');
}

export function buildScheduleEvents(form) {
  const start = createDate(form.date, form.start);
  const end = createDate(form.date, form.end);
  const count = Math.min(52, Math.max(1, Number(form.sessions) || 1));
  const baseTitle = form.title.trim();

  if (!baseTitle && !form.titleTemplate.trim()) return { error: 'Enter an event title or add one with the Event title chip.' };
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { error: 'Choose a valid date and time.' };
  if (end <= start) return { error: 'End time must be later than start time.' };

  const duration = end - start;
  const events = Array.from({ length: count }, (_, index) => {
    const eventStart = sessionDate(start, index, form.repeat);
    const eventEnd = new Date(eventStart.getTime() + duration);
    const context = {
      week: index + 1,
      session: index + 1,
      baseTitle,
      dateLabel: formatScheduleDate(eventStart),
      timeLabel: `${formatScheduleTime(eventStart)} – ${formatScheduleTime(eventEnd)}`,
      fallback: baseTitle || 'Event title',
    };
    return {
      title: renderScheduleTemplate(form.titleTemplate, context) || baseTitle || 'Event title',
      description: renderScheduleTemplate(form.descriptionTemplate, context),
      start: eventStart,
      end: eventEnd,
      location: form.location.trim(),
      number: index + 1,
    };
  });

  return { events };
}

export function previewScheduleTemplate(template, form, index = 0) {
  const baseTitle = form.title.trim() || 'Event title';
  const start = createDate(form.date || '2026-01-01', form.start || '09:00');
  const end = createDate(form.date || '2026-01-01', form.end || '11:00');
  const eventStart = sessionDate(start, index, form.repeat || 'weekly');
  const eventEnd = new Date(eventStart.getTime() + Math.max(end - start, 3600000));
  return renderScheduleTemplate(template, {
    week: index + 1,
    session: index + 1,
    baseTitle,
    dateLabel: formatScheduleDate(eventStart),
    timeLabel: `${formatScheduleTime(eventStart)} – ${formatScheduleTime(eventEnd)}`,
    fallback: baseTitle,
  }) || baseTitle;
}

export function groupEventsByDate(events) {
  const map = new Map();
  events.forEach(event => {
    const key = scheduleDateKey(event.start);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(event);
  });
  return map;
}

export function monthKeysForEvents(events) {
  const keys = new Set();
  events.forEach(event => keys.add(`${event.start.getFullYear()}-${event.start.getMonth()}`));
  return [...keys]
    .map(key => {
      const [year, month] = key.split('-').map(Number);
      return { year, month };
    })
    .sort((left, right) => left.year - right.year || left.month - right.month);
}
