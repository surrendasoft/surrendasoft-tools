import { useEffect, useRef, useState } from 'react';

const PRESETS = [
  { id: 'mobile',  label: 'Mobile',  w: 390,  h: 844  },
  { id: 'tablet',  label: 'Tablet',  w: 768,  h: 1024 },
  { id: 'laptop',  label: 'Laptop',  w: 1366, h: 768  },
  { id: 'desktop', label: 'Desktop', w: 1920, h: 1080 },
];

const DRAG_H = 520;

function DevIcon({ id }) {
  const p = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', width: 17, height: 17 };
  if (id === 'mobile')  return <svg {...p}><rect x="7" y="2" width="10" height="20" rx="2.5"/><circle cx="12" cy="18.5" r="0.9" fill="currentColor" stroke="none"/></svg>;
  if (id === 'tablet')  return <svg {...p}><rect x="4" y="2" width="16" height="20" rx="2.5"/><circle cx="12" cy="18.5" r="0.9" fill="currentColor" stroke="none"/></svg>;
  if (id === 'laptop')  return <svg {...p}><rect x="2" y="3" width="20" height="13" rx="2"/><path d="M0 18h24"/><path d="M9 18v1h6v-1"/></svg>;
  if (id === 'desktop') return <svg {...p}><rect x="2" y="2" width="20" height="14" rx="2"/><path d="M8 22h8M12 16v6"/></svg>;
  return <svg {...p}><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="8" cy="6" r="2.2" fill="#1a1f2e"/><circle cx="16" cy="12" r="2.2" fill="#1a1f2e"/><circle cx="10" cy="18" r="2.2" fill="#1a1f2e"/></svg>;
}

const IcoRefresh = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><path d="M16.5 4a8 8 0 1 1-1.8-1.6"/><path d="M16 1v4h-4"/></svg>;
const IcoRotate  = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><path d="M4 10a6 6 0 1 0 1.2-3.7"/><path d="M4 4v3.5h3.5"/></svg>;
const IcoNewTab  = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><path d="M13 3h4v4M8 12l9-9M10 5H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5"/></svg>;
const IcoLock    = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="11" height="11"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>;
const IcoSpinner = () => <svg className="wvt-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="11" height="11"><path d="M8 1a7 7 0 0 1 7 7"/></svg>;

export default function ViewTesterTool() {
  const [url, setUrl] = useState('');
  const [loaded, setLoaded] = useState('');
  const [preset, setPreset] = useState(PRESETS[0]);
  const [rotated, setRotated] = useState(false);
  const [useCustom, setUseCustom] = useState(false);
  const [custom, setCustom] = useState({ w: 800, h: 600 });
  const [rev, setRev] = useState(0);
  const [status, setStatus] = useState('idle');
  const [overrideW, setOverrideW] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(true);

  const timerRef = useRef(null);
  const stageRef = useRef(null);
  const dragData = useRef({ active: false, startX: 0, startW: 0, maxW: 0 });
  const [stageW, setStageW] = useState(700);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setStageW(entry.contentRect.width));
    ro.observe(el);
    setStageW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onMove = e => {
      if (!dragData.current.active) return;
      const { startX, startW, maxW } = dragData.current;
      setOverrideW(Math.round(Math.max(200, Math.min(maxW, startW + e.clientX - startX))));
    };
    const onUp = () => {
      if (!dragData.current.active) return;
      dragData.current.active = false;
      setDragging(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const startDrag = e => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const outerEl = el.parentElement?.parentElement;
    const maxW = outerEl ? outerEl.getBoundingClientRect().width : rect.width;
    dragData.current = { active: true, startX: e.clientX, startW: overrideW ?? rect.width, maxW };
    setDragging(true);
    e.preventDefault();
  };

  const armTimer = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus(s => s === 'loaded' ? s : 'blocked'), 8000);
  };

  const load = () => {
    let u = url.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    setLoaded(u); setStatus('loading'); setOverrideW(null); armTimer();
  };

  const refresh = () => {
    if (!loaded) return;
    setStatus('loading'); setRev(n => n + 1); armTimer();
  };

  const onIframeLoad = () => { clearTimeout(timerRef.current); setStatus('loaded'); };

  const inDrag = overrideW !== null;
  const pw = inDrag ? overrideW : (useCustom ? custom.w : (rotated ? preset.h : preset.w));
  const ph = inDrag ? DRAG_H    : (useCustom ? custom.h : (rotated ? preset.w : preset.h));
  const scale = inDrag ? 1 : Math.min(1, Math.max(0.05, (stageW - 2) / pw));
  const displayH = inDrag ? DRAG_H : Math.round(ph * scale);

  const canRotate = !useCustom && !inDrag && (preset.id === 'mobile' || preset.id === 'tablet');

  const displayUrl = loaded ? (() => {
    try { const u = new URL(loaded); return u.hostname + (u.pathname !== '/' ? u.pathname : ''); }
    catch { return loaded; }
  })() : '';

  return (
    <>
      <div className="wvt-row">
        <input className="wvt-url" value={url} onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="https://example.com" type="url" spellCheck={false} />
        <button className="wvt-load" onClick={load}>Load</button>
      </div>

      <div className="wvt-presets">
        {PRESETS.map(p => (
          <button key={p.id}
            className={`wvt-preset${!useCustom && !inDrag && preset.id === p.id ? ' wvt-on' : ''}`}
            onClick={() => { setPreset(p); setUseCustom(false); setRotated(false); setOverrideW(null); }}>
            <DevIcon id={p.id} />
            <span className="wvt-plabel">{p.label}</span>
            <span className="wvt-pdim">{p.w}×{p.h}</span>
          </button>
        ))}
        <button className={`wvt-preset${useCustom && !inDrag ? ' wvt-on' : ''}`}
          onClick={() => { setUseCustom(true); setRotated(false); setOverrideW(null); }}>
          <DevIcon id="custom" />
          <span className="wvt-plabel">Custom</span>
          <span className="wvt-pdim">{custom.w}×{custom.h}</span>
        </button>
      </div>

      {useCustom && !inDrag && (
        <div className="wvt-custom2">
          <div className="wvt-dimfield">
            <span className="wvt-dimlabel">Width</span>
            <input className="wvt-diminput" type="number" value={custom.w} min={100} max={3840}
              onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setCustom(c => ({...c, w: v})); }}
              onBlur={() => setCustom(c => ({...c, w: Math.max(100, Math.min(3840, c.w || 100))}))} />
            <span className="wvt-dimunit">px</span>
          </div>
          <span className="wvt-dimx">×</span>
          <div className="wvt-dimfield">
            <span className="wvt-dimlabel">Height</span>
            <input className="wvt-diminput" type="number" value={custom.h} min={100} max={2160}
              onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setCustom(c => ({...c, h: v})); }}
              onBlur={() => setCustom(c => ({...c, h: Math.max(100, Math.min(2160, c.h || 100))}))} />
            <span className="wvt-dimunit">px</span>
          </div>
        </div>
      )}

      {(loaded || canRotate) && (
        <div className="wvt-actions">
          {canRotate && (
            <button className="wvt-act" onClick={() => setRotated(r => !r)}>
              <IcoRotate /> {rotated ? 'Portrait' : 'Landscape'}
            </button>
          )}
          {loaded && <>
            <button className="wvt-act" onClick={refresh}><IcoRefresh /> Refresh</button>
            <a className="wvt-act" href={loaded} target="_blank" rel="noopener noreferrer">
              <IcoNewTab /> New tab
            </a>
          </>}
        </div>
      )}

      {noticeOpen && (
        <div className="wvt-notice">
          <span>⚠ Some websites block iframe embedding. If the preview does not load, open it in a new tab or use the{' '}
            <a href="#webstatus">Website Status Checker</a>.
          </span>
          <button className="wvt-notice-close" onClick={() => setNoticeOpen(false)} aria-label="Dismiss notice">✕</button>
        </div>
      )}

      <div className="wvt-window"
        style={overrideW ? { width: overrideW + 'px', maxWidth: '100%' } : {}}>

        <div className="wvt-chrome">
          <div className="wvt-dots">
            <span className="wvt-dot" style={{ background: '#ff5f57' }} />
            <span className="wvt-dot" style={{ background: '#febc2e' }} />
            <span className="wvt-dot" style={{ background: '#28c840' }} />
          </div>
          <div className="wvt-addr">
            {status === 'loading' && <IcoSpinner />}
            {status === 'loaded' && <span className="wvt-addr-secure"><IcoLock /></span>}
            <span className="wvt-addr-text">{displayUrl || 'about:blank'}</span>
          </div>
          <div className="wvt-chrome-spacer" />
        </div>

        <div className="wvt-stage" ref={stageRef}>
          {!loaded ? (
            <div className="wvt-empty">Enter a URL above and press <strong>Load</strong></div>
          ) : (
            <>
              {status === 'loading' && <div className="wvt-bar" />}
              {dragging && <div className="wvt-drag-overlay" />}
              <div className="wvt-drag-handle" onMouseDown={startDrag} title="Drag to adjust viewport width" />
              <div className="wvt-scaler" style={{ height: displayH + 'px' }}>
                <div className="wvt-frame"
                  style={{ width: pw, height: ph, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                  {status === 'blocked' ? (
                    <div className="wvt-blocked" style={{ width: pw, height: ph }}>
                      <span className="wvt-blocked-icon">🚫</span>
                      <p>This site blocks embedded previews.</p>
                      <a href={loaded} target="_blank" rel="noopener noreferrer" className="wvt-open">Open in new tab ↗</a>
                    </div>
                  ) : (
                    <iframe key={`${loaded}_${rev}`} src={loaded} title="Site preview"
                      sandbox="allow-scripts allow-same-origin allow-forms"
                      onLoad={onIframeLoad}
                      style={{ width: pw, height: ph, border: 0, display: 'block' }} />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {loaded && (
        <div className="wvt-badge-row">
          <span className="wvt-badge">
            {pw} × {ph} px
            {inDrag && ' · drag handle to resize'}
            {!inDrag && scale < 1 && ` · scaled to ${Math.round(scale * 100)}%`}
          </span>
          {inDrag && <button className="wvt-reset-btn" onClick={() => setOverrideW(null)}>↩ Reset</button>}
        </div>
      )}
    </>
  );
}
