import { useState } from 'react';
import Icon from '../components/Icon.jsx';

export default function LocationTool() {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const [status, setStatus] = useState('idle'), [coords, setCoords] = useState(null), [error, setError] = useState(''), [copied, setCopied] = useState(false);
  const locate = () => {
    setStatus('locating'); setError(''); setCopied(false);
    navigator.geolocation.getCurrentPosition(
      position => { setCoords({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy }); setStatus('done'); },
      err => { setError(err.code === 1 ? 'Location permission was denied.' : 'Could not determine your location. Try again outdoors or with GPS enabled.'); setStatus('error'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  const copy = async () => { if (!coords) return; await navigator.clipboard?.writeText(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`); setCopied(true); };
  if (!supported) return <p className="pdf-error">Your browser does not support geolocation.</p>;
  return <><button className="button primary status-button" onClick={locate} disabled={status === 'locating'}>{status === 'locating' ? 'Locating…' : coords ? 'Update my location' : 'Find my location'}</button>
    {error && <p className="pdf-error">{error}</p>}
    {coords && <><div className="location-grid"><div><span>Latitude</span><strong>{coords.lat.toFixed(6)}</strong></div><div><span>Longitude</span><strong>{coords.lng.toFixed(6)}</strong></div><div><span>Accuracy</span><strong>±{Math.round(coords.accuracy)} m</strong></div></div><div className="location-actions"><button className="button secondary compact" onClick={copy}><Icon name={copied ? 'check' : 'copy'} size={18}/> {copied ? 'Copied' : 'Copy coordinates'}</button><a className="button primary compact" href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=16/${coords.lat}/${coords.lng}`} target="_blank" rel="noreferrer noopener">View on map</a></div></>}
    <p className="tool-footnote">Coordinates come from your device and stay in your browser. Accuracy depends on GPS, Wi-Fi, and your hardware.</p></>;
}
