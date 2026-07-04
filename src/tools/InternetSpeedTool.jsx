import { useState } from 'react';
import { formatBytes } from '../utils/format.js';

export default function InternetSpeedTool() {
  const [size, setSize] = useState(5);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const runTest = async () => {
    setRunning(true); setResult(null);
    const bytes = size * 1000 * 1000;
    const started = performance.now();
    try {
      const response = await fetch(`https://speed.cloudflare.com/__down?bytes=${bytes}&cache=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Speed test returned ${response.status}`);
      const buffer = await response.arrayBuffer();
      const seconds = (performance.now() - started) / 1000;
      const mbps = (buffer.byteLength * 8) / seconds / 1000 / 1000;
      setResult({ type: 'success', mbps, seconds, size: buffer.byteLength });
    } catch (error) {
      setResult({ type: 'error', message: error.message || 'Could not complete the speed test.' });
    }
    setRunning(false);
  };
  const speedRating = mbps => {
    if (mbps >= 100) return { label: 'Excellent', note: 'Great for 4K streaming, large uploads, and video calls.', color: '#08785f' };
    if (mbps >= 25)  return { label: 'Fast', note: 'Handles HD streaming, remote work, and video calls comfortably.', color: '#1666d9' };
    if (mbps >= 10)  return { label: 'Okay', note: 'Fine for browsing and SD video. May struggle with 4K or large files.', color: '#8a6500' };
    if (mbps >= 5)   return { label: 'Slow', note: 'Basic browsing should work. Streaming and large downloads will be slow.', color: '#c25c00' };
    return { label: 'Very slow', note: 'May struggle with most online tasks. Try restarting your router or moving closer to it.', color: '#a83b3b' };
  };
  return <><div className="speed-panel"><label>Test size<select value={size} onChange={event => setSize(Number(event.target.value))}><option value="1">Quick - 1 MB</option><option value="5">Standard - 5 MB</option><option value="10">Stronger - 10 MB</option></select></label><button className="button primary" onClick={runTest} disabled={running}>{running ? 'Testing...' : 'Start speed test'}</button></div>{result?.type === 'success' && (() => { const r = speedRating(result.mbps); return <div className="speed-result"><strong>{result.mbps.toFixed(1)} Mbps</strong><div className="speed-rating" style={{color: r.color}}><span className="speed-rating-label">{r.label}</span><span className="speed-rating-note">{r.note}</span></div><span className="speed-detail">{formatBytes(result.size)} downloaded in {result.seconds.toFixed(2)} s</span><meter min="0" max="150" optimum="100" value={Math.min(150, result.mbps)}/></div>; })()}{result?.type === 'error' && <p className="pdf-error">{result.message}</p>}<p className="tool-footnote">This is a quick download estimate from your current browser session, not a replacement for a full ISP diagnostic.</p></>;
}
