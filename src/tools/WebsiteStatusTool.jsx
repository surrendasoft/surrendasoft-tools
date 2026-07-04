import { useState } from 'react';

function normaliseUrl(raw) {
  const s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) return 'https://' + s;
  return s;
}

function hostname(url) {
  try { return new URL(url).hostname; } catch { return url; }
}

// ── Run all checks and return structured result ───────────────────────────────
async function runChecks(target) {
  const isHttps = target.startsWith('https://');

  // Check 1: CORS HEAD — may reveal status code on permissive sites
  let statusCode = null;
  let headTime = null;
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 8000);
    const t = performance.now();
    const resp = await fetch(target, { method: 'HEAD', cache: 'no-store', signal: ctrl.signal });
    headTime = Math.round(performance.now() - t);
    statusCode = resp.status;
  } catch { /* blocked by CORS — expected */ }

  // Check 2: no-cors fetch — confirms reachability even without CORS
  let reachable = false;
  let reachTime = null;
  let timedOut = false;
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 8000);
    const t = performance.now();
    await fetch(target, { mode: 'no-cors', cache: 'no-store', signal: ctrl.signal });
    reachTime = Math.round(performance.now() - t);
    reachable = true;
  } catch (e) {
    timedOut = e.name === 'AbortError';
  }

  // Check 3: if HTTPS failed, try HTTP to see if the domain resolves at all
  let httpResult = null;
  if (!reachable && isHttps) {
    const httpUrl = target.replace(/^https:\/\//, 'http://');
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 5000);
      const t = performance.now();
      await fetch(httpUrl, { mode: 'no-cors', cache: 'no-store', signal: ctrl.signal });
      httpResult = { reachable: true, time: Math.round(performance.now() - t) };
    } catch { /* HTTP also failed */ }
  }

  // Resource Timing API — may give DNS/TCP/TLS breakdown for CORS-allowed requests
  let timing = null;
  try {
    const entries = performance.getEntriesByName(target);
    const e = entries[entries.length - 1];
    if (e) {
      const dns = Math.round(e.domainLookupEnd - e.domainLookupStart);
      const tcp = Math.round(e.connectEnd - e.connectStart);
      const tls = e.secureConnectionStart > 0 ? Math.round(e.connectEnd - e.secureConnectionStart) : null;
      const ttfb = e.responseStart > 0 ? Math.round(e.responseStart - e.requestStart) : null;
      if (dns > 0 || tcp > 0 || tls != null) timing = { dns, tcp, tls, ttfb };
    }
  } catch { /* timing API not available */ }

  const displayTime = headTime ?? reachTime;

  return { target, host: hostname(target), isHttps, reachable, reachTime: displayTime, statusCode, timedOut, timing, httpResult };
}

// ── Check row with pass / warn / fail icon ────────────────────────────────────
function CheckRow({ state, label, detail }) {
  const icon = state === 'pass' ? '✓' : state === 'warn' ? '⚠' : '✗';
  return (
    <div className={`wsc-check-row wsc-check-${state}`}>
      <span className="wsc-check-icon">{icon}</span>
      <span className="wsc-check-label">{label}</span>
      <span className="wsc-check-detail">{detail}</span>
    </div>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({ r }) {
  const overall = r.reachable ? 'up' : r.httpResult?.reachable ? 'partial' : r.timedOut ? 'timeout' : 'down';
  const bannerClass = { up: 'wsc-banner-up', partial: 'wsc-banner-warn', timeout: 'wsc-banner-warn', down: 'wsc-banner-down' }[overall];
  const bannerTitle = { up: 'Reachable', partial: 'HTTP only — no HTTPS', timeout: 'Timed out', down: 'Unreachable' }[overall];
  const time = r.reachTime;

  const httpsState = r.isHttps
    ? (r.reachable ? 'pass' : r.httpResult ? 'warn' : 'fail')
    : 'warn';
  const httpsDetail = r.isHttps
    ? (r.reachable ? 'Secured with HTTPS' : r.httpResult?.reachable ? 'HTTPS failed; HTTP works' : 'HTTPS unavailable')
    : 'HTTP only — connection is not encrypted';

  const reachState = r.reachable ? 'pass' : r.timedOut ? 'warn' : 'fail';
  const reachDetail = r.reachable
    ? `Responded in ${time} ms`
    : r.timedOut ? 'No response within 8 seconds'
    : r.httpResult?.reachable ? `HTTP reachable (${r.httpResult.time} ms) — HTTPS blocked`
    : 'No response — may be offline or blocking browser checks';

  const statusState = r.statusCode ? (r.statusCode < 400 ? 'pass' : r.statusCode < 500 ? 'warn' : 'fail') : 'warn';
  const statusDetail = r.statusCode
    ? `HTTP ${r.statusCode}${r.statusCode === 200 ? ' OK' : r.statusCode === 301 ? ' Moved Permanently' : r.statusCode === 302 ? ' Found' : r.statusCode === 403 ? ' Forbidden' : r.statusCode === 404 ? ' Not Found' : ''}`
    : 'Hidden — site blocks cross-origin requests (normal for most websites)';

  return (
    <div className="wsc-card">
      <div className={`wsc-banner ${bannerClass}`}>
        <div className="wsc-banner-body">
          <strong>{bannerTitle}</strong>
          <span>{r.host}</span>
        </div>
        {time != null && <span className="wsc-time-pill">{time} ms</span>}
      </div>

      <div className="wsc-checks">
        <CheckRow state={httpsState} label="HTTPS" detail={httpsDetail} />
        <CheckRow state={reachState} label="Reachability" detail={reachDetail} />
        <CheckRow state={statusState} label="HTTP status" detail={statusDetail} />
      </div>

      {r.timing && (
        <div className="wsc-timing">
          <span className="wsc-timing-label">Timing breakdown</span>
          <div className="wsc-timing-pills">
            {r.timing.dns > 0 && <span>DNS {r.timing.dns} ms</span>}
            {r.timing.tcp > 0 && <span>TCP {r.timing.tcp} ms</span>}
            {r.timing.tls != null && <span>TLS {r.timing.tls} ms</span>}
            {r.timing.ttfb != null && <span>TTFB {r.timing.ttfb} ms</span>}
          </div>
        </div>
      )}

      <details className="wsc-limits">
        <summary>What this check can and can't tell you</summary>
        <ul>
          <li><strong>Can check:</strong> whether the site responds from your browser and location, HTTPS vs HTTP, response time, and HTTP status when the site allows it.</li>
          <li><strong>Can't check:</strong> status codes from sites that block cross-origin requests (most), server-side errors, SSL certificate validity, performance from other regions, or uptime over time.</li>
          <li>For proper uptime monitoring, SSL alerts, and multi-region checks, you need a backend service like UptimeRobot or StatusCake.</li>
        </ul>
      </details>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WebsiteStatusTool() {
  const [url, setUrl] = useState('https://surrendasoft.com');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [phase, setPhase] = useState('');

  const check = async () => {
    const target = normaliseUrl(url);
    if (!target) return;
    setChecking(true);
    setResult(null);
    setPhase('Checking HTTPS…');
    try {
      const r = await runChecks(target);
      setResult(r);
    } finally {
      setChecking(false);
      setPhase('');
    }
  };

  return (
    <>
      <div className="status-input-row">
        <input
          value={url}
          onChange={e => { setUrl(e.target.value); setResult(null); }}
          onKeyDown={e => e.key === 'Enter' && !checking && check()}
          placeholder="example.com"
          type="url"
          aria-label="Website URL to check"
        />
        <button className="button primary status-button" onClick={check} disabled={checking || !url.trim()}>
          {checking ? (phase || 'Checking…') : 'Check website'}
        </button>
      </div>

      {result && <ResultCard r={result} />}

      <p className="tool-footnote">
        Checks run from your browser and location only. For global uptime monitoring and SSL alerts, a dedicated backend service is needed.
      </p>
    </>
  );
}
