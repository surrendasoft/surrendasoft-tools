import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import ToolGlyph from '../components/ToolGlyph.jsx';
import { formatBytes } from '../utils/format.js';

const CLIP_LENGTHS = [{ value: 0.5, label: '30 seconds' }, { value: 1, label: '1 minute' }, { value: 2, label: '2 minutes' }, { value: 5, label: '5 minutes' }];

export default function CameraTool() {
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const recorderSupported = typeof window !== 'undefined' && 'MediaRecorder' in window;
  const [mode, setMode] = useState('photo'); // 'photo' | 'video'
  const [active, setActive] = useState(false), [error, setError] = useState(''), [photos, setPhotos] = useState([]), [facingMode, setFacingMode] = useState('user');
  const [includeAudio, setIncludeAudio] = useState(true);
  const [maxMinutes, setMaxMinutes] = useState(1);
  const [recording, setRecording] = useState(false), [seconds, setSeconds] = useState(0), [videos, setVideos] = useState([]);
  const videoRef = useRef(null), streamRef = useRef(null), recorderRef = useRef(null), chunksRef = useRef([]), timerRef = useRef(null);
  const stopStream = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
  const wantsAudio = () => mode === 'video' && includeAudio;
  useEffect(() => () => { stopStream(); clearInterval(timerRef.current); photos.forEach(p => URL.revokeObjectURL(p.url)); videos.forEach(v => URL.revokeObjectURL(v.url)); }, []);
  // The <video> element only mounts once `active` is true, so the stream must be
  // attached here (after the ref exists) rather than immediately after getUserMedia.
  useEffect(() => {
    if (active && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [active]);
  const start = async () => {
    setError('');
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: wantsAudio() });
      streamRef.current = stream;
      setActive(true);
    } catch (err) { setError(err.name === 'NotAllowedError' ? 'Camera permission was denied.' : 'Could not access the camera.'); }
  };
  const stop = () => { if (recording) stopRecording(); stopStream(); setActive(false); };
  const switchCamera = async () => { const next = facingMode === 'user' ? 'environment' : 'user'; setFacingMode(next); if (active) { stopStream(); try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: wantsAudio() }); streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream; } catch (err) { setActive(false); setError('Could not switch camera.'); } } };
  const snap = () => {
    const video = videoRef.current; if (!video) return;
    const canvas = window.document.createElement('canvas');
    canvas.width = video.videoWidth || 1280; canvas.height = video.videoHeight || 720;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => { if (!blob) return; const url = URL.createObjectURL(blob); const ts = new Date().toISOString().replace(/[:.]/g, '-'); setPhotos(prev => [...prev, { url, name: `photo-${ts}.jpg`, size: blob.size, selected: true }]); }, 'image/jpeg', 0.92);
  };
  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };
  const startRecording = () => {
    if (!streamRef.current) return;
    setError(''); chunksRef.current = [];
    let recorder;
    try { recorder = new MediaRecorder(streamRef.current); }
    catch { setError('Video recording is not supported in this browser.'); return; }
    recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      setVideos(prev => [...prev, { url, name: `video-${ts}.webm`, size: blob.size }]);
    };
    recorderRef.current = recorder; recorder.start();
    setRecording(true); setSeconds(0);
    const cap = Math.round(maxMinutes * 60);
    timerRef.current = setInterval(() => setSeconds(prev => { const next = prev + 1; if (next >= cap) stopRecording(); return next; }), 1000);
  };
  const removeVideo = index => { URL.revokeObjectURL(videos[index].url); setVideos(prev => prev.filter((_, i) => i !== index)); };
  const clock = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  const toggle = index => setPhotos(prev => prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p));
  const remove = index => { URL.revokeObjectURL(photos[index].url); setPhotos(prev => prev.filter((_, i) => i !== index)); };
  const selectAll = () => setPhotos(prev => prev.map(p => ({ ...p, selected: true })));
  const deselectAll = () => setPhotos(prev => prev.map(p => ({ ...p, selected: false })));
  const downloadSelected = () => { photos.filter(p => p.selected).forEach(p => { const a = window.document.createElement('a'); a.href = p.url; a.download = p.name; a.click(); }); };
  const selected = photos.filter(p => p.selected);
  if (!supported) return <p className="pdf-error">Your browser does not support camera access.</p>;
  return <>
    {!active && <div className="camera-pre">
      <div className="camera-mode-tabs" role="group" aria-label="Capture mode">
        <button className={mode === 'photo' ? 'active' : ''} aria-pressed={mode === 'photo'} onClick={() => setMode('photo')}><ToolGlyph name="camera" size={16}/> Photo</button>
        <button className={mode === 'video' ? 'active' : ''} aria-pressed={mode === 'video'} onClick={() => setMode('video')}><ToolGlyph name="video" size={16}/> Video</button>
      </div>
      {mode === 'video' && <div className="camera-video-options">
        <label className="camera-audio-toggle"><input type="checkbox" checked={includeAudio} onChange={e => setIncludeAudio(e.target.checked)}/> Include audio</label>
        <label className="camera-length-label">Clip length<select value={maxMinutes} onChange={e => setMaxMinutes(Number(e.target.value))}>{CLIP_LENGTHS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
      </div>}
      {mode === 'video' && !recorderSupported && <p className="pdf-error">Your browser does not support video recording — you can still use Photo mode.</p>}
      <div className="camera-controls"><button className="button primary" onClick={start}>Open camera</button></div>
    </div>}
    {error && <p className="pdf-error">{error}</p>}
    {active && <>
      <div className="camera-viewfinder">
        <video ref={videoRef} autoPlay playsInline muted className="camera-video"/>
        {mode === 'video' && recording && <div className="camera-rec-badge"><span className="camera-rec-dot"/>{clock(seconds)}</div>}
      </div>
      <div className="camera-controls camera-controls-active">
        {mode === 'photo' && <><button className="button primary" onClick={snap}><Icon name="spark"/> Take photo</button><button className="button secondary" onClick={switchCamera}>Flip camera</button><button className="button secondary" onClick={stop}>Close camera</button></>}
        {mode === 'video' && !recording && <><button className="button primary" onClick={startRecording} disabled={!recorderSupported}><span className="camera-rec-dot-btn"/>Start recording</button><button className="button secondary" onClick={switchCamera}>Flip camera</button><button className="button secondary" onClick={stop}>Close camera</button></>}
        {mode === 'video' && recording && <><button className="button primary recorder-stop" onClick={stopRecording}>Stop recording</button><button className="button secondary" onClick={stop}>Close camera</button></>}
      </div>
    </>}
    {mode === 'photo' && photos.length > 0 && <>
      <div className="camera-bar"><span>{photos.length} photo{photos.length !== 1 ? 's' : ''} · {selected.length} selected</span><div><button className="button secondary compact" onClick={selectAll}>Select all</button><button className="button secondary compact" onClick={deselectAll}>Deselect all</button><button className="button primary compact" onClick={downloadSelected} disabled={selected.length === 0}>Download {selected.length > 0 ? selected.length : ''} selected</button></div></div>
      <div className="camera-grid">{photos.map((p, i) => <div key={p.url} className={`camera-thumb ${p.selected ? 'sel' : ''}`} onClick={() => toggle(i)}><img src={p.url} alt={`Photo ${i + 1}`}/><div className="camera-thumb-bar"><span>{formatBytes(p.size)}</span><a href={p.url} download={p.name} onClick={e => e.stopPropagation()} className="camera-dl">↓</a><button onClick={e => { e.stopPropagation(); remove(i); }} className="camera-del">×</button></div><div className="camera-check">{p.selected ? <Icon name="check" size={14}/> : null}</div></div>)}</div>
    </>}
    {mode === 'video' && videos.length > 0 && <div className="camera-video-list">{videos.map((v, i) => <div key={v.url} className="camera-video-item">
      <video controls src={v.url}/>
      <div className="camera-video-item-bar"><span>{formatBytes(v.size)}</span><a href={v.url} download={v.name} className="camera-dl">Download</a><button onClick={() => removeVideo(i)} className="camera-del">×</button></div>
    </div>)}</div>}
    <p className="tool-footnote">{mode === 'video' ? 'Video is recorded entirely in your browser and never uploaded. Format is WebM.' : 'Photos are taken in your browser and never uploaded. Tap a photo to select or deselect it before downloading.'}</p></>;
}
