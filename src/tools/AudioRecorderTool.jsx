import { useEffect, useRef, useState } from 'react';

export default function AudioRecorderTool() {
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof window !== 'undefined' && 'MediaRecorder' in window;
  const [recording, setRecording] = useState(false), [audioUrl, setAudioUrl] = useState(''), [seconds, setSeconds] = useState(0), [error, setError] = useState(''), [maxMinutes, setMaxMinutes] = useState(5);
  const recorderRef = useRef(null), chunksRef = useRef([]), streamRef = useRef(null), timerRef = useRef(null);
  const cleanup = () => { clearInterval(timerRef.current); streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; };
  useEffect(() => () => { cleanup(); if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  const stop = () => { if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop(); clearInterval(timerRef.current); setRecording(false); };
  const start = async () => {
    setError('');
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(''); }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => { const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }); setAudioUrl(URL.createObjectURL(blob)); cleanup(); };
      recorderRef.current = recorder; recorder.start();
      setRecording(true); setSeconds(0);
      const cap = maxMinutes * 60;
      timerRef.current = setInterval(() => setSeconds(prev => { const next = prev + 1; if (next >= cap) stop(); return next; }), 1000);
    } catch (err) { setError(err.name === 'NotAllowedError' ? 'Microphone permission was denied.' : 'Could not access the microphone.'); }
  };
  const clock = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  if (!supported) return <p className="pdf-error">Your browser does not support audio recording.</p>;
  return <><div className="recorder-stage"><div className={`recorder-dot ${recording ? 'live' : ''}`}/><strong>{clock(seconds)}</strong><span>{recording ? `Recording… auto-stops at ${maxMinutes}:00` : 'Ready to record'}</span></div>
    <div className="recorder-options"><label>Max length<select value={maxMinutes} onChange={event => setMaxMinutes(Number(event.target.value))} disabled={recording}><option value="1">1 minute</option><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="30">30 minutes</option></select></label>{!recording ? <button className="button primary" onClick={start}>Start recording</button> : <button className="button primary recorder-stop" onClick={stop}>Stop recording</button>}</div>
    {error && <p className="pdf-error">{error}</p>}
    {audioUrl && !recording && <div className="recorder-result"><audio controls src={audioUrl}/><a className="button primary compact" href={audioUrl} download="recording.webm">Download audio</a></div>}
    <p className="tool-footnote">Recording happens entirely in your browser and is never uploaded. Format is WebM, playable in most modern apps.</p></>;
}
