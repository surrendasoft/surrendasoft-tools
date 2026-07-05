import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import ToolGlyph from '../components/ToolGlyph.jsx';
import { formatBytes } from '../utils/format.js';

// Kept short on purpose: at ~1080p a webcam recording runs roughly 2.5Mbps,
// so even 2 minutes is already ~35–40MB held in memory as a single Blob.
const CLIP_LENGTHS = [{ value: 15 / 60, label: '15 seconds' }, { value: 0.5, label: '30 seconds' }, { value: 1, label: '1 minute' }, { value: 2, label: '2 minutes' }];
// "ideal" is only a request — the browser/camera picks the closest resolution it
// actually supports, which is why we also show the resolution that was granted.
const RESOLUTIONS = [
  { value: '480', label: '480p (smallest, fastest)', width: 640, height: 480 },
  { value: '720', label: '720p (HD)', width: 1280, height: 720 },
  { value: '1080', label: '1080p (Full HD)', width: 1920, height: 1080 },
  { value: '4k', label: '4K (if your camera supports it)', width: 3840, height: 2160 },
];

export default function CameraTool() {
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const recorderSupported = typeof window !== 'undefined' && 'MediaRecorder' in window;
  const [mode, setMode] = useState('photo'); // 'photo' | 'video'
  const [active, setActive] = useState(false), [connecting, setConnecting] = useState(true), [error, setError] = useState('');
  const [photos, setPhotos] = useState([]), [facingMode, setFacingMode] = useState('user');
  const [includeAudio, setIncludeAudio] = useState(true);
  const [maxMinutes, setMaxMinutes] = useState(1);
  const [resolution, setResolution] = useState('1080');
  const [actualRes, setActualRes] = useState('');
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
  const onLoadedMetadata = () => { if (videoRef.current) setActualRes(`${videoRef.current.videoWidth}×${videoRef.current.videoHeight}`); };

  // Single entry point for (re)opening the camera with a given facing/resolution/audio
  // combo — used on first load, and whenever a setting changes while the camera is open.
  const openStream = async ({ facing = facingMode, resValue = resolution, audio = wantsAudio() } = {}) => {
    setError(''); setConnecting(true); setActualRes('');
    try {
      stopStream();
      const { width, height } = RESOLUTIONS.find(r => r.value === resValue) || RESOLUTIONS[2];
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: width }, height: { ideal: height } }, audio });
      streamRef.current = stream;
      setFacingMode(facing); setResolution(resValue); setActive(true);
    } catch (err) {
      setActive(false);
      setError(err.name === 'NotAllowedError' ? 'Camera permission was denied.' : 'Could not access the camera.');
    } finally { setConnecting(false); }
  };
  // Camera opens automatically on load — permission is requested straight away,
  // and the "Enable camera" button only ever shows up if that fails.
  useEffect(() => { if (supported) openStream(); }, []);

  const stop = () => { if (recording) stopRecording(); stopStream(); setActive(false); };
  const switchCamera = () => { if (recording) return; openStream({ facing: facingMode === 'user' ? 'environment' : 'user' }); };
  const changeMode = value => { if (recording) return; setMode(value); if (active) openStream({ audio: value === 'video' && includeAudio }); };
  const changeResolution = value => { if (active && !recording) openStream({ resValue: value }); else setResolution(value); };
  const changeAudio = checked => { setIncludeAudio(checked); if (active && mode === 'video' && !recording) openStream({ audio: checked }); };

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
    <div className="camera-settings">
      <div className="camera-mode-tabs" role="group" aria-label="Capture mode">
        <button disabled={recording} className={mode === 'photo' ? 'active' : ''} aria-pressed={mode === 'photo'} onClick={() => changeMode('photo')}><ToolGlyph name="camera" size={16}/> Photo</button>
        <button disabled={recording} className={mode === 'video' ? 'active' : ''} aria-pressed={mode === 'video'} onClick={() => changeMode('video')}><ToolGlyph name="video" size={16}/> Video</button>
      </div>
      <div className="camera-video-options">
        <label className="camera-length-label">Resolution<select disabled={recording} value={resolution} onChange={e => changeResolution(e.target.value)}>{RESOLUTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></label>
        {mode === 'video' && <label className="camera-audio-toggle"><input type="checkbox" disabled={recording} checked={includeAudio} onChange={e => changeAudio(e.target.checked)}/> Include audio</label>}
        {mode === 'video' && <label className="camera-length-label">Clip length<select disabled={recording} value={maxMinutes} onChange={e => setMaxMinutes(Number(e.target.value))}>{CLIP_LENGTHS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>}
      </div>
      <p className="camera-res-note">{recording ? "Settings can't be changed while recording." : "This is also what gets downloaded — nothing is resized afterwards. Your camera may not support every option; we'll show what it actually granted."}</p>
      {mode === 'video' && !recorderSupported && <p className="pdf-error">Your browser does not support video recording — you can still use Photo mode.</p>}
    </div>
    {error && <p className="pdf-error">{error}</p>}
    {active ? <>
      <div className="camera-viewfinder">
        <video ref={videoRef} autoPlay playsInline muted className="camera-video" onLoadedMetadata={onLoadedMetadata}/>
        <button className="camera-close-btn" onClick={stop} aria-label="Close camera" title="Close camera"><Icon name="close" size={16}/></button>
        {mode === 'video' && recording && <div className="camera-rec-badge"><span className="camera-rec-dot"/>{clock(seconds)}</div>}
        {actualRes && <div className="camera-res-badge">{actualRes}</div>}
      </div>
      <div className="camera-controls camera-controls-active">
        {mode === 'photo' && <><button className="button primary" onClick={snap}><Icon name="spark"/> Take photo</button><button className="button secondary" onClick={switchCamera}>Flip camera</button></>}
        {mode === 'video' && !recording && <><button className="button primary" onClick={startRecording} disabled={!recorderSupported}><span className="camera-rec-dot-btn"/>Start recording</button><button className="button secondary" onClick={switchCamera}>Flip camera</button></>}
        {mode === 'video' && recording && <button className="button primary recorder-stop" onClick={stopRecording}>Stop recording</button>}
      </div>
    </> : (
      <div className="camera-viewfinder-empty">
        <ToolGlyph name="camera" size={40}/>
        <p>{connecting ? 'Requesting camera access…' : 'Camera is off'}</p>
        {!connecting && <button className="button primary" onClick={() => openStream()}>Enable camera</button>}
      </div>
    )}
    {mode === 'photo' && photos.length > 0 && <>
      <div className="camera-bar"><span>{photos.length} photo{photos.length !== 1 ? 's' : ''} · {selected.length} selected</span><div><button className="button secondary compact" onClick={selectAll}>Select all</button><button className="button secondary compact" onClick={deselectAll}>Deselect all</button><button className="button primary compact" onClick={downloadSelected} disabled={selected.length === 0}>Download {selected.length > 0 ? selected.length : ''} selected</button></div></div>
      <div className="camera-grid">{photos.map((p, i) => <div key={p.url} className={`camera-thumb ${p.selected ? 'sel' : ''}`} onClick={() => toggle(i)}><img src={p.url} alt={`Photo ${i + 1}`}/><div className="camera-thumb-bar"><span>{formatBytes(p.size)}</span><a href={p.url} download={p.name} onClick={e => e.stopPropagation()} className="camera-dl">↓</a><button onClick={e => { e.stopPropagation(); remove(i); }} className="camera-del">×</button></div><div className="camera-check">{p.selected ? <Icon name="check" size={14}/> : null}</div></div>)}</div>
    </>}
    {mode === 'video' && videos.length > 0 && <div className="camera-video-list">{videos.map((v, i) => <div key={v.url} className="camera-video-item">
      <video controls src={v.url}/>
      <div className="camera-video-item-bar"><span>{formatBytes(v.size)}</span><a href={v.url} download={v.name} className="camera-dl">Download</a><button onClick={() => removeVideo(i)} className="camera-del">×</button></div>
    </div>)}</div>}
    <p className="tool-footnote">{mode === 'video' ? 'Video is recorded entirely in your browser and never uploaded. Format is WebM — best viewed or downloaded on desktop or Android; playback can be inconsistent on iOS Safari.' : 'Photos are taken in your browser and never uploaded. Tap a photo to select or deselect it before downloading.'}</p></>;
}
