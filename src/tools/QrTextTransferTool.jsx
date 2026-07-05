import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import Icon from '../components/Icon.jsx';
import ToolGlyph from '../components/ToolGlyph.jsx';
import { formatBytes } from '../utils/format.js';
import { buildEventTransferUrl, buildFileTransfer, buildTransferUrl, buildVCard, condenseImageForQr, isCondensableImage, isEventTransferRoute, isFileTransferRoute, isSafeWebLink, isTextLikeFile, parseAllVCards, parseVCard, QR_FILE_SOURCE_LIMIT, QR_IMAGE_SOURCE_LIMIT, QR_TEXT_HARD_LIMIT, readEventPayload, readFileTransfer, readTransferPayload, validateTransferSource, validateTransferText } from '../utils/qrTextTransfer.js';
import { buildIcs } from '../calendar.js';
import './QrTextTransferTool.css';
import './QrTextTransferFile.css';

const routePayload = () => readTransferPayload(window.location.hash);

export default function QrTextTransferTool() {
  const [received, setReceived] = useState(routePayload);
  const [receivedFile, setReceivedFile] = useState(null);
  const [receivedEvent, setReceivedEvent] = useState(() => readEventPayload(window.location.hash));
  const [routeLoading, setRouteLoading] = useState(isFileTransferRoute(window.location.hash));
  const [mode, setMode] = useState('send');

  useEffect(() => {
    const onHash = async () => {
      const text = routePayload();
      setReceived(text); setReceivedFile(null); setReceivedEvent(null);
      if (isFileTransferRoute(window.location.hash)) {
        setRouteLoading(true); setReceivedFile(await readFileTransfer(window.location.hash)); setRouteLoading(false);
      } else if (isEventTransferRoute(window.location.hash)) {
        const ics = readEventPayload(window.location.hash);
        if (ics) setReceivedEvent(ics);
        setRouteLoading(false);
      } else setRouteLoading(false);
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const resetRoute = () => {
    window.location.hash = 'textqr';
    setReceived(null); setReceivedFile(null); setReceivedEvent(null); setRouteLoading(false);
  };

  if (routeLoading) return <div className="qrt-route-loading" role="status"><ToolGlyph name="qr" size={34}/><strong>Decoding tiny file…</strong><span>Everything is happening in this browser.</span></div>;
  if (receivedFile) return <ReceivedFile file={receivedFile} onClear={resetRoute}/>;
  if (receivedEvent) return <ReceivedEvent icsText={receivedEvent} onClear={resetRoute}/>;
  if (received !== null) {
    const trimmed = received.trimStart();
    if (trimmed.startsWith('BEGIN:VCARD')) return <ReceivedContact text={received} onClear={resetRoute}/>;
    return <ReceivedText text={received} onClear={resetRoute}/>;
  }

  return <div className="qrt-root">
    <div className="qrt-promise"><ToolGlyph name="qr" size={22}/><div><strong>Text, files, contacts and events via QR code</strong><span>No backend, account, upload, or temporary room.</span></div></div>
    <div className="qrt-tabs" role="group" aria-label="QR text transfer mode"><button className={mode === 'send' ? 'active' : ''} aria-pressed={mode === 'send'} onClick={() => setMode('send')}><ToolGlyph name="arrowRight" size={17}/> Create QR</button><button className={mode === 'scan' ? 'active' : ''} aria-pressed={mode === 'scan'} onClick={() => setMode('scan')}><ToolGlyph name="camera" size={17}/> Scan QR</button></div>
    {mode === 'send' ? <CreateTransfer/> : <ScanTransfer onResult={setReceived}/>} 
    <div className="qrt-privacy"><Icon name="shield" size={20}/><p><strong>Keep private information out of QR codes.</strong> Anyone who can see or scan the code can read its contents.</p></div>
  </div>;
}

function CreateTransfer() {
  const [kind, setKind] = useState('text');
  return (
    <div className="qrt-send-wrap">
      <div className="qrt-kind-tabs" role="group" aria-label="Transfer content type">
        <button className={kind === 'text' ? 'active' : ''} aria-pressed={kind === 'text'} onClick={() => setKind('text')}><ToolGlyph name="text" size={15}/> Text or link</button>
        <button className={kind === 'contact' ? 'active' : ''} aria-pressed={kind === 'contact'} onClick={() => setKind('contact')}><ToolGlyph name="userRound" size={15}/> Contacts</button>
        <button className={kind === 'event' ? 'active' : ''} aria-pressed={kind === 'event'} onClick={() => setKind('event')}><ToolGlyph name="calendarPlus" size={15}/> Events</button>
        <button className={kind === 'file' ? 'active' : ''} aria-pressed={kind === 'file'} onClick={() => setKind('file')}><ToolGlyph name="fileText" size={15}/> Tiny file</button>
      </div>
      {kind === 'text' && <CreateTextTransfer/>}
      {kind === 'file' && <CreateFileTransfer/>}
      {kind === 'contact' && <CreateContactTransfer/>}
      {kind === 'event' && <CreateEventTransfer/>}
    </div>
  );
}

function CreateTextTransfer() {
  const [text, setText] = useState('');
  const [transferUrl, setTransferUrl] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const canvasRef = useRef(null);
  const validation = validateTransferText(text);

  useEffect(() => {
    if (!transferUrl || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, transferUrl, { width: 320, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#10183e', light: '#ffffff' } }, qrError => {
      if (qrError) setError('This text could not fit into a reliable QR code. Try shortening it.');
    });
  }, [transferUrl]);

  const generate = () => {
    if (!validation.valid) { setError(validation.error); setTransferUrl(''); return; }
    setError(''); setTransferUrl(buildTransferUrl(text)); setCopied('');
  };
  const copy = async (value, key) => { await navigator.clipboard?.writeText(value); setCopied(key); window.setTimeout(() => setCopied(''), 1400); };
  const download = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a'); link.download = 'surrendasoft-text-transfer.png'; link.href = canvasRef.current.toDataURL('image/png'); link.click();
  };

  return <div className={`qrt-create${transferUrl ? ' has-result' : ''}`}>
    <section className="qrt-compose">
      <div className="qrt-section-label"><span>1</span><div><strong>What text do you want to send?</strong><small>Links, notes, addresses, commands, or short lists work well.</small></div></div>
      <label className="qrt-textarea"><textarea value={text} onChange={event => { setText(event.target.value); setTransferUrl(''); setError(''); }} rows="9" maxLength={QR_TEXT_HARD_LIMIT + 100} placeholder="Type or paste text here…" aria-label="Text to transfer"/><span className={text.length > QR_TEXT_HARD_LIMIT ? 'over' : ''}>{text.length.toLocaleString()} / {QR_TEXT_HARD_LIMIT.toLocaleString()}</span></label>
      {validation.warning && <p className="qrt-warning"><ToolGlyph name="warning" size={17}/>{validation.warning}</p>}
      {error && <p className="qrt-error">{error}</p>}
      <button className="button primary qrt-generate" onClick={generate} disabled={!text.trim() || text.length > QR_TEXT_HARD_LIMIT}><ToolGlyph name="qr" size={18}/> Generate transfer QR</button>
    </section>
    {transferUrl && <section className="qrt-result" aria-label="Generated transfer QR">
      <div className="qrt-section-label"><span>2</span><div><strong>Scan this on your other device</strong><small>It opens SurrendaSoft Tools and displays the text.</small></div></div>
      <div className="qrt-code"><canvas ref={canvasRef}/></div>
      <p className="qrt-contains">The QR contains the transfer URL and encoded text—nothing is uploaded.</p>
      <div className="qrt-actions"><button className="button primary" onClick={() => copy(text, 'text')}><Icon name={copied === 'text' ? 'check' : 'copy'} size={17}/>{copied === 'text' ? 'Copied text' : 'Copy text'}</button><button className="button secondary" onClick={() => copy(transferUrl, 'link')}><Icon name={copied === 'link' ? 'check' : 'copy'} size={17}/>{copied === 'link' ? 'Copied link' : 'Copy transfer link'}</button><button className="button secondary" onClick={download}>Download QR</button></div>
    </section>}
  </div>;
}

function CreateFileTransfer() {
  const [file, setFile] = useState(null), [result, setResult] = useState(null), [error, setError] = useState(''), [working, setWorking] = useState(false), [copied, setCopied] = useState(false);
  const [sourcePreview, setSourcePreview] = useState('');
  const canvasRef = useRef(null);
  const validation = validateTransferSource(file);
  const imageSource = isCondensableImage(file);
  useEffect(() => {
    if (!imageSource) { setSourcePreview(''); return undefined; }
    const url = URL.createObjectURL(file);
    setSourcePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, imageSource]);
  useEffect(() => () => { if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl); }, [result]);
  useEffect(() => {
    if (!result?.url || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, result.url, { width: 320, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#10183e', light: '#ffffff' } }, qrError => qrError && setError('The encoded file did not fit into a reliable QR code.'));
  }, [result]);
  const create = async () => {
    if (!validation.valid) { setError(validation.error); return; }
    setWorking(true); setError(''); setResult(null);
    try {
      const image = imageSource ? await condenseImageForQr(file) : null;
      const transfer = await buildFileTransfer(image?.file || file);
      setResult({ ...transfer, image, previewUrl: image ? URL.createObjectURL(image.file) : '' });
    } catch (createError) { setError(createError.message); }
    setWorking(false);
  };
  const copyLink = async () => { await navigator.clipboard?.writeText(result.url); setCopied(true); window.setTimeout(() => setCopied(false), 1400); };
  const downloadQr = () => { const link = document.createElement('a'); link.download = `${result.name.replace(/\.[^.]+$/, '') || 'tiny-file'}-qr.png`; link.href = canvasRef.current.toDataURL('image/png'); link.click(); };
  return <div className={`qrt-create${result ? ' has-result' : ''}`}><section className="qrt-compose">
    <div className="qrt-section-label"><span>1</span><div><strong>Choose a tiny file or image</strong><small>Text-like files remain intact. Images are resized into a tiny QR preview.</small></div></div>
    <label className="qrt-file-drop"><input type="file" aria-label="Choose a tiny file or image" onChange={event => { setFile(event.target.files?.[0] || null); setResult(null); setError(''); }}/><ToolGlyph name={imageSource ? 'image' : 'fileText'} size={34}/><strong>{file ? file.name : 'Choose a file or image'}</strong><span>{file ? `${formatBytes(file.size)} · ${file.type || 'Unknown type'}` : `Files up to ${formatBytes(QR_FILE_SOURCE_LIMIT)}; source images up to ${formatBytes(QR_IMAGE_SOURCE_LIMIT)}.`}</span></label>
    {sourcePreview && <div className="qrt-source-preview"><span>Original image</span><img src={sourcePreview} alt="Original selected preview"/><small>{formatBytes(file.size)} · Will be condensed locally</small></div>}
    {file && validation.valid && <div className="qrt-file-ready"><Icon name="check" size={17}/><span>{imageSource ? 'Ready to auto-condense and test against QR capacity.' : 'Ready to compress and test against QR capacity.'}</span></div>}
    {error && <p className="qrt-error">{error}</p>}
    <button className="button primary qrt-generate" onClick={create} disabled={!file || !validation.valid || working}><ToolGlyph name="qr" size={18}/>{working ? 'Condensing and checking…' : imageSource ? 'Auto-condense & create QR' : 'Create file QR'}</button>
    <p className="qrt-tiny-explain">For images, the condensed preview—not the original—is transferred. PDFs, Office files, and ZIPs remain too large.</p>
  </section>{result && <section className="qrt-result" aria-label="Generated file transfer QR">
    <div className="qrt-section-label"><span>2</span><div><strong>Scan to reconstruct the file</strong><small>The receiving browser rebuilds the transferred file.</small></div></div>
    {result.image && <><div className="qrt-image-compare qrt-image-compare-single"><figure><span>QR version being sent</span><img src={result.previewUrl} alt="Condensed QR image preview"/><figcaption>{result.image.width} × {result.image.height} · {formatBytes(result.image.condensedSize)}</figcaption></figure></div><p className="qrt-condensed-notice"><Icon name="check" size={16}/> Auto-condensed locally from {formatBytes(result.image.originalSize)} to {formatBytes(result.image.condensedSize)}. This QR version is what will be sent.</p></>}
    <div className="qrt-code"><canvas ref={canvasRef}/></div>
    <div className="qrt-file-stats"><div><span>Original</span><strong>{formatBytes(result.originalSize)}</strong></div><div><span>QR payload</span><strong>{formatBytes(result.packedSize)}</strong></div><div><span>Encoding</span><strong>{result.compressed ? 'Gzip' : 'Raw'}</strong></div></div>
    <p className="qrt-contains">The complete file and its metadata are inside this QR URL. Nothing is uploaded.</p>
    <div className="qrt-actions"><button className="button primary" onClick={copyLink}><Icon name={copied ? 'check' : 'copy'} size={17}/>{copied ? 'Copied link' : 'Copy transfer link'}</button><button className="button secondary" onClick={downloadQr}>Download QR</button></div>
  </section>}</div>;
}

// ── Text segmentation for inline chips ────────────────────────────────────

function consumedRanges(matches) {
  return { has: (s, e) => matches.some(m => s < m.end && e > m.start) };
}

function parseSegments(raw) {
  const matches = [];
  for (const m of raw.matchAll(/https?:\/\/[^\s<>"')\]]+/g)) {
    const val = m[0].replace(/[.,;:!?]+$/, '');
    matches.push({ type: 'url', value: val, start: m.index, end: m.index + val.length });
  }
  const used = () => consumedRanges(matches);
  for (const m of raw.matchAll(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)) {
    if (!used().has(m.index, m.index + m[0].length))
      matches.push({ type: 'email', value: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length });
  }
  for (const m of raw.matchAll(/\+?[\d][\d\s\-().]{6,20}[\d]/g)) {
    const digits = (m[0].match(/\d/g) || []).length;
    if (digits >= 7 && !used().has(m.index, m.index + m[0].length))
      matches.push({ type: 'phone', value: m[0].trim(), start: m.index, end: m.index + m[0].length });
  }
  const phoneNums = new Set(matches.filter(m => m.type === 'phone').flatMap(m => [...(m.value.match(/\d+/g) || [])]));
  for (const m of raw.matchAll(/(?:^|[\s:,#])(\d{4,8})(?=[\s:,.!?]|$)/gm)) {
    const v = m[1], lead = m[0].length - v.length, start = m.index + lead, end = start + v.length;
    if (!/^(19|20)\d{2}$/.test(v) && !phoneNums.has(v) && !used().has(start, end))
      matches.push({ type: 'otp', value: v, start, end });
  }
  matches.sort((a, b) => a.start - b.start);
  const segs = []; let pos = 0;
  for (const match of matches) {
    if (match.start > pos) segs.push({ type: 'text', value: raw.slice(pos, match.start) });
    segs.push(match); pos = match.end;
  }
  if (pos < raw.length) segs.push({ type: 'text', value: raw.slice(pos) });
  return segs;
}

function ActionSheet({ item, rect, onClose, saveContact }) {
  const isMobile = window.innerWidth < 640;
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  const copy = label => ({ label, icon: '📋', onClick: () => { navigator.clipboard?.writeText(item.value); onClose(); } });
  const actions = item.type === 'phone' ? [
    { label: 'Call', icon: '📞', href: `tel:${item.value.replace(/[\s\-().]/g, '')}` },
    { label: 'Save contact', icon: '👤', onClick: () => { saveContact(item.value); onClose(); } },
    copy('Copy number'),
  ] : item.type === 'email' ? [
    { label: 'Send email', icon: '✉️', href: `mailto:${item.value}` },
    copy('Copy email'),
  ] : item.type === 'otp' ? [copy('Copy code')] : [copy('Copy')];
  const els = actions.map((a, i) =>
    a.href
      ? <a key={i} className="qrt-sa-item" href={a.href} target={a.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer noopener" onClick={onClose}><span className="qrt-sa-icon">{a.icon}</span>{a.label}</a>
      : <button key={i} className="qrt-sa-item" onClick={a.onClick}><span className="qrt-sa-icon">{a.icon}</span>{a.label}</button>
  );
  if (isMobile) return (
    <><div className="qrt-overlay" onClick={onClose}/>
    <div className="qrt-sheet" role="dialog" aria-modal="true">
      <span className="qrt-sheet-handle"/>
      <p className="qrt-sheet-val">{item.value}</p>
      <div className="qrt-sheet-actions">{els}</div>
      <button className="qrt-sheet-cancel" onClick={onClose}>Cancel</button>
    </div></>
  );
  const top = rect ? Math.min(rect.bottom + 6, window.innerHeight - 220) : 160;
  const left = rect ? Math.max(8, Math.min(rect.left, window.innerWidth - 210)) : 160;
  return (
    <><div className="qrt-overlay qrt-overlay-clear" onClick={onClose}/>
    <div className="qrt-popover" style={{ top, left }} role="dialog" aria-modal="true">
      <p className="qrt-popover-val">{item.value}</p>
      {els}
    </div></>
  );
}

function ReceivedText({ text, onClear }) {
  const [editText, setEditText]   = useState(text);
  const [isEditing, setIsEditing] = useState(false);
  const [sheet, setSheet]         = useState(null);
  const [copied, setCopied]       = useState(false);

  const copyAll = async () => { await navigator.clipboard?.writeText(editText); setCopied(true); window.setTimeout(() => setCopied(false), 1400); };
  const saveContact = phone => {
    const clean = phone.replace(/[^\d+]/g, '');
    const vcf = `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${phone}\r\nTEL:${clean}\r\nEND:VCARD`;
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([vcf], { type: 'text/vcard;charset=utf-8' })), download: `contact-${clean}.vcf` });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const segments = parseSegments(editText);
  const hasChips = segments.some(s => s.type !== 'text');
  const chipIcon = { phone: '📞', email: '✉️', otp: '🔑' };

  return (
    <div className="qrt-received">
      <div className="qrt-success-icon"><Icon name="check" size={32}/></div>
      <span className="qrt-kicker">QR TEXT RECEIVED</span>
      <h2>Text transferred</h2>
      <p>{hasChips ? 'Tap highlighted items to call, email, save, or copy.' : 'Decoded locally — copy it on this device.'}</p>

      <div className="qrt-richtext-wrap">
        <div className="qrt-richtext-bar">
          <span className="qrt-richtext-hint">{hasChips && !isEditing ? 'Tap to act' : ''}</span>
          <button className="qrt-edit-btn" onClick={() => setIsEditing(v => !v)}>{isEditing ? '✓ Done' : '✏️ Edit'}</button>
        </div>
        {isEditing
          ? <textarea className="qrt-richtext-edit" value={editText} onChange={e => setEditText(e.target.value)} rows={8} autoFocus/>
          : <div className="qrt-richtext">
              {segments.map((seg, i) => {
                if (seg.type === 'text') return <span key={i} className="qrt-seg-plain">{seg.value}</span>;
                if (seg.type === 'url')  return <a key={i} className="qrt-seg-url" href={seg.value} target="_blank" rel="noreferrer noopener">{seg.value}</a>;
                return <button key={i} className={`qrt-chip qrt-chip-${seg.type}`} onClick={e => setSheet({ item: seg, rect: e.currentTarget.getBoundingClientRect() })}>{chipIcon[seg.type]} {seg.value}</button>;
              })}
            </div>
        }
      </div>

      <div className="qrt-received-actions">
        <button className="button primary" onClick={copyAll}><Icon name={copied ? 'check' : 'copy'} size={18}/>{copied ? 'Copied' : 'Copy text'}</button>
        {isSafeWebLink(editText) && <a className="button secondary" href={editText.trim()} target="_blank" rel="noreferrer noopener">Open link <Icon name="arrow" size={16}/></a>}
        <button className="button secondary" onClick={onClear}>Create another</button>
      </div>
      <p className="qrt-local-note"><Icon name="shield" size={17}/> Decoded in this browser. No server lookup was needed.</p>
      {sheet && <ActionSheet item={sheet.item} rect={sheet.rect} onClose={() => setSheet(null)} saveContact={saveContact}/>}
    </div>
  );
}

// ── ReceivedContact ────────────────────────────────────────────────────────

function ContactCard({ c }) {
  const initials = (c.firstName?.[0] || c.fullName?.[0] || '?').toUpperCase();
  return (
    <div className="qrt-contact-card">
      <div className="qrt-cc-avatar">{initials}</div>
      <div className="qrt-cc-details">
        {c.fullName && <strong className="qrt-cc-name">{c.fullName}</strong>}
        {c.company && <span className="qrt-cc-company">{c.company}</span>}
        {c.phone && <a className="qrt-cc-row" href={`tel:${c.phone.replace(/[\s\-().]/g,'')}`}><span>📞</span>{c.phone}</a>}
        {c.email && <a className="qrt-cc-row" href={`mailto:${c.email}`}><span>✉️</span>{c.email}</a>}
        {c.website && <a className="qrt-cc-row" href={c.website} target="_blank" rel="noreferrer noopener"><span>🌐</span>{c.website}</a>}
        {c.note && <p className="qrt-cc-note">{c.note}</p>}
      </div>
    </div>
  );
}

function ReceivedContact({ text, onClear }) {
  const contacts = parseAllVCards(text);
  const count = contacts.length;
  const downloadVcf = () => {
    const name = count === 1 ? ([contacts[0].firstName, contacts[0].lastName].filter(Boolean).join('-') || 'contact') : 'contacts';
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([text], { type: 'text/vcard;charset=utf-8' })),
      download: `${name}.vcf`,
    });
    a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <div className="qrt-received">
      <div className="qrt-success-icon"><Icon name="check" size={32}/></div>
      <span className="qrt-kicker">{count > 1 ? `${count} CONTACTS RECEIVED` : 'CONTACT RECEIVED'}</span>
      <h2>{count > 1 ? `${count} contacts` : (contacts[0].fullName || 'Contact')}</h2>
      <p>Download to add {count > 1 ? 'these contacts' : 'this contact'} to your address book.</p>
      {contacts.map((c, i) => <ContactCard key={i} c={c}/>)}
      <div className="qrt-received-actions">
        <button className="button primary" onClick={downloadVcf}>📥 Download .vcf{count > 1 ? ` (${count} contacts)` : ''}</button>
        <button className="button secondary" onClick={onClear}>Create another</button>
      </div>
      <p className="qrt-local-note"><Icon name="shield" size={17}/> Decoded locally. Tap Download to add to your Contacts app.</p>
    </div>
  );
}

// ── ReceivedEvent ──────────────────────────────────────────────────────────

function parseAllIcsEvents(icsText) {
  const blocks = [...icsText.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/gi)];
  if (blocks.length === 0) return [parseIcsEvent(icsText)];
  return blocks.map(m => parseIcsEvent('BEGIN:VEVENT' + m[1] + 'END:VEVENT'));
}

function EventCard({ ev }) {
  const { startDate, endDate, allDay, location, description, fmtDate, fmtTime } = ev;
  return (
    <div className="qrt-event-card">
      {startDate && (
        <div className="qrt-ec-row">
          <span>📅</span>
          <div>
            <strong>{fmtDate(startDate)}</strong>
            {allDay ? <span>All day</span> : (endDate && <span>{fmtTime(startDate)} – {fmtTime(endDate)}</span>)}
          </div>
        </div>
      )}
      {location && <div className="qrt-ec-row"><span>📍</span><div><strong>{location}</strong></div></div>}
      {description && <div className="qrt-ec-row"><span>📝</span><div><p className="qrt-ec-desc">{description}</p></div></div>}
    </div>
  );
}

function parseIcsEvent(icsText) {
  const get = key => {
    const m = icsText.match(new RegExp(`^${key}(?:;[^:]*)?:(.*)$`, 'm'));
    return (m?.[1] ?? '').trim().replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
  };
  const dtstart = (() => { const m = icsText.match(/^DTSTART(?:;[^:]*)?:(.*)$/m); return (m?.[1] ?? '').trim(); })();
  const dtend   = (() => { const m = icsText.match(/^DTEND(?:;[^:]*)?:(.*)$/m);   return (m?.[1] ?? '').trim(); })();
  const allDay  = Boolean(dtstart) && !dtstart.includes('T');
  const parseDate = str => {
    if (!str) return null;
    if (/^\d{8}$/.test(str)) return new Date(+str.slice(0,4), +str.slice(4,6)-1, +str.slice(6,8));
    const m = str.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
    if (m) return m[7] === 'Z' ? new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+m[6])) : new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+m[6]);
    return null;
  };
  const startDate = parseDate(dtstart), endDate = parseDate(dtend);
  const fmtDate = d => d ? d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const fmtTime = d => d ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
  return { title: get('SUMMARY'), startDate, endDate, allDay, location: get('LOCATION'), description: get('DESCRIPTION'), fmtDate, fmtTime };
}

function ReceivedEvent({ icsText, onClear }) {
  const events = parseAllIcsEvents(icsText);
  const count = events.length;
  const downloadIcs = () => {
    const name = count === 1 ? ((events[0].title || 'event').replace(/\s+/g, '-').toLowerCase().slice(0, 50)) : 'events';
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([icsText], { type: 'text/calendar;charset=utf-8' })),
      download: `${name}.ics`,
    });
    a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <div className="qrt-received">
      <div className="qrt-success-icon"><Icon name="check" size={32}/></div>
      <span className="qrt-kicker">{count > 1 ? `${count} CALENDAR EVENTS` : 'CALENDAR EVENT'}</span>
      <h2>{count > 1 ? `${count} events` : (events[0].title || 'Event')}</h2>
      <p>Download {count > 1 ? 'these events' : 'this event'} to add to your calendar app.</p>
      {events.map((ev, i) => <EventCard key={i} ev={ev}/>)}
      <div className="qrt-received-actions">
        <button className="button primary" onClick={downloadIcs}>📥 Download .ics{count > 1 ? ` (${count} events)` : ''}</button>
        <button className="button secondary" onClick={onClear}>Create another</button>
      </div>
      <p className="qrt-local-note"><Icon name="shield" size={17}/> Decoded locally. Tap Download to add to your Calendar app.</p>
    </div>
  );
}

// ── CreateContactTransfer ──────────────────────────────────────────────────

const BLANK_CONTACT = { firstName: '', lastName: '', phone: '', phoneType: 'CELL', email: '', company: '', website: '', note: '' };
const MAX_CONTACTS = 5;
const contactLabel = c => [c.firstName, c.lastName].filter(Boolean).join(' ') || c.phone || c.email || 'Unnamed';

function CreateContactTransfer() {
  const [items, setItems]           = useState([{ ...BLANK_CONTACT }]);
  const [active, setActive]         = useState(0);
  const [form, setForm]             = useState({ ...BLANK_CONTACT });
  const [uploadedVcf, setUploadedVcf] = useState(null);
  const [error, setError]           = useState('');
  const [qrData, setQrData]         = useState('');
  const canvasRef                   = useRef(null);
  const setF = (k, v) => { setForm(f => ({ ...f, [k]: v })); setQrData(''); };

  const allItems = items.map((it, i) => i === active ? form : it);

  const switchTo = idx => {
    setItems(prev => prev.map((it, i) => i === active ? { ...form } : it));
    setActive(idx); setForm({ ...items[idx] }); setQrData('');
  };

  const addAnother = () => {
    if (items.length >= MAX_CONTACTS) return;
    const saved = items.map((it, i) => i === active ? { ...form } : it);
    setItems([...saved, { ...BLANK_CONTACT }]);
    setActive(saved.length); setForm({ ...BLANK_CONTACT }); setQrData('');
  };

  const removeItem = (idx, e) => {
    e.stopPropagation();
    const next = items.map((it, i) => i === active ? { ...form } : it).filter((_, i) => i !== idx);
    if (!next.length) next.push({ ...BLANK_CONTACT });
    setItems(next);
    const na = Math.max(0, Math.min(active > idx ? active - 1 : active, next.length - 1));
    setActive(na); setForm({ ...next[na] }); setQrData('');
  };

  const canGenerate = allItems.some(c => c.firstName || c.lastName || c.phone || c.email) || !!uploadedVcf;
  const validItems  = allItems.filter(c => c.firstName || c.lastName || c.phone || c.email);

  const generate = () => {
    if (uploadedVcf) return;
    if (!validItems.length) { setError('Enter at least a name, phone, or email.'); return; }
    setError(''); setQrData(validItems.map(buildVCard).join('\r\n'));
  };

  const handleUpload = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    if (!text.trimStart().startsWith('BEGIN:VCARD')) { setError('This does not appear to be a valid .vcf file.'); return; }
    setUploadedVcf(file.name); setError(''); setQrData(text.trim());
  };

  useEffect(() => {
    if (!qrData || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, qrData, { width: 320, margin: 2, errorCorrectionLevel: 'L', color: { dark: '#10183e', light: '#ffffff' } },
      err => err && setError('Too much data for a QR code. Remove optional fields or split into separate QRs.'));
  }, [qrData]);

  const downloadVcf = () => {
    const name = validItems.length > 1 ? 'contacts' : ([validItems[0]?.firstName, validItems[0]?.lastName].filter(Boolean).join('-') || 'contact');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([qrData], { type: 'text/vcard;charset=utf-8' })), download: `${name}.vcf` });
    a.click(); URL.revokeObjectURL(a.href);
  };
  const downloadQr = () => {
    const link = document.createElement('a');
    link.download = validItems.length > 1 ? 'contacts-qr.png' : 'contact-qr.png';
    link.href = canvasRef.current.toDataURL('image/png'); link.click();
  };

  return (
    <div className={`qrt-create${qrData ? ' has-result' : ''}`}>
      <section className="qrt-compose">
        <div className="qrt-section-label">
          <span>1</span>
          <div>
            <strong>{items.length > 1 ? `${items.length} contacts` : 'Enter contact details'}</strong>
            <small>iOS and Android cameras recognise this QR and offer "Add to Contacts" — no app needed.</small>
          </div>
        </div>
        {allItems.length > 1 && (
          <div className="qrt-entry-list">
            {allItems.map((c, i) => (
              <div key={i} className={`qrt-entry-chip${i === active ? ' active' : ''}`} onClick={() => i !== active && switchTo(i)}>
                <span className="qrt-ec-glyph">👤</span>
                <span className="qrt-ec-label">{contactLabel(c)}</span>
                {(c.phone || c.email) && <span className="qrt-ec-sub">{c.phone || c.email}</span>}
                <button className="qrt-ec-del" aria-label={`Remove contact ${i + 1}`} onClick={e => removeItem(i, e)}>×</button>
              </div>
            ))}
          </div>
        )}
        <div className="qrt-contact-form">
          <div className="qrt-form-row">
            <div className="qrt-form-field"><label>First name</label><input value={form.firstName} onChange={e => setF('firstName', e.target.value)} placeholder="John"/></div>
            <div className="qrt-form-field"><label>Last name</label><input value={form.lastName} onChange={e => setF('lastName', e.target.value)} placeholder="Smith"/></div>
          </div>
          <div className="qrt-form-row qrt-form-row-phone">
            <div className="qrt-form-field"><label>Phone</label><input value={form.phone} onChange={e => setF('phone', e.target.value)} type="tel" placeholder="+44 7700 900123"/></div>
            <div className="qrt-form-field qrt-field-ptype"><label>Type</label><select value={form.phoneType} onChange={e => setF('phoneType', e.target.value)}><option value="CELL">Mobile</option><option value="WORK">Work</option><option value="HOME">Home</option></select></div>
          </div>
          <div className="qrt-form-field"><label>Email</label><input value={form.email} onChange={e => setF('email', e.target.value)} type="email" placeholder="john@example.com"/></div>
          <div className="qrt-form-field"><label>Company</label><input value={form.company} onChange={e => setF('company', e.target.value)} placeholder="Acme Corp"/></div>
          <div className="qrt-form-field"><label>Website</label><input value={form.website} onChange={e => setF('website', e.target.value)} type="url" placeholder="https://example.com"/></div>
          <div className="qrt-form-field"><label>Note</label><input value={form.note} onChange={e => setF('note', e.target.value)} placeholder="Optional note…"/></div>
        </div>
        {items.length < MAX_CONTACTS && (
          <button className="qrt-add-entry-btn" type="button" onClick={addAnother}>
            <ToolGlyph name="userRound" size={14}/> Add another contact
          </button>
        )}
        <div className="qrt-upload-or"><span>or</span></div>
        <label className="qrt-file-upload-alt">
          <input type="file" accept=".vcf,.vcard" onChange={handleUpload}/>
          {uploadedVcf ? <><span>📋</span><strong>{uploadedVcf}</strong></> : <><span>📎</span><div><strong>Upload a .vcf file</strong><small>Existing contacts export</small></div></>}
        </label>
        {error && <p className="qrt-error">{error}</p>}
        <button className="button primary qrt-generate" onClick={generate} disabled={!canGenerate}>
          <ToolGlyph name="qr" size={18}/> Generate contact QR
        </button>
        <p className="qrt-tiny-explain">Raw vCard inside the QR — natively recognised by iOS &amp; Android cameras.</p>
      </section>
      {qrData && (
        <section className="qrt-result" aria-label="Generated contact QR">
          <div className="qrt-section-label">
            <span>2</span>
            <div>
              <strong>Scan to add {validItems.length > 1 ? `${validItems.length} contacts` : 'contact'}</strong>
              <small>Device camera offers "Add to Contacts" — no app needed.</small>
            </div>
          </div>
          <div className="qrt-code"><canvas ref={canvasRef}/></div>
          <p className="qrt-contains">Raw vCard inside this QR — natively recognised by iOS &amp; Android cameras.</p>
          <div className="qrt-actions">
            <button className="button primary" onClick={downloadVcf}><Icon name="copy" size={17}/> Download .vcf</button>
            <button className="button secondary" onClick={downloadQr}>Download QR</button>
          </div>
        </section>
      )}
    </div>
  );
}

// ── CreateEventTransfer ────────────────────────────────────────────────────

const MAX_EVENTS = 5;
const blankEvent = today => ({ title: '', date: today, startTime: '09:00', endTime: '10:00', allDay: false, location: '', description: '' });
const eventLabel = e => e.title || 'Untitled event';
const eventSub   = e => {
  if (!e.date) return '';
  const d = new Date(e.date + 'T12:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + (e.allDay ? '' : ` · ${e.startTime}`);
};

function CreateEventTransfer() {
  const today = new Date().toISOString().slice(0, 10);
  const [items, setItems]           = useState([blankEvent(today)]);
  const [active, setActive]         = useState(0);
  const [form, setForm]             = useState(blankEvent(today));
  const [uploadedIcs, setUploadedIcs] = useState(null);
  const [error, setError]           = useState('');
  const [result, setResult]         = useState(null);
  const [copied, setCopied]         = useState(false);
  const canvasRef                   = useRef(null);
  const setF = (k, v) => { setForm(f => ({ ...f, [k]: v })); setResult(null); };

  const allItems = items.map((it, i) => i === active ? form : it);

  const switchTo = idx => {
    setItems(prev => prev.map((it, i) => i === active ? { ...form } : it));
    setActive(idx); setForm({ ...items[idx] }); setResult(null);
  };

  const addAnother = () => {
    if (items.length >= MAX_EVENTS) return;
    const saved = items.map((it, i) => i === active ? { ...form } : it);
    setItems([...saved, blankEvent(today)]);
    setActive(saved.length); setForm(blankEvent(today)); setResult(null);
  };

  const removeItem = (idx, e) => {
    e.stopPropagation();
    const next = items.map((it, i) => i === active ? { ...form } : it).filter((_, i) => i !== idx);
    if (!next.length) next.push(blankEvent(today));
    setItems(next);
    const na = Math.max(0, Math.min(active > idx ? active - 1 : active, next.length - 1));
    setActive(na); setForm({ ...next[na] }); setResult(null);
  };

  const buildAllIcs = () => {
    const events = [];
    for (const f of allItems) {
      if (!f.title.trim()) continue;
      const [yr, mo, dy] = f.date.split('-').map(Number);
      if (f.allDay) {
        events.push({ title: f.title, start: new Date(yr, mo - 1, dy, 0, 0, 0), end: new Date(yr, mo - 1, dy + 1, 0, 0, 0), allDay: true, location: f.location, description: f.description });
      } else {
        const [sh, sm] = f.startTime.split(':').map(Number);
        const [eh, em] = f.endTime.split(':').map(Number);
        const start = new Date(yr, mo - 1, dy, sh, sm, 0);
        const end   = new Date(yr, mo - 1, dy, eh, em, 0);
        if (end <= start) { setError(`"${f.title}": end time must be after start time.`); return null; }
        events.push({ title: f.title, start, end, location: f.location, description: f.description });
      }
    }
    if (!events.length) { setError('Enter at least one event title.'); return null; }
    return buildIcs(events);
  };

  const generate = () => {
    if (uploadedIcs) return;
    const icsText = buildAllIcs();
    if (!icsText) return;
    setError(''); setCopied(false);
    setResult({ url: buildEventTransferUrl(icsText), icsText });
  };

  const handleUpload = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    if (!text.trimStart().startsWith('BEGIN:VCALENDAR')) { setError('This does not appear to be a valid .ics file.'); return; }
    const icsText = text.trim();
    setUploadedIcs(file.name); setError('');
    setResult({ url: buildEventTransferUrl(icsText), icsText });
  };

  useEffect(() => {
    if (!result?.url || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, result.url, { width: 320, margin: 2, errorCorrectionLevel: 'L', color: { dark: '#10183e', light: '#ffffff' } },
      err => err && setError('Event data is too large for a QR code. Shorten descriptions or split into separate QRs.'));
  }, [result]);

  const validCount = allItems.filter(e => e.title.trim()).length;
  const canGenerate = allItems.some(e => e.title.trim()) || !!uploadedIcs;

  const downloadIcs = () => {
    const name = validCount > 1 ? 'events' : ((allItems.find(e => e.title)?.title || uploadedIcs?.replace(/\.ics$/i, '') || 'event').replace(/\s+/g, '-').toLowerCase().slice(0, 50));
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([result.icsText], { type: 'text/calendar;charset=utf-8' })), download: `${name}.ics` });
    a.click(); URL.revokeObjectURL(a.href);
  };
  const downloadQr = () => { const link = document.createElement('a'); link.download = 'event-qr.png'; link.href = canvasRef.current.toDataURL('image/png'); link.click(); };
  const copyLink = async () => { await navigator.clipboard?.writeText(result.url); setCopied(true); window.setTimeout(() => setCopied(false), 1400); };

  return (
    <div className={`qrt-create${result ? ' has-result' : ''}`}>
      <section className="qrt-compose">
        <div className="qrt-section-label">
          <span>1</span>
          <div>
            <strong>{items.length > 1 ? `${items.length} events` : 'Enter event details'}</strong>
            <small>Scanning the QR opens this app with a one-tap calendar download.</small>
          </div>
        </div>
        {allItems.length > 1 && (
          <div className="qrt-entry-list">
            {allItems.map((ev, i) => (
              <div key={i} className={`qrt-entry-chip${i === active ? ' active' : ''}`} onClick={() => i !== active && switchTo(i)}>
                <span className="qrt-ec-glyph">📅</span>
                <span className="qrt-ec-label">{eventLabel(ev)}</span>
                {ev.date && <span className="qrt-ec-sub">{eventSub(ev)}</span>}
                <button className="qrt-ec-del" aria-label={`Remove event ${i + 1}`} onClick={e => removeItem(i, e)}>×</button>
              </div>
            ))}
          </div>
        )}
        <div className="qrt-event-form">
          <div className="qrt-form-field"><label>Event title <span className="qrt-required">*</span></label><input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Team meeting, Birthday party…"/></div>
          <div className="qrt-form-row qrt-form-row-date">
            <div className="qrt-form-field"><label>Date</label><input type="date" value={form.date} onChange={e => setF('date', e.target.value)}/></div>
            <div className="qrt-form-field qrt-field-allday"><label>&nbsp;</label><label className="qrt-allday-label"><input type="checkbox" checked={form.allDay} onChange={e => setF('allDay', e.target.checked)}/> All day</label></div>
          </div>
          {!form.allDay && (
            <div className="qrt-form-row">
              <div className="qrt-form-field"><label>Start time</label><input type="time" value={form.startTime} onChange={e => setF('startTime', e.target.value)}/></div>
              <div className="qrt-form-field"><label>End time</label><input type="time" value={form.endTime} onChange={e => setF('endTime', e.target.value)}/></div>
            </div>
          )}
          <div className="qrt-form-field"><label>Location</label><input value={form.location} onChange={e => setF('location', e.target.value)} placeholder="123 Main St or Zoom link…"/></div>
          <div className="qrt-form-field"><label>Description</label><textarea value={form.description} onChange={e => setF('description', e.target.value)} rows={3} placeholder="Optional notes…"/></div>
        </div>
        {items.length < MAX_EVENTS && (
          <button className="qrt-add-entry-btn" type="button" onClick={addAnother}>
            <ToolGlyph name="calendarPlus" size={14}/> Add another event
          </button>
        )}
        <div className="qrt-upload-or"><span>or</span></div>
        <label className="qrt-file-upload-alt">
          <input type="file" accept=".ics,.ical" onChange={handleUpload}/>
          {uploadedIcs ? <><span>📅</span><strong>{uploadedIcs}</strong></> : <><span>📎</span><div><strong>Upload a .ics file</strong><small>Existing calendar event</small></div></>}
        </label>
        {error && <p className="qrt-error">{error}</p>}
        <button className="button primary qrt-generate" onClick={generate} disabled={!canGenerate}>
          <ToolGlyph name="qr" size={18}/> Generate event QR
        </button>
      </section>
      {result && (
        <section className="qrt-result" aria-label="Generated event QR">
          <div className="qrt-section-label">
            <span>2</span>
            <div>
              <strong>Scan to add {validCount > 1 ? `${validCount} events` : 'to calendar'}</strong>
              <small>Opens a page — one tap adds {validCount > 1 ? 'all events' : 'the event'} to any calendar app.</small>
            </div>
          </div>
          <div className="qrt-code"><canvas ref={canvasRef}/></div>
          <p className="qrt-contains">QR links to this app. Scanning shows formatted event cards and a .ics download.</p>
          <div className="qrt-actions">
            <button className="button primary" onClick={downloadIcs}><Icon name="copy" size={17}/> Download .ics</button>
            <button className="button secondary" onClick={copyLink}><Icon name={copied ? 'check' : 'copy'} size={17}/>{copied ? 'Copied' : 'Copy link'}</button>
            <button className="button secondary" onClick={downloadQr}>Download QR</button>
          </div>
        </section>
      )}
    </div>
  );
}

function ReceivedFile({ file, onClear }) {
  const [downloadUrl, setDownloadUrl] = useState('');
  const [preview] = useState(() => isTextLikeFile(file) ? new TextDecoder().decode(file.bytes) : '');
  const imageFile = file.mimeType.startsWith('image/');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const blob = new Blob([file.bytes], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const copyText = async () => {
    await navigator.clipboard?.writeText(preview);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return <div className="qrt-received qrt-received-file">
    <div className="qrt-success-icon"><Icon name="check" size={32}/></div><span className="qrt-kicker">TINY FILE RECEIVED</span><h2>File reconstructed</h2><p>The original file was rebuilt locally from the QR link.</p>
    <div className="qrt-file-summary"><ToolGlyph name="fileText" size={30}/><div><strong>{file.name}</strong><span>{formatBytes(file.originalSize)} · {file.mimeType} · {file.compressed ? 'Gzip transfer' : 'Raw transfer'}</span></div></div>
    {imageFile && downloadUrl && <div className="qrt-received-image"><span>Image received from QR</span><img src={downloadUrl} alt={file.name}/><small>This is the condensed QR version.</small></div>}
    {preview && <pre className="qrt-file-preview">{preview}</pre>}
    <div className="qrt-received-actions">{preview && <button className="button secondary" onClick={copyText}><Icon name={copied ? 'check' : 'copy'} size={18}/>{copied ? 'Copied' : 'Copy file text'}</button>}<a className="button primary" href={downloadUrl} download={file.name}>Download file</a><button className="button secondary" onClick={onClear}>Create another</button></div>
    <p className="qrt-local-note"><Icon name="shield" size={17}/> Only download files from people you trust. Nothing was fetched from a server.</p>
  </div>;
}

function ScanTransfer({ onResult }) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef(null), canvasRef = useRef(null), streamRef = useRef(null), frameRef = useRef(null);

  const stop = () => { cancelAnimationFrame(frameRef.current); streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; setActive(false); };
  useEffect(() => stop, []);

  const acceptCode = value => {
    const payload = readTransferPayload(value);
    stop();
    if (payload !== null) {
      window.location.hash = `textqr/receive/${value.split('#textqr/receive/')[1]}`;
      onResult(payload);
      return;
    }
    if (isFileTransferRoute(value)) {
      try {
        const hash = value.startsWith('#') ? value : new URL(value, window.location.href).hash;
        window.location.hash = hash.slice(1);
        return;
      } catch { /* handled below */ }
    }
    if (isEventTransferRoute(value)) {
      try {
        const hash = value.startsWith('#') ? value : new URL(value, window.location.href).hash;
        window.location.hash = hash.slice(1);
        return;
      } catch { /* handled below */ }
    }
    if (value.trimStart().startsWith('BEGIN:VCARD')) {
      stop();
      onResult(value);
      return;
    }
    setError('This is not a SurrendaSoft QR transfer code.');
  };

  const scanFrame = () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) { frameRef.current = requestAnimationFrame(scanFrame); return; }
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
    if (code?.data) acceptCode(code.data); else frameRef.current = requestAnimationFrame(scanFrame);
  };

  const start = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) { setError('Camera scanning is not supported in this browser. Upload a QR image instead.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream; setActive(true);
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); frameRef.current = requestAnimationFrame(scanFrame); }
    } catch { setError('Camera permission was unavailable. You can upload a screenshot of the QR code instead.'); }
  };

  const scanImage = event => {
    const file = event.target.files?.[0]; if (!file) return;
    const image = new Image(), url = URL.createObjectURL(file);
    image.onload = () => {
      const canvas = canvasRef.current, context = canvas.getContext('2d', { willReadFrequently: true }); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height), code = jsQR(pixels.data, pixels.width, pixels.height);
      URL.revokeObjectURL(url);
      if (code?.data) acceptCode(code.data); else setError('No readable QR code was found in that image.');
    };
    image.src = url;
  };

  return <section className="qrt-scan">
    <div className="qrt-section-label"><span>1</span><div><strong>Scan the QR on your other device</strong><small>Allow camera access, or upload a QR screenshot.</small></div></div>
    <div className={`qrt-viewfinder${active ? ' active' : ''}`}>{active ? <video ref={videoRef} muted playsInline aria-label="QR scanner camera"/> : <><ToolGlyph name="qr" size={54}/><p>Camera preview will appear here</p></>}<canvas ref={canvasRef} hidden/></div>
    <div className="qrt-scan-actions">{active ? <button className="button secondary" onClick={stop}>Stop camera</button> : <button className="button primary" onClick={start}><ToolGlyph name="camera" size={18}/> Start camera scanner</button>}<label className="button secondary qrt-upload">Upload QR image<input type="file" accept="image/*" onChange={scanImage}/></label></div>
    {error && <p className="qrt-error">{error}</p>}
    <div className="qrt-how"><strong>To send phone → laptop</strong><p>Generate the QR on your phone, then scan it here using your laptop camera.</p></div>
  </section>;
}
