import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { buildIcs, padCalendar } from '../utils/calendar.js';

export default function CalendarScheduleTool() {
  const tomorrowDate = new Date(Date.now() + 86400000);
  const tomorrow = `${tomorrowDate.getFullYear()}-${padCalendar(tomorrowDate.getMonth() + 1)}-${padCalendar(tomorrowDate.getDate())}`;
  const [form, setForm] = useState({ title: 'Counselling Lecture', date: tomorrow, start: '09:00', end: '11:00', repeat: 'weekly', sessions: 12, location: 'City campus', description: 'Master of Counselling class', titleFormat: 'week' });
  const [events, setEvents] = useState([]), [error, setError] = useState(''), [copied, setCopied] = useState(false);
  const update = (field, value) => { setForm(current => ({ ...current, [field]: value })); setEvents([]); setError(''); setCopied(false); };
  const createDate = (date, time) => new Date(`${date}T${time}:00`);
  const sessionDate = (start, index) => {
    if (form.repeat !== 'monthly') return new Date(start.getTime() + index * (form.repeat === 'fortnightly' ? 14 : 7) * 86400000);
    const result = new Date(start), day = start.getDate();
    result.setDate(1); result.setMonth(start.getMonth() + index);
    result.setDate(Math.min(day, new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()));
    return result;
  };
  const buildEvents = () => {
    const start = createDate(form.date, form.start), end = createDate(form.date, form.end), count = Math.min(52, Math.max(1, Number(form.sessions) || 1));
    if (!form.title.trim()) return setError('Enter an event title.');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return setError('Choose a valid date and time.');
    if (end <= start) return setError('End time must be later than start time.');
    const duration = end - start;
    const nextEvents = Array.from({ length: count }, (_, index) => {
      const eventStart = sessionDate(start, index), eventEnd = new Date(sessionDate(start, index).getTime() + duration);
      return { title: formatEventTitle(index), start: eventStart, end: eventEnd, location: form.location.trim(), description: form.description.trim(), number: index + 1 };
    });
    setEvents(nextEvents); setError(''); return nextEvents;
  };
  const formatEventTitle = index => {
    const baseTitle = form.title.trim() || 'Event title';
    if (form.titleFormat === 'week') return `Week ${index + 1} - ${baseTitle}`;
    if (form.titleFormat === 'session') return `Session ${index + 1} - ${baseTitle}`;
    return baseTitle;
  };
  const summary = list => list.map(event => `${event.title} — ${event.start.toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`).join('\n');
  const download = () => {
    const list = events.length ? events : buildEvents(); if (!list?.length) return;
    const ics = buildIcs(list);
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${form.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'schedule'}.ics`; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const copySummary = async () => { const list = events.length ? events : buildEvents(); if (!list?.length) return; await navigator.clipboard?.writeText(summary(list)); setCopied(true); };
  const displayDate = date => date.toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  return <>
    <div className="schedule-form">
      <label className="wide">Base event title<input value={form.title} onChange={event => update('title', event.target.value)} placeholder="e.g. Counselling Lecture"/></label>
      <label>Start date<input type="date" value={form.date} onChange={event => update('date', event.target.value)}/></label>
      <label>Repeat every<select value={form.repeat} onChange={event => update('repeat', event.target.value)}><option value="weekly">Week</option><option value="fortnightly">Fortnight</option><option value="monthly">Month</option></select></label>
      <label>Start time<input type="time" value={form.start} onChange={event => update('start', event.target.value)}/></label>
      <label>End time<input type="time" value={form.end} onChange={event => update('end', event.target.value)}/></label>
      <label>Number of sessions<input type="number" min="1" max="52" value={form.sessions} onChange={event => update('sessions', event.target.value)}/></label>
      <label>Title format<select value={form.titleFormat} onChange={event => update('titleFormat', event.target.value)}><option value="same">Same title every time</option><option value="week">Week 1 - Title</option><option value="session">Session 1 - Title</option></select><small className="schedule-sample">First event: {formatEventTitle(0)}</small></label>
      <label className="wide">Location <span>optional</span><input value={form.location} onChange={event => update('location', event.target.value)} placeholder="e.g. City campus"/></label>
      <label className="wide">Description <span>optional</span><textarea rows="2" value={form.description} onChange={event => update('description', event.target.value)} placeholder="Notes for every event"/></label>
    </div>
    <button className="button primary schedule-generate" onClick={buildEvents}>Generate schedule</button>
    {error && <p className="pdf-error">{error}</p>}
    {events.length > 0 && <div className="schedule-output"><div className="schedule-output-head"><div><strong>{events.length}-session schedule</strong><span>{form.repeat === 'fortnightly' ? 'Fortnightly' : form.repeat === 'monthly' ? 'Monthly' : 'Weekly'} · {displayDate(events[0].start)} to {displayDate(events[events.length - 1].start)}</span></div><span>Ready for calendar</span></div><div className="schedule-preview">{events.map(event => <div key={event.number}><b>{event.number}</b><p><strong>{event.title}</strong><span>{displayDate(event.start)} – {event.end.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}{event.location ? ` · ${event.location}` : ''}</span></p></div>)}</div><div className="schedule-actions"><button className="button primary" onClick={download}>Download .ics</button><button className="button secondary" onClick={copySummary}><Icon name={copied ? 'check' : 'copy'} size={18}/>{copied ? 'Copied' : 'Copy calendar summary'}</button></div><p className="calendar-help">Import the downloaded file into Google Calendar, Apple Calendar, or Outlook. All sessions are created as separate events, so each can be edited later.</p></div>}
  </>;
}
