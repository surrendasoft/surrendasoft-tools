import { useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { formatBytes } from '../utils/format.js';
import ToolGlyph from '../components/ToolGlyph.jsx';

const FV_TEXT_EXTS = new Set(['txt','md','csv','json','xml','yaml','yml','toml','ini','cfg','log',
  'js','ts','jsx','tsx','mjs','cjs','py','css','html','htm','sh','bash','zsh','rb','php',
  'java','c','cpp','h','go','rs','swift','kt','sql','graphql','env','gitignore','nvmrc',
  'editorconfig','prettierrc','eslintrc','babelrc','dockerfile','makefile','ics']);

const icsDateBadge = str => {
  if (!str) return { day: '?', mon: '', weekday: '' };
  try {
    const d = new Date(`${str.slice(0,4)}-${str.slice(4,6)}-${str.slice(6,8)}`);
    if (isNaN(d)) return { day: '?', mon: '', weekday: '' };
    return { day: d.getDate(), mon: d.toLocaleDateString('en-AU',{month:'short'}).toUpperCase(), weekday: d.toLocaleDateString('en-AU',{weekday:'short'}) };
  } catch { return { day: '?', mon: '', weekday: '' }; }
};

const fmtIcsDate = str => {
  if (!str) return '';
  const isAllDay = str.length === 8;
  const clean = str.replace(/Z$/, '');
  try {
    if (isAllDay) return new Date(`${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}`).toLocaleDateString('en-AU', {weekday:'short',day:'numeric',month:'long',year:'numeric'});
    const dt = `${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}T${clean.slice(9,11)}:${clean.slice(11,13)}:${clean.slice(13,15)}${str.endsWith('Z')?'Z':''}`;
    const d = new Date(dt);
    return isNaN(d) ? str : d.toLocaleString('en-AU', {weekday:'short',day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});
  } catch { return str; }
};

const parseIcs = text => {
  const events = [];
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = unfolded.split('BEGIN:VEVENT');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0];
    const props = {};
    for (const line of block.split('\n')) {
      const colon = line.indexOf(':');
      if (colon < 0) continue;
      const key = line.slice(0, colon).split(';')[0].toUpperCase().trim();
      const val = line.slice(colon + 1).trim();
      if (key && val) props[key] = val;
    }
    if (props.SUMMARY || props.DTSTART) events.push(props);
  }
  // sort by DTSTART
  events.sort((a, b) => (a.DTSTART || '').localeCompare(b.DTSTART || ''));
  return events;
};

export default function FileViewerTool() {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null); // image|audio|video|pdf|text|binary
  const [objUrl, setObjUrl] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [edited, setEdited] = useState(false);
  const [hexBytes, setHexBytes] = useState(null);
  const [view, setView] = useState('raw'); // raw|table|preview
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');

  const getExt = name => name.includes('.') ? name.split('.').pop().toLowerCase() : '';

  const detect = f => {
    const ext = getExt(f.name), mime = f.type || '';
    if (mime.startsWith('image/') || ['jpg','jpeg','png','gif','webp','bmp','svg','ico','avif'].includes(ext)) return 'image';
    if (mime.startsWith('audio/') || ['mp3','wav','ogg','flac','aac','m4a','opus'].includes(ext)) return 'audio';
    if (mime.startsWith('video/') || ['mp4','webm','mov','avi','mkv','m4v'].includes(ext)) return 'video';
    if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (mime.startsWith('text/') || FV_TEXT_EXTS.has(ext)) return 'text';
    return 'unknown';
  };

  const reset = () => {
    if (objUrl) URL.revokeObjectURL(objUrl);
    setFile(null); setFileType(null); setObjUrl(null); setTextContent('');
    setEdited(false); setHexBytes(null); setView('raw'); setErr('');
  };

  const load = async f => {
    if (objUrl) URL.revokeObjectURL(objUrl);
    const initView = getExt(f.name) === 'ics' ? 'calendar' : 'raw';
    setFile(f); setErr(''); setEdited(false); setHexBytes(null); setCopied(false); setView(initView);
    const type = detect(f);
    if (['image','audio','video','pdf'].includes(type)) {
      setFileType(type); setObjUrl(URL.createObjectURL(f)); return;
    }
    try {
      const text = await f.text();
      if (text.includes('\x00')) throw new Error('binary');
      const ext = getExt(f.name);
      let display = text;
      if (ext === 'json') { try { display = JSON.stringify(JSON.parse(text), null, 2); } catch {} }
      setFileType('text'); setTextContent(display); setObjUrl(null);
    } catch {
      setFileType('binary');
      try { const buf = await f.arrayBuffer(); setHexBytes(new Uint8Array(buf.slice(0, 512))); }
      catch { setErr('Could not read file contents.'); }
    }
  };

  const ext = file ? getExt(file.name) : '';
  const lineCount = useMemo(() => textContent ? textContent.split('\n').length : 0, [textContent]);

  const icsEvents = useMemo(() => ext === 'ics' && textContent ? parseIcs(textContent) : null, [ext, textContent]);

  const csvRows = useMemo(() => {
    if (ext !== 'csv' || !textContent) return null;
    return textContent.trim().split('\n').map(row => {
      const cells = []; let cell = '', inQ = false;
      for (const ch of row) {
        if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { cells.push(cell); cell = ''; }
        else cell += ch;
      }
      cells.push(cell); return cells;
    });
  }, [ext, textContent]);

  const hexRows = useMemo(() => {
    if (!hexBytes) return [];
    const rows = [];
    for (let i = 0; i < hexBytes.length; i += 16) {
      const chunk = hexBytes.slice(i, i + 16);
      rows.push({
        off: i.toString(16).padStart(8, '0'),
        hex: Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ').padEnd(47, ' '),
        asc: Array.from(chunk).map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : '\u00b7').join(''),
      });
    }
    return rows;
  }, [hexBytes]);

  const download = () => {
    const blob = new Blob([textContent], { type: file?.type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copyAll = async () => {
    try { await navigator.clipboard.writeText(textContent); } catch {}
    setCopied(true); setTimeout(() => setCopied(false), 1400);
  };

  const formatJson = () => {
    try { setTextContent(JSON.stringify(JSON.parse(textContent), null, 2)); setEdited(true); setErr(''); }
    catch { setErr('Invalid JSON — cannot format.'); }
  };

  if (!file) return <label className="bgr-upload-zone">
    <input type="file" style={{display:'none'}} onChange={e => e.target.files[0] && load(e.target.files[0])}/>
    <div className="bgr-drop" onDrop={e=>{e.preventDefault();e.dataTransfer.files[0]&&load(e.dataTransfer.files[0]);}} onDragOver={e=>e.preventDefault()}>
      <ToolGlyph name="folder" size={40}/>
      <p>Drop any file or <u>browse</u></p>
      <small>Text, code, JSON, CSV, HTML, ICS calendar, images, audio, video, PDF — or binary hex dump</small>
    </div>
  </label>;

  const btnOn = { background:'#10183e', color:'#fff', borderColor:'#10183e' };

  return <>
    <div className="fv-bar">
      <div className="fv-meta">
        <span className="fv-ext">{(ext || '?').toUpperCase()}</span>
        <strong className="fv-name">{file.name}</strong>
        <span className="fv-dim">{formatBytes(file.size)}</span>
        {fileType === 'text' && <span className="fv-dim">{lineCount} line{lineCount !== 1 ? 's' : ''}</span>}
        {edited && <span className="fv-changed">&#9679; edited</span>}
      </div>
      <div className="fv-acts">
        {ext === 'csv' && <button className="button secondary" style={view==='table'?btnOn:{}} onClick={()=>setView(v=>v==='table'?'raw':'table')}>Table view</button>}
        {ext === 'ics' && <button className="button secondary" style={view==='calendar'?btnOn:{}} onClick={()=>setView(v=>v==='calendar'?'raw':'calendar')}>Calendar</button>}
        {(ext === 'html' || ext === 'htm') && <button className="button secondary" style={view==='preview'?btnOn:{}} onClick={()=>setView(v=>v==='preview'?'raw':'preview')}>Preview</button>}
        {ext === 'json' && <button className="button secondary" onClick={formatJson}>Format JSON</button>}
        {fileType === 'text' && <button className="button secondary" onClick={copyAll}><Icon name={copied?'check':'copy'} size={15}/>{copied?' Copied':' Copy all'}</button>}
        {fileType === 'text' && <button className="button primary" onClick={download}>Download{edited?' *':''}</button>}
        <button className="button secondary" onClick={reset}>New file</button>
      </div>
    </div>
    {err && <p className="pdf-error" style={{marginBottom:12}}>{err}</p>}
    {fileType === 'image' && <div className="fv-img-wrap"><img src={objUrl} alt={file.name}/></div>}
    {fileType === 'audio' && <div className="fv-media-wrap"><audio controls src={objUrl}/></div>}
    {fileType === 'video' && <div className="fv-media-wrap"><video controls src={objUrl}/></div>}
    {fileType === 'pdf' && <div className="fv-pdf-wrap"><iframe src={objUrl} title={file.name}/></div>}
    {fileType === 'text' && view === 'raw' && <textarea className="fv-textarea" value={textContent} onChange={e=>{setTextContent(e.target.value);setEdited(true);}} spellCheck={false} aria-label="File contents — editable"/>}
    {fileType === 'text' && view === 'table' && csvRows && <div className="fv-table-wrap"><table className="fv-table"><thead><tr>{csvRows[0]?.map((h,i)=><th key={i}>{h||`Col ${i+1}`}</th>)}</tr></thead><tbody>{csvRows.slice(1).map((row,r)=><tr key={r}>{row.map((cell,c)=><td key={c}>{cell}</td>)}</tr>)}</tbody></table></div>}
    {fileType === 'text' && view === 'preview' && <iframe sandbox="allow-scripts" srcDoc={textContent} title="HTML preview" className="fv-preview-frame"/>}
    {fileType === 'text' && view === 'calendar' && icsEvents && <div className="fv-cal">
      {icsEvents.length === 0
        ? <p className="fv-cal-empty">No events found in this calendar file.</p>
        : icsEvents.map((ev, i) => {
            const badge = icsDateBadge(ev.DTSTART);
            const allDay = ev.DTSTART && ev.DTSTART.length === 8;
            return <div key={i} className="fv-cal-event">
              <div className="fv-cal-badge"><span className="fv-cal-badge-day">{badge.day}</span><span className="fv-cal-badge-mon">{badge.mon}</span></div>
              <div className="fv-cal-body">
                <div className="fv-cal-title">{ev.SUMMARY || '(No title)'}</div>
                {ev.DTSTART && <div className="fv-cal-time">{allDay ? `${badge.weekday} · All day` : `${badge.weekday} · ${fmtIcsDate(ev.DTSTART)}${ev.DTEND && ev.DTEND !== ev.DTSTART ? ' → '+fmtIcsDate(ev.DTEND) : ''}`}</div>}
                <div className="fv-cal-meta">
                  {ev.LOCATION && <span>&#128205; {ev.LOCATION}</span>}
                  {ev.STATUS && ev.STATUS !== 'CONFIRMED' && <span>{ev.STATUS}</span>}
                  {ev.RRULE && <span>&#128257; Repeating</span>}
                  {ev.ORGANIZER && <span>&#128100; {ev.ORGANIZER.replace(/^.*CN=/,'').replace(/:.*/,'')}</span>}
                </div>
                {ev.DESCRIPTION && <div className="fv-cal-desc">{ev.DESCRIPTION.replace(/\\n/g,'\n').replace(/\\,/g,',')}</div>}
              </div>
            </div>;
          })
      }
      <p className="fv-hex-note" style={{marginTop:4}}>{icsEvents.length} event{icsEvents.length !== 1?'s':''} · switch to raw view to edit</p>
    </div>}
    {fileType === 'binary' && hexRows.length > 0 && <div className="fv-hex-outer">
      <p className="fv-hex-note">Hex dump — first {hexBytes.length} of {formatBytes(file.size)}</p>
      <div className="fv-hex">
        <div className="fv-hex-head"><span>Offset</span><span>Hex (16 bytes/row)</span><span>ASCII</span></div>
        {hexRows.map((row,i)=><div key={i} className="fv-hex-row"><span>{row.off}</span><span>{row.hex}</span><span>{row.asc}</span></div>)}
      </div>
      <p className="fv-hex-note" style={{marginTop:8}}>Binary file — open it in the appropriate application to view its full content.</p>
    </div>}
  </>;
}
