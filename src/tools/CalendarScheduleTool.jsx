import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { buildIcs } from '../utils/calendar.js';
import {
  buildScheduleEvents, formatScheduleDate, formatScheduleTime, groupEventsByDate, monthKeysForEvents,
  previewScheduleTemplate, SCHEDULE_CHIPS, scheduleDateKey,
} from '../utils/schedule.js';
import './CalendarScheduleTool.css';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function ChipTemplateField({ label, optional, value, onChange, preview, fieldRef, onInsertToken }) {
  return <label className="wide schedule-template-field">
    {label}{optional && <span>optional</span>}
    <textarea ref={fieldRef} rows={2} value={value} onChange={event => onChange(event.target.value)} placeholder="Type freely, or insert chips below"/>
    <div className="schedule-chip-row" role="group" aria-label={`Insert into ${label}`}>
      {SCHEDULE_CHIPS.map(chip => <button key={chip.id} type="button" className="schedule-chip" onClick={() => onInsertToken(chip.token)}>{chip.label}</button>)}
    </div>
    {preview && <p className="schedule-template-preview">Preview (session 1): <strong>{preview}</strong></p>}
  </label>;
}

function ScheduleMonthGrid({ year, month, eventsByDate, selectedDateKey, onSelectDate }) {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = firstDay.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  const todayKey = scheduleDateKey(new Date());
  const cells = [];

  for (let index = 0; index < startOffset; index += 1) cells.push(<div key={`blank-${index}`} className="schedule-day blank" aria-hidden="true"/>);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = scheduleDateKey(date);
    const dayEvents = eventsByDate.get(key) || [];
    const hasEvent = dayEvents.length > 0;
    cells.push(
      <button
        key={key}
        type="button"
        className={`schedule-day${hasEvent ? ' has-event' : ''}${selectedDateKey === key ? ' selected' : ''}${todayKey === key ? ' today' : ''}`}
        onClick={() => hasEvent && onSelectDate(key)}
        disabled={!hasEvent}
        aria-label={hasEvent ? `${dayEvents.length} session${dayEvents.length === 1 ? '' : 's'} on ${formatScheduleDate(date)}` : `${day} ${monthLabel}`}
      >
        <span className="schedule-day-num">{day}</span>
        {dayEvents.length === 1 && <span className="schedule-day-dot" aria-hidden="true"/>}
        {dayEvents.length > 1 && <span className="schedule-day-count">{dayEvents.length}</span>}
      </button>,
    );
  }

  return <section className="schedule-month" aria-label={monthLabel}>
    <h3 className="schedule-month-title">{monthLabel}</h3>
    <div className="schedule-month-grid">
      {WEEKDAYS.map(day => <span key={day} className="schedule-weekday">{day}</span>)}
      {cells}
    </div>
  </section>;
}

function ScheduleDayPopup({ dateKey, eventsByDate, onClose }) {
  const events = eventsByDate.get(dateKey) || [];
  useEffect(() => {
    const onKeyDown = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  if (!dateKey || !events.length) return null;
  const heading = formatScheduleDate(events[0].start);
  return <>
    <div className="schedule-day-popup-overlay" onClick={onClose} aria-hidden="true"/>
    <div className="schedule-day-popup" role="dialog" aria-modal="true" aria-labelledby="schedule-day-popup-title">
      <div className="schedule-day-popup-head">
        <h3 id="schedule-day-popup-title">{heading}</h3>
        <button type="button" className="schedule-day-popup-close" onClick={onClose} aria-label="Close"><Icon name="close" size={18}/></button>
      </div>
      <div className="schedule-day-popup-body">
        {events.map(event => <article key={event.number}>
          <strong>{event.title}</strong>
          <span>{formatScheduleTime(event.start)} – {formatScheduleTime(event.end)}{event.location ? ` · ${event.location}` : ''}</span>
          {event.description && <p>{event.description}</p>}
        </article>)}
      </div>
    </div>
  </>;
}

export default function CalendarScheduleTool() {
  const tomorrowDate = new Date(Date.now() + 86400000);
  const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;
  const [form, setForm] = useState({
    title: 'Counselling Lecture',
    titleTemplate: 'Week {{week}} - {{title}}',
    descriptionTemplate: '',
    date: tomorrow,
    start: '09:00',
    end: '11:00',
    repeat: 'weekly',
    sessions: 12,
    location: 'City campus',
  });
  const [events, setEvents] = useState([]);
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const titleTemplateRef = useRef(null);
  const descriptionTemplateRef = useRef(null);

  const update = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
    setEvents([]);
    setSelectedDateKey('');
    setError('');
    setCopied(false);
  };

  const insertToken = (field, ref, token) => {
    const value = form[field];
    const fieldNode = ref.current;
    const start = fieldNode?.selectionStart ?? value.length;
    const end = fieldNode?.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${token}${value.slice(end)}`;
    update(field, next);
    requestAnimationFrame(() => {
      fieldNode?.focus();
      const position = start + token.length;
      fieldNode?.setSelectionRange(position, position);
    });
  };

  const buildEvents = () => {
    const result = buildScheduleEvents(form);
    if (result.error) { setError(result.error); setEvents([]); setSelectedDateKey(''); return null; }
    setEvents(result.events);
    setSelectedDateKey('');
    setError('');
    return result.events;
  };

  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const monthKeys = useMemo(() => monthKeysForEvents(events), [events]);
  const titlePreview = previewScheduleTemplate(form.titleTemplate, form, 0);
  const descriptionPreview = previewScheduleTemplate(form.descriptionTemplate, form, 0);

  const summary = list => list.map(event => `${event.title} — ${formatScheduleDate(event.start)} ${formatScheduleTime(event.start)}`).join('\n');

  const download = () => {
    const list = events.length ? events : buildEvents();
    if (!list?.length) return;
    const ics = buildIcs(list);
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${form.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'schedule'}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copySummary = async () => {
    const list = events.length ? events : buildEvents();
    if (!list?.length) return;
    await navigator.clipboard?.writeText(summary(list));
    setCopied(true);
  };

  const repeatLabel = form.repeat === 'fortnightly' ? 'Fortnightly' : form.repeat === 'monthly' ? 'Monthly' : 'Weekly';

  return <>
    <div className="schedule-form">
      <label>Base event title<input value={form.title} onChange={event => update('title', event.target.value)} placeholder="e.g. Counselling Lecture"/></label>
      <label>Start date<input type="date" value={form.date} onChange={event => update('date', event.target.value)}/></label>
      <label>Repeat every<select value={form.repeat} onChange={event => update('repeat', event.target.value)}><option value="weekly">Week</option><option value="fortnightly">Fortnight</option><option value="monthly">Month</option></select></label>
      <label>Start time<input type="time" value={form.start} onChange={event => update('start', event.target.value)}/></label>
      <label>End time<input type="time" value={form.end} onChange={event => update('end', event.target.value)}/></label>
      <label>Number of sessions<input type="number" min="1" max="52" value={form.sessions} onChange={event => update('sessions', event.target.value)}/></label>
      <ChipTemplateField
        label="Title pattern"
        value={form.titleTemplate}
        onChange={value => update('titleTemplate', value)}
        preview={titlePreview}
        fieldRef={titleTemplateRef}
        onInsertToken={token => insertToken('titleTemplate', titleTemplateRef, token)}
      />
      <label className="wide">Location <span>optional</span><input value={form.location} onChange={event => update('location', event.target.value)} placeholder="e.g. City campus"/></label>
      <ChipTemplateField
        label="Description pattern"
        optional
        value={form.descriptionTemplate}
        onChange={value => update('descriptionTemplate', value)}
        preview={descriptionPreview || 'No description'}
        fieldRef={descriptionTemplateRef}
        onInsertToken={token => insertToken('descriptionTemplate', descriptionTemplateRef, token)}
      />
    </div>
    <button className="button primary schedule-generate" onClick={buildEvents}>Generate schedule</button>
    {error && <p className="pdf-error">{error}</p>}
    {events.length > 0 && <div className="schedule-output">
      <div className="schedule-output-head">
        <div><strong>{events.length}-session schedule</strong><span>{repeatLabel} · {formatScheduleDate(events[0].start)} to {formatScheduleDate(events[events.length - 1].start)}</span></div>
        <span>Ready for calendar</span>
      </div>
      <div className="schedule-calendar-wrap">
        {monthKeys.map(({ year, month }) => <ScheduleMonthGrid
          key={`${year}-${month}`}
          year={year}
          month={month}
          eventsByDate={eventsByDate}
          selectedDateKey={selectedDateKey}
          onSelectDate={setSelectedDateKey}
        />)}
      </div>
      <p className="schedule-day-empty">Tap a highlighted day to see session details.</p>
      {selectedDateKey && <ScheduleDayPopup dateKey={selectedDateKey} eventsByDate={eventsByDate} onClose={() => setSelectedDateKey('')}/>}
      <div className="schedule-actions">
        <button className="button primary" onClick={download}>Download .ics</button>
        <button className="button secondary" onClick={copySummary}><Icon name={copied ? 'check' : 'copy'} size={18}/>{copied ? 'Copied' : 'Copy calendar summary'}</button>
      </div>
      <p className="calendar-help">Import the downloaded file into Google Calendar, Apple Calendar, or Outlook. All sessions are created as separate events, so each can be edited later.</p>
    </div>}
  </>;
}
