import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';

export default function TextToSpeechTool() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [text, setText] = useState('Hello! This text will be read aloud by your browser voice.');
  const [voices, setVoices] = useState([]), [voiceName, setVoiceName] = useState('');
  const [rate, setRate] = useState(1), [pitch, setPitch] = useState(1), [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    if (!supported) return;
    const load = () => { const list = window.speechSynthesis.getVoices(); setVoices(list); setVoiceName(current => current || list.find(voice => voice.default)?.name || list[0]?.name || ''); };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => { window.speechSynthesis.removeEventListener('voiceschanged', load); window.speechSynthesis.cancel(); };
  }, [supported]);
  const speak = () => {
    if (!text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = voices.find(item => item.name === voiceName);
    if (voice) utterance.voice = voice;
    utterance.rate = rate; utterance.pitch = pitch;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true); window.speechSynthesis.speak(utterance);
  };
  const stop = () => { window.speechSynthesis.cancel(); setSpeaking(false); };
  if (!supported) return <p className="pdf-error">Your browser does not support speech synthesis.</p>;
  return <><label className="textarea-label">Text to read<textarea value={text} onChange={event => setText(event.target.value)} rows="6" placeholder="Type or paste text to read aloud…"/></label>
    <div className="tts-controls"><label>Voice<select value={voiceName} onChange={event => setVoiceName(event.target.value)}>{voices.length ? voices.map(voice => <option key={voice.name} value={voice.name}>{voice.name} ({voice.lang})</option>) : <option>Loading voices…</option>}</select></label><label>Speed <strong>{rate.toFixed(1)}×</strong><input type="range" min="0.5" max="2" step="0.1" value={rate} onChange={event => setRate(Number(event.target.value))}/></label><label>Pitch <strong>{pitch.toFixed(1)}</strong><input type="range" min="0" max="2" step="0.1" value={pitch} onChange={event => setPitch(Number(event.target.value))}/></label></div>
    <div className="tts-actions"><button className="button primary" onClick={speak} disabled={!text.trim()}><Icon name="spark"/> {speaking ? 'Restart' : 'Read aloud'}</button><button className="button secondary" onClick={stop} disabled={!speaking}>Stop</button></div>
    <p className="tool-footnote">Uses the voices installed on your device. Availability and quality vary by browser and operating system.</p></>;
}
