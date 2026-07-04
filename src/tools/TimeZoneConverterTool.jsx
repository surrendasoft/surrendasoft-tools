import { useMemo, useState } from 'react';

export default function TimeZoneConverterTool() {
  const ZONES = [
    { label: 'UTC',              tz: 'UTC' },
    { label: 'London',           tz: 'Europe/London' },
    { label: 'Paris / Berlin',   tz: 'Europe/Paris' },
    { label: 'Dubai',            tz: 'Asia/Dubai' },
    { label: 'Mumbai',           tz: 'Asia/Kolkata' },
    { label: 'Singapore',        tz: 'Asia/Singapore' },
    { label: 'Tokyo',            tz: 'Asia/Tokyo' },
    { label: 'Shanghai',         tz: 'Asia/Shanghai' },
    { label: 'Sydney',           tz: 'Australia/Sydney' },
    { label: 'Auckland',         tz: 'Pacific/Auckland' },
    { label: 'New York',         tz: 'America/New_York' },
    { label: 'Chicago',          tz: 'America/Chicago' },
    { label: 'Denver',           tz: 'America/Denver' },
    { label: 'Los Angeles',      tz: 'America/Los_Angeles' },
    { label: 'São Paulo',        tz: 'America/Sao_Paulo' },
    { label: 'Honolulu',         tz: 'Pacific/Honolulu' },
  ];
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [srcTz, setSrcTz] = useState(localTz);
  const toInput = d => { const p = n => String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const [input, setInput] = useState(() => toInput(new Date()));
  const fmt = (date, tz) => { try { return new Intl.DateTimeFormat('en-AU', { timeZone: tz, weekday:'short', day:'numeric', month:'short', hour:'numeric', minute:'2-digit', hour12:true, timeZoneName:'short' }).format(date); } catch { return '—'; } };
  const getOffset = tz => { try { const s = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName'); return s?.value || ''; } catch { return ''; } };
  const srcDate = useMemo(() => { if (!input) return null; try { return new Date(new Intl.DateTimeFormat('en-CA', { timeZone: srcTz, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).format(new Date(input)).replace(/,/,'').replace(/\//g,'-').replace(' ','T') + '+00:00'); } catch { return null; } }, [input, srcTz]);
  // simpler approach: treat datetime-local as src timezone by computing offset
  const convert = useMemo(() => {
    if (!input) return null;
    // Build a Date by interpreting the input as being in srcTz
    const naive = new Date(input); // treat as local; we'll offset
    const localOffset = naive.getTimezoneOffset(); // minutes behind UTC
    const srcOffsetMs = (() => { try { const now = naive; const utcStr = new Intl.DateTimeFormat('en-CA', { timeZone: srcTz, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).format(now); const interpreted = new Date(utcStr.replace(/\//g,'-').replace(', ','T')); return now - interpreted; } catch { return 0; } })();
    const utcMs = naive.getTime() + naive.getTimezoneOffset() * 60000 + srcOffsetMs;
    return new Date(utcMs);
  }, [input, srcTz]);
  const allZones = ZONES.some(z => z.tz === srcTz) ? ZONES : [{ label: 'Source', tz: srcTz }, ...ZONES];
  return <>
    <div className="tz-controls">
      <label className="tz-label">Date &amp; time<input type="datetime-local" value={input} onChange={e => setInput(e.target.value)}/></label>
      <label className="tz-label">Source timezone
        <select value={srcTz} onChange={e => setSrcTz(e.target.value)}>
          {[...new Set([localTz, ...ZONES.map(z => z.tz)])].map(tz => <option key={tz} value={tz}>{tz.replace(/_/g,' ')}</option>)}
        </select>
      </label>
      <button className="button secondary" onClick={() => { setInput(toInput(new Date())); setSrcTz(localTz); }}>Now</button>
    </div>
    {convert && <div className="tz-results">
      {allZones.map(z => {
        const isSrc = z.tz === srcTz;
        return <div key={z.tz} className={`tz-row${isSrc ? ' tz-src' : ''}`}>
          <span className="tz-city">{z.label}</span>
          <span className="tz-offset">{getOffset(z.tz)}</span>
          <strong className="tz-time">{fmt(convert, z.tz)}</strong>
        </div>;
      })}
    </div>}
    <p className="tool-footnote">Uses your browser’s built-in timezone database. Daylight saving is applied automatically.</p></>;
}
