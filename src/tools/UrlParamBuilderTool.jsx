import { useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';

// Well-known tracking parameters to highlight / strip
const TRACKING = new Set([
  'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
  'utm_id','utm_source_platform','utm_creative_format','utm_marketing_tactic',
  'fbclid','gclid','gclsrc','dclid','gbraid','wbraid',
  'msclkid','mc_eid','_ga','_gl','twclid','igshid','li_fat_id',
]);

const UTM_FIELDS = [
  { key: 'utm_source',   hint: 'newsletter, google, facebook…' },
  { key: 'utm_medium',   hint: 'email, cpc, social, organic…' },
  { key: 'utm_campaign', hint: 'spring-sale, launch-2026…' },
  { key: 'utm_term',     hint: 'paid search keyword (optional)' },
  { key: 'utm_content',  hint: 'banner-a, link-footer… (optional)' },
];

let _id = 1;
const uid = () => _id++;

function parseUrl(raw) {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
    const params = [];
    u.searchParams.forEach((v, k) => params.push({ id: uid(), k, v }));
    return { base: u.origin + u.pathname, params, hash: u.hash };
  } catch {
    return null;
  }
}

function buildUrl(base, params, hash) {
  const qs = params
    .filter(p => p.k.trim())
    .map(p => encodeURIComponent(p.k.trim()) + '=' + encodeURIComponent(p.v))
    .join('&');
  return base + (qs ? '?' + qs : '') + (hash || '');
}

export default function UrlParamBuilderTool() {
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState(null);
  const [original, setOriginal] = useState('');
  const [copied, setCopied] = useState(false);

  const load = () => {
    const p = parseUrl(input);
    if (!p) return;
    setParsed(p);
    setOriginal(/^https?:\/\//i.test(input.trim()) ? input.trim() : 'https://' + input.trim());
  };

  const mutate = fn => setParsed(prev => prev ? fn(prev) : prev);

  const updateParam = (id, field, val) =>
    mutate(p => ({ ...p, params: p.params.map(x => x.id === id ? { ...x, [field]: val } : x) }));

  const removeParam = id =>
    mutate(p => ({ ...p, params: p.params.filter(x => x.id !== id) }));

  const addRow = () =>
    mutate(p => ({ ...p, params: [...p.params, { id: uid(), k: '', v: '' }] }));

  const removeTracking = () =>
    mutate(p => ({ ...p, params: p.params.filter(x => !TRACKING.has(x.k.toLowerCase())) }));

  const clearAll = () => mutate(p => ({ ...p, params: [] }));

  // UTM quick-fill: write directly into the params table
  const setUtm = (key, val) =>
    mutate(p => {
      const idx = p.params.findIndex(x => x.k === key);
      if (!val.trim()) {
        return idx >= 0 ? { ...p, params: p.params.filter(x => x.k !== key) } : p;
      }
      if (idx >= 0) return { ...p, params: p.params.map(x => x.k === key ? { ...x, v: val } : x) };
      return { ...p, params: [...p.params, { id: uid(), k: key, v: val }] };
    });

  const getUtm = key => parsed?.params.find(x => x.k === key)?.v ?? '';

  const built = useMemo(() => parsed ? buildUrl(parsed.base, parsed.params, parsed.hash) : '', [parsed]);

  const copy = async () => {
    if (!built) return;
    try { await navigator.clipboard.writeText(built); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const visibleCount = parsed?.params.filter(p => p.k.trim()).length ?? 0;
  const hasTracking = parsed?.params.some(p => TRACKING.has(p.k.toLowerCase()));
  const changed = parsed && built !== original;

  return (
    <>
      {/* URL input */}
      <div className="upb-input-row">
        <input
          className="upb-url-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="https://example.com/page?existing=params"
          type="url"
          spellCheck={false}
        />
        <button className="upb-load-btn" onClick={load}>Load</button>
      </div>

      {!parsed ? (
        <div className="upb-empty">
          Paste any URL above and press <strong>Load</strong> — existing parameters are parsed automatically
        </div>
      ) : (
        <>
          {/* Base URL editor */}
          <div className="upb-base-row">
            <span className="upb-base-label">Base</span>
            <input
              className="upb-base-input"
              value={parsed.base}
              onChange={e => mutate(p => ({ ...p, base: e.target.value }))}
              spellCheck={false}
            />
            {parsed.hash && <span className="upb-hash">{parsed.hash}</span>}
          </div>

          {/* Parameters table */}
          <div className="upb-params-block">
            <div className="upb-params-hd">
              <span>
                Parameters
                {visibleCount > 0 && <span className="upb-count-pill">{visibleCount}</span>}
              </span>
              <button className="upb-add-btn" onClick={addRow}>+ Add</button>
            </div>

            {parsed.params.length === 0 ? (
              <div className="upb-no-params">No parameters yet — click Add or use UTM Quick Fill below</div>
            ) : (
              <div className="upb-param-list">
                <div className="upb-col-labels"><span>Key</span><span>Value</span></div>
                {parsed.params.map(p => (
                  <div key={p.id} className={`upb-param-row${TRACKING.has(p.k.toLowerCase()) ? ' upb-is-tracking' : ''}`}>
                    <input
                      className="upb-key-inp"
                      value={p.k}
                      onChange={e => updateParam(p.id, 'k', e.target.value)}
                      placeholder="key"
                      spellCheck={false}
                    />
                    <input
                      className="upb-val-inp"
                      value={p.v}
                      onChange={e => updateParam(p.id, 'v', e.target.value)}
                      placeholder="value"
                      spellCheck={false}
                    />
                    <button className="upb-del-btn" onClick={() => removeParam(p.id)} title="Remove">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action strip */}
          {(hasTracking || (parsed.params.length > 0)) && (
            <div className="upb-actions">
              {hasTracking && (
                <button className="upb-act-btn" onClick={removeTracking}>
                  🧹 Remove tracking
                </button>
              )}
              {parsed.params.length > 0 && (
                <button className="upb-act-btn" onClick={clearAll}>Clear all</button>
              )}
            </div>
          )}

          {/* UTM Quick Fill */}
          <details className="upb-utm">
            <summary className="upb-utm-summary">UTM Quick Fill</summary>
            <div className="upb-utm-fields">
              {UTM_FIELDS.map(({ key, hint }) => (
                <label key={key} className="upb-utm-label">
                  <span className="upb-utm-key">{key}</span>
                  <input
                    className="upb-utm-input"
                    value={getUtm(key)}
                    onChange={e => setUtm(key, e.target.value)}
                    placeholder={hint}
                    spellCheck={false}
                  />
                </label>
              ))}
            </div>
          </details>

          {/* Output */}
          <div className="upb-output">
            <div className="upb-output-hd">
              <span className="upb-output-title">Built URL</span>
              <button className="upb-copy-btn" onClick={copy}>
                {copied ? <><Icon name="check" size={13}/> Copied</> : 'Copy'}
              </button>
            </div>
            <div className="upb-built">{built}</div>
          </div>

          {/* Before / After compare */}
          {changed && (
            <div className="upb-compare">
              <div className="upb-compare-hd">Changes</div>
              <div className="upb-compare-row">
                <span className="upb-badge upb-before">Before</span>
                <code className="upb-compare-url upb-old">{original}</code>
              </div>
              <div className="upb-compare-row">
                <span className="upb-badge upb-after">After</span>
                <code className="upb-compare-url upb-new">{built}</code>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
