import { useEffect, useState } from 'react';
import ScamAiPanel from '../components/ScamAiPanel.jsx';
import ToolGlyph from '../components/ToolGlyph.jsx';
import { analyseLink } from '../utils/scamAnalysis.js';
import './LinkScamCheckerTool.css';

const VERDICT_UI = {
  safe: { label: 'Looks safe', icon: 'check', col: '#08785f', bg: '#eaf9f4', bd: '#c6ebdf' },
  suspicious: { label: 'Suspicious', icon: 'warning', col: '#a05c00', bg: '#fff8ec', bd: '#f5d896' },
  scam: { label: 'Likely a scam', icon: 'siren', col: '#b53e3e', bg: '#fff0f0', bd: '#f5b8b8' },
};

const readPrefilledUrl = () => {
  const match = window.location.hash.match(/^#linkscam\/check\/(.+)$/);
  if (!match) return '';
  try { return decodeURIComponent(match[1]); } catch { return ''; }
};

export default function LinkScamCheckerTool() {
  const [url, setUrl] = useState(readPrefilledUrl);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const onHash = () => {
      const prefilled = readPrefilledUrl();
      if (prefilled) {
        setUrl(prefilled);
        setResult(analyseLink(prefilled));
      }
    };
    if (readPrefilledUrl()) setResult(analyseLink(readPrefilledUrl()));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const analyse = () => setResult(analyseLink(url));
  const vm = result ? VERDICT_UI[result.verdict] : null;

  return (
    <div className="linkscam-root">
      <div className="linkscam-promise">
        <ToolGlyph name="shieldAlert" size={22} />
        <div>
          <strong>Paste a link before you tap it</strong>
          <span>Check URLs from texts, social posts, or emails for phishing patterns and dodgy domains.</span>
        </div>
      </div>

      <div className="linkscam-form">
        <label className="textarea-label">
          Suspicious URL
          <input
            value={url}
            onChange={event => { setUrl(event.target.value); setResult(null); }}
            placeholder="https://example.com/login"
            type="url"
            autoComplete="off"
            aria-label="Suspicious URL"
          />
        </label>
      </div>

      <button className="button primary pdf-action" onClick={analyse} disabled={!url.trim()}>
        Check link
      </button>

      {result && vm && (
        <>
          <div className="linkscam-verdict" style={{ background: vm.bg, borderColor: vm.bd }}>
            <span style={{ color: vm.col }}>
              <ToolGlyph name={vm.icon} size={22} /> {vm.label}
            </span>
            <p>
              {result.total === 0
                ? 'No common scam patterns detected in this URL. Still verify unexpected links independently.'
                : `${result.total} signal${result.total !== 1 ? 's' : ''} detected. ${result.verdict === 'scam' ? 'Do not open this link or enter any personal details.' : 'Proceed with caution and verify through official channels.'}`}
            </p>
          </div>

          <div className="linkscam-url-box">
            <span className="linkscam-url-label">Checked URL</span>
            <pre className="linkscam-url">{result.raw}</pre>
          </div>

          {result.parsed.host && (
            <dl className="linkscam-parsed">
              <div><dt>Host</dt><dd>{result.parsed.host}</dd></div>
              <div><dt>Scheme</dt><dd>{result.parsed.scheme || '—'}</dd></div>
              {result.parsed.path && result.parsed.path !== '/' && (
                <div><dt>Path</dt><dd>{result.parsed.path}</dd></div>
              )}
            </dl>
          )}

          {result.urlFlags.length > 0 && (
            <div className="scam-flags">
              {result.urlFlags.map((flag, index) => (
                <div key={index} className="scam-flag scam-link">
                  <span className="scam-tag">Link</span>
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ScamAiPanel kind="link" promptText={url.trim() ? `URL to analyse:\n${url.trim()}` : ''} disabled={!url.trim()} />

      <div className="scam-related">
        <span>Checking something else?</span>
        <a href="#scam">Email Scam Checker</a>
        <a href="#qrscam">QR Scam Checker</a>
      </div>

      <p className="tool-footnote">Pattern matching + optional on-device AI — links are never opened automatically. Not a substitute for professional security advice.</p>
    </div>
  );
}
