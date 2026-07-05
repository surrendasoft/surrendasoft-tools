export const padCalendar = value => String(value).padStart(2, '0');

const calendarStamp = date => `${date.getFullYear()}${padCalendar(date.getMonth() + 1)}${padCalendar(date.getDate())}T${padCalendar(date.getHours())}${padCalendar(date.getMinutes())}00`;
const calendarDateOnly = date => `${date.getFullYear()}${padCalendar(date.getMonth() + 1)}${padCalendar(date.getDate())}`;
const escapeIcs = value => String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

export function buildIcs(events, createdAt = new Date()) {
  const stamp = createdAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const eventBlocks = events.map((event, index) => [
    'BEGIN:VEVENT',
    `UID:${createdAt.getTime()}-${index}@surrendasoft.com`,
    `DTSTAMP:${stamp}`,
    event.allDay
      ? `DTSTART;VALUE=DATE:${calendarDateOnly(event.start)}`
      : `DTSTART:${calendarStamp(event.start)}`,
    event.allDay
      ? `DTEND;VALUE=DATE:${calendarDateOnly(event.end)}`
      : `DTEND:${calendarStamp(event.end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    event.location && `LOCATION:${escapeIcs(event.location)}`,
    event.description && `DESCRIPTION:${escapeIcs(event.description)}`,
    'END:VEVENT',
  ].filter(Boolean).join('\r\n')).join('\r\n');

  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//SurrendaSoft//Calendar Schedule Generator//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n${eventBlocks}\r\nEND:VCALENDAR\r\n`;
}
