import { useCallback, useEffect, useRef, useState } from 'react';
import ToolSharePanel, { ToolShareBanner } from '../components/ToolSharePanel.jsx';
import { useToolShare } from '../hooks/useToolShare.js';

const MAX_PAGES = 12;
const BLOCK_TIMEOUT_MS = 8000;

const HEIGHT_BY_COLS = { 1: 580, 2: 460, 3: 340, 4: 260 };

const SAMPLE = `https://example.com
https://en.wikipedia.org/wiki/Main_Page
https://news.ycombinator.com`;

function normalizeUrl(raw) {
  const s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) return 'https://' + s;
  return s;
}

function getHostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url.slice(0, 40); }
}

// ── Individual iframe panel ──────────────────────────────────────────────────
function PageFrame({ page, onRemove }) {
  const [status, setStatus] = useState('loading'); // loading | loaded | blocked
  const [rev, setRev] = useState(0); // incremented to force iframe reload
  const timerRef = useRef(null);

  // Reset state whenever URL or rev changes
  useEffect(() => {
    setStatus('loading');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setStatus(s => s === 'loaded' ? s : 'blocked');
    }, BLOCK_TIMEOUT_MS);
    return () => clearTimeout(timerRef.current);
  }, [page.url, rev]);

  const onLoad = () => {
    clearTimeout(timerRef.current);
    setStatus('loaded');
  };
  const onError = () => {
    clearTimeout(timerRef.current);
    setStatus('blocked');
  };
  const refresh = () => setRev(n => n + 1);
  const host = getHostname(page.url);

  return (
    <div className={`mpv-panel mpv-${status}`}>
      <div className="mpv-panel-bar">
        <span className="mpv-panel-host" title={page.url}>{host}</span>
        <div className="mpv-panel-actions">
          <button className="mpv-action-btn" onClick={refresh} title="Refresh" aria-label="Refresh">↻</button>
          <a
            className="mpv-action-btn"
            href={page.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            aria-label="Open in new tab"
          >↗</a>
          <button className="mpv-action-btn mpv-remove-btn" onClick={onRemove} title="Remove" aria-label="Remove panel">×</button>
        </div>
      </div>

      <div className="mpv-frame-wrap">
        {status === 'loading' && <div className="mpv-loading-bar" aria-hidden="true" />}

        <iframe
          key={`${page.url}::${rev}`}
          src={page.url}
          title={host}
          className="mpv-iframe"
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={onLoad}
          onError={onError}
          aria-label={`Embedded page: ${host}`}
        />

        {status === 'blocked' && (
          <div className="mpv-blocked">
            <span className="mpv-blocked-icon">🚫</span>
            <p className="mpv-blocked-msg">{host} cannot be displayed here.</p>
            <p className="mpv-blocked-sub">This site uses security headers that prevent embedding — this is normal and not a bug.</p>
            <a
              href={page.url}
              target="_blank"
              rel="noopener noreferrer"
              className="button primary mpv-blocked-btn"
            >
              Open {host} in a new tab ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main tool component ──────────────────────────────────────────────────────
export default function MultiPageViewerTool() {
  const [input, setInput] = useState(SAMPLE);
  const [pages, setPages] = useState([]);
  const [cols, setCols] = useState(2);
  const [active, setActive] = useState(false);

  const openGridFromUrls = useCallback(urls => {
    if (!urls.length) return;
    setPages(urls.slice(0, MAX_PAGES).map((url, i) => ({ url, id: `${url}-${Date.now()}-${i}` })));
    setActive(true);
  }, []);

  const loadShared = useCallback(data => {
    if (typeof data?.input === 'string') setInput(data.input);
    if ([1, 2, 3, 4].includes(data?.cols)) setCols(data.cols);
    const urls = (data?.input || '').split('\n').map(normalizeUrl).filter(Boolean);
    if (data?.openGrid && urls.length) openGridFromUrls(urls);
  }, [openGridFromUrls]);

  const parsedUrls = input.split('\n').map(normalizeUrl).filter(Boolean);
  const urlCount = Math.min(parsedUrls.length, MAX_PAGES);

  const { loadedFromShare, dismissLoadedBanner, sharePanelProps } = useToolShare({
    toolId: 'multipage',
    getPayload: () => ({ input, cols, openGrid: active }),
    onLoad: loadShared,
    canShare: parsedUrls.length > 0,
    confirmOnReplace: () => input !== SAMPLE || active,
    invalidateDeps: [input, cols, active],
  });

  const openGrid = () => {
    if (!parsedUrls.length) return;
    openGridFromUrls(parsedUrls);
  };

  const openAllTabs = () => {
    parsedUrls.forEach(u => window.open(u, '_blank', 'noopener,noreferrer'));
  };

  const remove = id => setPages(prev => prev.filter(p => p.id !== id));

  const back = () => {
    setActive(false);
    setPages([]);
  };

  if (active && pages.length) {
    const h = HEIGHT_BY_COLS[cols] ?? 460;
    return (
      <div className="mpv-root">
        <div className="mpv-toolbar">
          <button className="button secondary mpv-back-btn" onClick={back}>← Edit URLs</button>
          <div className="mpv-col-picker" role="group" aria-label="Grid columns">
            {[1, 2, 3, 4].map(n => (
              <button key={n} className={cols === n ? 'active' : ''} onClick={() => setCols(n)} aria-pressed={cols === n}>
                {n}
              </button>
            ))}
          </div>
          <button className="button secondary mpv-open-all" onClick={openAllTabs} title="Open all in new tabs">
            Open all in tabs ↗
          </button>
        </div>

        <p className="mpv-disclaimer">
          ⚠ You are viewing external websites. SurrendaSoft does not control their content.
          Avoid entering passwords, banking details, or sensitive information inside embedded frames.
        </p>

        <div
          className="mpv-grid"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, '--mpv-h': `${h}px` }}
        >
          {pages.map(p => (
            <PageFrame key={p.id} page={p} onRemove={() => remove(p.id)} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mpv-setup">
      <ToolShareBanner show={loadedFromShare} onDismiss={dismissLoadedBanner}/>

      <p className="mpv-intro">
        Paste URLs below — one per line — to open them side by side in a grid. Useful for monitoring
        websites, comparing pages, or keeping multiple dashboards open at once.
      </p>

      <label className="mpv-label">
        URLs <span className="mpv-label-count">({urlCount}/{MAX_PAGES} max)</span>
        <textarea
          className="mpv-textarea"
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={6}
          placeholder={`https://example.com\nhttps://yoursite.com\nhttps://dashboard.example.com`}
          spellCheck={false}
          aria-label="URLs to open, one per line"
        />
      </label>

      <div className="mpv-setup-row">
        <span className="mpv-setup-label">Grid columns</span>
        <div className="mpv-col-picker" role="group" aria-label="Grid columns">
          {[1, 2, 3, 4].map(n => (
            <button key={n} className={cols === n ? 'active' : ''} onClick={() => setCols(n)} aria-pressed={cols === n}>
              {n} col{n !== 1 ? 's' : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="mpv-setup-actions">
        <button className="button primary" onClick={openGrid} disabled={!parsedUrls.length}>
          Open in grid
        </button>
        <button className="button secondary" onClick={openAllTabs} disabled={!parsedUrls.length}>
          Open all in tabs ↗
        </button>
      </div>

      <div className="mpv-info-box">
        <strong>Heads up:</strong> many websites (Google, Facebook, banking sites, most web apps)
        block iframe embedding using browser security headers. Those panels will show a direct link
        instead. This is normal — it&apos;s their security setting, not a bug here.
        <br /><br />
        Sites that generally <em>work</em>: Wikipedia, news sites, status pages, simple informational pages,
        some dashboards. Sites that <em>block</em>: Google, social media, email, banking, most SaaS apps.
      </div>

      <ToolSharePanel {...sharePanelProps} qrHint="Scan to open this page grid on another device"/>
    </div>
  );
}
