import { useEffect, useRef, useState } from 'react';

const PRESETS = [
  { id: 'mobile',  label: 'Mobile',  w: 390,  h: 844  },
  { id: 'tablet',  label: 'Tablet',  w: 768,  h: 1024 },
  { id: 'laptop',  label: 'Laptop',  w: 1366, h: 768  },
  { id: 'desktop', label: 'Desktop', w: 1920, h: 1080 },
];

export default function ViewTesterTool() {
  const [url, setUrl] = useState('');
  const [loaded, setLoaded] = useState('');
  const [preset, setPreset] = useState(PRESETS[0]);
  const [rotated, setRotated] = useState(false);
  const [useCustom, setUseCustom] = useState(false);
  const [custom, setCustom] = useState({ w: 800, h: 600 });
  const [rev, setRev] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | loading | loaded | blocked
  const timerRef = useRef(null);
  const stageRef = useRef(null);
  const [stageW, setStageW] = useState(700);

  // Measure stage width for scaling calculation
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setStageW(entry.contentRect.width));
    ro.observe(el);
    setStageW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Effective viewport dimensions
  const pw = useCustom ? custom.w : (rotated ? preset.h : preset.w);
  const ph = useCustom ? custom.h : (rotated ? preset.w : preset.h);
  const scale = Math.min(1, Math.max(0.05, (stageW - 2) / pw));
  const displayH = Math.round(ph * scale);

  const armTimer = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => setStatus(s => (s === 'loaded' ? s : 'blocked')),
      8000,
    );
  };

  const load = () => {
    let u = url.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    setLoaded(u);
    setStatus('loading');
    armTimer();
  };

  const refresh = () => {
    if (!loaded) return;
    setStatus('loading');
    setRev(n => n + 1);
    armTimer();
  };

  const onIframeLoad = () => {
    clearTimeout(timerRef.current);
    setStatus('loaded');
  };

  const canRotate = !useCustom && (preset.id === 'mobile' || preset.id === 'tablet');

  return (
    <>
      {/* URL bar */}
      <div className="wvt-row">
        <input
          className="wvt-url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="https://example.com"
          type="url"
          spellCheck={false}
        />
        <button className="wvt-load" onClick={load}>Load</button>
      </div>

      {/* Preset tabs */}
      <div className="wvt-presets">
        {PRESETS.map(p => (
          <button
            key={p.id}
            className={`wvt-preset${!useCustom && preset.id === p.id ? ' wvt-on' : ''}`}
            onClick={() => { setPreset(p); setUseCustom(false); setRotated(false); }}
          >
            <span className="wvt-plabel">{p.label}</span>
            <span className="wvt-pdim">{p.w}×{p.h}</span>
          </button>
        ))}
        <button
          className={`wvt-preset${useCustom ? ' wvt-on' : ''}`}
          onClick={() => { setUseCustom(true); setRotated(false); }}
        >
          <span className="wvt-plabel">Custom</span>
          <span className="wvt-pdim">{custom.w}×{custom.h}</span>
        </button>
      </div>

      {/* Custom size inputs */}
      {useCustom && (
        <div className="wvt-custom">
          <label className="wvt-clabel">
            Width
            <input type="number" value={custom.w} min={100} max={3840}
              onChange={e => setCustom(c => ({ ...c, w: Math.max(100, +e.target.value || 100) }))} />
          </label>
          <span className="wvt-cx">×</span>
          <label className="wvt-clabel">
            Height
            <input type="number" value={custom.h} min={100} max={2160}
              onChange={e => setCustom(c => ({ ...c, h: Math.max(100, +e.target.value || 100) }))} />
          </label>
          <span className="wvt-cx">px</span>
        </div>
      )}

      {/* Actions */}
      {(loaded || canRotate) && (
        <div className="wvt-actions">
          {canRotate && (
            <button className="wvt-act" onClick={() => setRotated(r => !r)}>
              ↺ {rotated ? 'Portrait' : 'Landscape'}
            </button>
          )}
          {loaded && <>
            <button className="wvt-act" onClick={refresh}>↻ Refresh</button>
            <a className="wvt-act" href={loaded} target="_blank" rel="noopener noreferrer">↗ New tab</a>
          </>}
        </div>
      )}

      {/* Limitation notice */}
      <div className="wvt-notice">
        ⚠ Some websites block iframe embedding. If the preview does not load, open it
        in a new tab or use the{' '}
        <a href="#webstatus">Website Status Checker</a>.
      </div>

      {/* Stage */}
      <div className="wvt-stage" ref={stageRef}>
        {!loaded ? (
          <div className="wvt-empty">Enter a URL above and press <strong>Load</strong></div>
        ) : (
          <>
            {status === 'loading' && <div className="wvt-bar" />}
            <div className="wvt-scaler" style={{ height: displayH + 'px' }}>
              <div
                className="wvt-frame"
                style={{ width: pw, height: ph, transform: `scale(${scale})`, transformOrigin: 'top left' }}
              >
                {status === 'blocked' ? (
                  <div className="wvt-blocked" style={{ width: pw, height: ph }}>
                    <span className="wvt-blocked-icon">🚫</span>
                    <p>This site blocks embedded previews.</p>
                    <a href={loaded} target="_blank" rel="noopener noreferrer" className="wvt-open">
                      Open in new tab ↗
                    </a>
                  </div>
                ) : (
                  <iframe
                    key={`${loaded}_${rev}`}
                    src={loaded}
                    title="Site preview"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    onLoad={onIframeLoad}
                    style={{ width: pw, height: ph, border: 0, display: 'block' }}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Dimension badge */}
      {loaded && (
        <p className="wvt-badge">
          {pw} × {ph} px{scale < 1 ? ` · scaled to ${Math.round(scale * 100)}%` : ''}
        </p>
      )}
    </>
  );
}
