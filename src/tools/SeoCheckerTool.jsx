import { useState } from 'react';

export default function SeoCheckerTool() {
  const [url, setUrl] = useState('https://surrendasoft.com');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [result, setResult] = useState(null);
  const normalise = v => /^https?:\/\//i.test(v.trim()) ? v.trim() : `https://${v.trim()}`;
  const check = async () => {
    const target = normalise(url);
    setBusy(true); setError(''); setResult(null);
    try {
      const [mRes, dRes] = await Promise.all([
        fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(target)}&strategy=mobile`),
        fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(target)}&strategy=desktop`),
      ]);
      if (!mRes.ok) { const err = await mRes.json().catch(() => ({})); throw new Error(err?.error?.message || `PageSpeed API error ${mRes.status}. Make sure the URL is public.`); }
      const [mob, desk] = await Promise.all([mRes.json(), dRes.json()]);
      const lhr = mob.lighthouseResult, audits = lhr?.audits || {}, cats = lhr?.categories || {};
      const titleAudit = audits['document-title'], metaAudit = audits['meta-description'], imgAudit = audits['image-alt'], vpAudit = audits['viewport'];
      const titleText = titleAudit?.details?.items?.[0]?.snippet || (titleAudit?.score === 0 ? 'Missing' : '—');
      const metaText = metaAudit?.score === 1 ? (metaAudit?.details?.items?.[0]?.value?.slice(0,80) || 'Present') : 'Missing';
      const imgText = imgAudit?.score === 1 ? 'All images have alt text' : imgAudit?.details?.items?.length ? `Missing on ${imgAudit.details.items.length} image(s)` : 'Unknown';
      const vpText = vpAudit?.score === 1 ? 'Configured' : 'Missing or misconfigured';
      const mobScore = Math.round((cats?.performance?.score ?? 0) * 100);
      const deskScore = Math.round((desk.lighthouseResult?.categories?.performance?.score ?? 0) * 100);
      const seoScore = Math.round((cats?.seo?.score ?? 0) * 100);
      const a11yScore = Math.round((cats?.accessibility?.score ?? 0) * 100);
      const fcp = audits['first-contentful-paint']?.displayValue || '—';
      const lcp = audits['largest-contentful-paint']?.displayValue || '—';
      const tbt = audits['total-blocking-time']?.displayValue || '—';
      const cls = audits['cumulative-layout-shift']?.displayValue || '—';
      const opps = Object.values(audits).filter(a => a.score !== null && a.score < 0.9 && a.details?.type === 'opportunity').sort((a,b) => (b.details?.overallSavingsMs||0)-(a.details?.overallSavingsMs||0)).map(a => a.title).slice(0,5);
      const displayUrl = lhr?.finalDisplayedUrl || target;
      setResult({ displayUrl, titleText, metaText, imgText, vpText, mobScore, deskScore, seoScore, a11yScore, fcp, lcp, tbt, cls, opps, https: target.startsWith('https') });
    } catch (err) { setError(err.message || 'Could not fetch SEO data.'); }
    setBusy(false);
  };
  const tier = n => n >= 90 ? 'good' : n >= 50 ? 'ok' : 'poor';
  return <>
    <div className="status-input-row">
      <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && !busy && check()} placeholder="https://example.com" type="url" aria-label="Website URL to check"/>
      <button className="button primary" onClick={check} disabled={busy || !url.trim()}>{busy ? 'Checking…' : 'Check SEO'}</button>
    </div>
    {error && <p className="pdf-error">{error}</p>}
    {result && <>
      <p className="seo-url">{result.displayUrl}</p>
      <div className="seo-scores">
        <div className={`seo-score ${tier(result.mobScore)}`}><strong>{result.mobScore}</strong><span>Mobile speed</span></div>
        <div className={`seo-score ${tier(result.deskScore)}`}><strong>{result.deskScore}</strong><span>Desktop speed</span></div>
        <div className={`seo-score ${tier(result.seoScore)}`}><strong>{result.seoScore}</strong><span>SEO score</span></div>
        <div className={`seo-score ${tier(result.a11yScore)}`}><strong>{result.a11yScore}</strong><span>Accessibility</span></div>
      </div>
      <div className="seo-grid">
        <div><span>Title tag</span><strong title={result.titleText}>{result.titleText.length > 55 ? result.titleText.slice(0,55)+'…' : result.titleText}</strong></div>
        <div><span>Meta description</span><strong>{result.metaText.length > 80 ? result.metaText.slice(0,80)+'…' : result.metaText}</strong></div>
        <div><span>Image alt text</span><strong>{result.imgText}</strong></div>
        <div><span>Viewport meta</span><strong>{result.vpText}</strong></div>
        <div><span>HTTPS</span><strong>{result.https ? 'Yes' : 'No — not secure'}</strong></div>
        <div><span>First Contentful Paint</span><strong>{result.fcp}</strong></div>
        <div><span>Largest Contentful Paint</span><strong>{result.lcp}</strong></div>
        <div><span>Total Blocking Time</span><strong>{result.tbt}</strong></div>
        <div><span>Layout Shift (CLS)</span><strong>{result.cls}</strong></div>
      </div>
      {result.opps.length > 0 && <div className="seo-opps"><strong>Top opportunities</strong><ul>{result.opps.map((o,i) => <li key={i}>{o}</li>)}</ul></div>}
    </>
    }
    <p className="tool-footnote">Powered by Google PageSpeed Insights (free, no API key). The site must be publicly accessible. Scores are out of 100 and may vary slightly between runs.</p></>;
}
