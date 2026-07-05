import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import Icon from '../components/Icon.jsx';
import ToolGlyph from '../components/ToolGlyph.jsx';
import { buildGoogleMapsRoute } from '../utils/mapRoute.js';
import './MultiStopMapTool.css';

const blankForm = { origin: '', destination: '', travelMode: 'driving' };

export default function MultiStopMapTool() {
  const [form, setForm] = useState(blankForm);
  const [stops, setStops] = useState(['']);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const canvasRef = useRef(null);
  const field = (name, value) => { setForm(current => ({ ...current, [name]: value })); setResult(null); setError(''); };

  useEffect(() => {
    if (!result?.url || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, result.url, { width: 280, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#10183e', light: '#ffffff' } });
  }, [result]);

  const generate = () => {
    try { setResult(buildGoogleMapsRoute({ ...form, stops })); setError(''); }
    catch (routeError) { setResult(null); setError(routeError.message); }
  };
  const copy = async (value, key) => { await navigator.clipboard.writeText(value); setCopied(key); window.setTimeout(() => setCopied(''), 1400); };
  const downloadQr = () => { const link = document.createElement('a'); link.download = 'google-maps-route-qr.png'; link.href = canvasRef.current.toDataURL('image/png'); link.click(); };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: 'Google Maps route', text: result.summary, url: result.url }); return; } catch { return; } }
    copy(result.message, 'share');
  };
  const clear = () => { setForm(blankForm); setStops(['']); setResult(null); setError(''); };

  return <div className="msm-root">
    <section className="msm-form">
      <div className="msm-intro"><ToolGlyph name="mapPin" size={22}/><div><strong>Build the route in your browser</strong><span>Add up to eight stops, then open or share one Google Maps link.</span></div></div>
      <div className="msm-fields">
        <label>Start location <span>Optional</span><input value={form.origin} onChange={event => field('origin', event.target.value)} placeholder="Current location or Gymea NSW"/></label>
        <label>Destination <b>Required</b><input value={form.destination} onChange={event => field('destination', event.target.value)} placeholder="Sutherland NSW"/></label>
      </div>
      <div className="msm-stops-head"><div><strong>Stops along the way</strong><span>Empty stops are ignored.</span></div><button className="button secondary compact" onClick={() => setStops(current => current.length < 8 ? [...current, ''] : current)} disabled={stops.length >= 8}><ToolGlyph name="plus" size={15}/> Add stop</button></div>
      <div className="msm-stops">{stops.map((stop, index) => <div className="msm-stop" key={index}><span>{index + 1}</span><label><span className="sr-only">Stop {index + 1}</span><input aria-label={`Stop ${index + 1}`} value={stop} onChange={event => { const next = [...stops]; next[index] = event.target.value; setStops(next); setResult(null); }} placeholder={`Stop ${index + 1}`}/></label><button aria-label={`Remove stop ${index + 1}`} onClick={() => setStops(current => current.length === 1 ? [''] : current.filter((_, itemIndex) => itemIndex !== index))}><ToolGlyph name="trash" size={17}/></button></div>)}</div>
      <fieldset className="msm-modes"><legend>Travel mode</legend>{[['driving','car','Driving'],['walking','userRound','Walking'],['bicycling','bike','Bicycling'],['transit','train','Transit']].map(([value, icon, label]) => <button key={value} type="button" className={form.travelMode === value ? 'active' : ''} aria-pressed={form.travelMode === value} onClick={() => field('travelMode', value)}><ToolGlyph name={icon} size={18}/>{label}</button>)}</fieldset>
      {error && <p className="msm-error" role="alert">{error}</p>}
      <div className="msm-primary-actions"><button className="button primary" onClick={generate}><ToolGlyph name="link" size={17}/> Generate map link</button><button className="button secondary" onClick={clear}>Clear form</button></div>
    </section>
    {result && <section className="msm-result" aria-label="Generated map route">
      <div className="msm-result-main"><span className="msm-ready"><Icon name="check" size={16}/> Route link ready</span><pre>{result.summary}</pre><label>Google Maps URL<input readOnly value={result.url}/></label><div className="msm-actions"><button className="button primary" onClick={() => copy(result.url, 'link')}><Icon name={copied === 'link' ? 'check' : 'copy'} size={17}/>{copied === 'link' ? 'Copied' : 'Copy link'}</button><a className="button secondary" href={result.url} target="_blank" rel="noreferrer noopener">Open in Google Maps <Icon name="arrow" size={16}/></a><button className="button secondary" onClick={() => copy(result.message, 'summary')}><Icon name={copied === 'summary' ? 'check' : 'copy'} size={17}/>Copy route message</button><button className="button secondary" onClick={share}>{copied === 'share' ? 'Copied for sharing' : 'Share route'}</button></div></div>
      <div className="msm-qr"><strong>Route QR code</strong><span>Scan to open this route on a phone.</span><canvas ref={canvasRef}/><button className="button secondary compact" onClick={downloadQr}><ToolGlyph name="download" size={16}/> Download QR</button></div>
    </section>}
    <p className="msm-privacy"><Icon name="shield" size={18}/><span><strong>Private by default.</strong> Addresses are processed in your browser. Nothing is uploaded or stored by SurrendaSoft.</span></p>
  </div>;
}
