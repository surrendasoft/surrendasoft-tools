import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { formatBytes } from '../utils/format.js';

export default function CameraTool() {
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const [active, setActive] = useState(false), [error, setError] = useState(''), [photos, setPhotos] = useState([]), [facingMode, setFacingMode] = useState('user');
  const videoRef = useRef(null), streamRef = useRef(null);
  const stopStream = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
  useEffect(() => () => { stopStream(); photos.forEach(p => URL.revokeObjectURL(p.url)); }, []);
  // The <video> element only mounts once `active` is true, so the stream must be
  // attached here (after the ref exists) rather than immediately after getUserMedia.
  useEffect(() => {
    if (active && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [active]);
  const start = async () => {
    setError('');
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      streamRef.current = stream;
      setActive(true);
    } catch (err) { setError(err.name === 'NotAllowedError' ? 'Camera permission was denied.' : 'Could not access the camera.'); }
  };
  const stop = () => { stopStream(); setActive(false); };
  const switchCamera = async () => { const next = facingMode === 'user' ? 'environment' : 'user'; setFacingMode(next); if (active) { stopStream(); try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }); streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream; } catch (err) { setActive(false); setError('Could not switch camera.'); } } };
  const snap = () => {
    const video = videoRef.current; if (!video) return;
    const canvas = window.document.createElement('canvas');
    canvas.width = video.videoWidth || 1280; canvas.height = video.videoHeight || 720;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => { if (!blob) return; const url = URL.createObjectURL(blob); const ts = new Date().toISOString().replace(/[:.]/g, '-'); setPhotos(prev => [...prev, { url, name: `photo-${ts}.jpg`, size: blob.size, selected: true }]); }, 'image/jpeg', 0.92);
  };
  const toggle = index => setPhotos(prev => prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p));
  const remove = index => { URL.revokeObjectURL(photos[index].url); setPhotos(prev => prev.filter((_, i) => i !== index)); };
  const selectAll = () => setPhotos(prev => prev.map(p => ({ ...p, selected: true })));
  const deselectAll = () => setPhotos(prev => prev.map(p => ({ ...p, selected: false })));
  const downloadSelected = () => { photos.filter(p => p.selected).forEach(p => { const a = window.document.createElement('a'); a.href = p.url; a.download = p.name; a.click(); }); };
  const selected = photos.filter(p => p.selected);
  if (!supported) return <p className="pdf-error">Your browser does not support camera access.</p>;
  return <>
    {!active && <div className="camera-controls"><button className="button primary" onClick={start}>Open camera</button></div>}
    {error && <p className="pdf-error">{error}</p>}
    {active && <>
      <div className="camera-viewfinder"><video ref={videoRef} autoPlay playsInline muted className="camera-video"/></div>
      <div className="camera-controls camera-controls-active">
        <button className="button primary" onClick={snap}><Icon name="spark"/> Take photo</button>
        <button className="button secondary" onClick={switchCamera}>Flip camera</button>
        <button className="button secondary" onClick={stop}>Close camera</button>
      </div>
    </>}
    {photos.length > 0 && <>
      <div className="camera-bar"><span>{photos.length} photo{photos.length !== 1 ? 's' : ''} · {selected.length} selected</span><div><button className="button secondary compact" onClick={selectAll}>Select all</button><button className="button secondary compact" onClick={deselectAll}>Deselect all</button><button className="button primary compact" onClick={downloadSelected} disabled={selected.length === 0}>Download {selected.length > 0 ? selected.length : ''} selected</button></div></div>
      <div className="camera-grid">{photos.map((p, i) => <div key={p.url} className={`camera-thumb ${p.selected ? 'sel' : ''}`} onClick={() => toggle(i)}><img src={p.url} alt={`Photo ${i + 1}`}/><div className="camera-thumb-bar"><span>{formatBytes(p.size)}</span><a href={p.url} download={p.name} onClick={e => e.stopPropagation()} className="camera-dl">↓</a><button onClick={e => { e.stopPropagation(); remove(i); }} className="camera-del">×</button></div><div className="camera-check">{p.selected ? <Icon name="check" size={14}/> : null}</div></div>)}</div>
    </>}
    <p className="tool-footnote">Photos are taken in your browser and never uploaded. Tap a photo to select or deselect it before downloading.</p></>;
}
