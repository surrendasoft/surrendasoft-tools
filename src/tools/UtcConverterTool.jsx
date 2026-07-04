import { useState } from 'react';

export default function UtcConverterTool() {
  const toLocalInput = d => { const p = n => String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const toUtcInput = d => { const p = n => String(n).padStart(2,'0'); return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`; };
  const [local, setLocal] = useState(() => toLocalInput(new Date()));
  const [utcVal, setUtcVal] = useState(() => toUtcInput(new Date()));
  const [fromLocal, setFromLocal] = useState(true);
  const now = () => { const d = new Date(); setLocal(toLocalInput(d)); setUtcVal(toUtcInput(d)); setFromLocal(true); };
  const onLocalChange = v => { setLocal(v); setFromLocal(true); const d = new Date(v); if (!isNaN(d)) setUtcVal(toUtcInput(d)); };
  const onUtcChange = v => { setUtcVal(v); setFromLocal(false); const d = new Date(v + 'Z'); if (!isNaN(d)) setLocal(toLocalInput(d)); };
  const d = fromLocal ? new Date(local) : new Date(utcVal + 'Z');
  const valid = !isNaN(d);
  const unix = valid ? Math.floor(d.getTime() / 1000) : null;
  const iso = valid ? d.toISOString() : null;
  const offset = -new Date().getTimezoneOffset();
  const offsetStr = `UTC${offset >= 0 ? '+' : ''}${Math.floor(offset/60)}:${String(Math.abs(offset%60)).padStart(2,'0')}`;
  const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return <>
    <div className="utc-grid">
      <div className="utc-field"><label>Local time <span className="utc-tz">{tzName} ({offsetStr})</span><input type="datetime-local" value={local} onChange={e => onLocalChange(e.target.value)}/></label></div>
      <div className="utc-eq">⇄</div>
      <div className="utc-field"><label>UTC<input type="datetime-local" value={utcVal} onChange={e => onUtcChange(e.target.value)}/></label></div>
    </div>
    <button className="button secondary" style={{marginBottom:16}} onClick={now}>Use current time</button>
    {valid && <div className="utc-results">
      <div><span>Unix timestamp</span><strong>{unix}</strong></div>
      <div><span>ISO 8601</span><strong style={{fontSize:13}}>{iso}</strong></div>
      <div><span>UTC offset</span><strong>{offsetStr}</strong></div>
      <div><span>UTC date</span><strong>{d.toUTCString()}</strong></div>
    </div>}
    <p className="tool-footnote">Conversions use your device’s local timezone. Unix timestamp is seconds since 1970-01-01T00:00:00Z.</p></>;
}
