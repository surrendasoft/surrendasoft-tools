import { useState } from 'react';

export default function WebsiteStatusTool() {
  const [url, setUrl] = useState('https://surrendasoft.com');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const normaliseUrl = value => /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  const check = async () => {
    if (!url.trim()) return;
    const target = normaliseUrl(url);
    setChecking(true); setResult(null);
    const started = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(target, { method: 'HEAD', cache: 'no-store', signal: controller.signal });
      setResult({ type: response.ok ? 'success' : 'warning', title: response.ok ? 'Website responded' : 'Website returned an error', detail: `${response.status} ${response.statusText || 'response'} - ${Math.round(performance.now() - started)} ms`, target });
    } catch (error) {
      try {
        await fetch(target, { mode: 'no-cors', cache: 'no-store', signal: controller.signal });
        setResult({ type: 'success', title: 'Website appears reachable', detail: `Reached in ${Math.round(performance.now() - started)} ms. Status code is hidden by browser privacy rules.`, target });
      } catch (fallbackError) {
        setResult({ type: 'error', title: fallbackError.name === 'AbortError' ? 'Request timed out' : 'Could not reach website', detail: fallbackError.name === 'AbortError' ? 'No response within 8 seconds.' : 'The site may be offline, blocking browser checks, or the address may be incorrect.', target });
      }
    } finally {
      clearTimeout(timeout); setChecking(false);
    }
  };
  return <><label className="textarea-label status-url">Website URL<input value={url} onChange={event => { setUrl(event.target.value); setResult(null); }} placeholder="example.com" inputMode="url"/></label><button className="button primary status-button" onClick={check} disabled={checking || !url.trim()}>{checking ? 'Checking...' : 'Check website'}</button>{result && <div className={`status-result ${result.type}`}><div><strong>{result.title}</strong><span>{result.target}</span></div><p>{result.detail}</p></div>}<p className="tool-footnote">Browser checks can confirm reachability, but a backend monitor is needed for full uptime, SSL, and regional checks.</p></>;
}
