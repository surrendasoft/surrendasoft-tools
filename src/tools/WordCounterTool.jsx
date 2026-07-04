import { useMemo, useState } from 'react';
import Stat from '../components/Stat.jsx';

export default function WordCounterTool() {
  const [text, setText] = useState('Paste or type your text here. Your counts update instantly as you write.');
  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const sentences = trimmed ? (trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []).length : 0;
    const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter(Boolean).length : 0;
    return { words, characters: text.length, noSpaces: text.replace(/\s/g, '').length, sentences, paragraphs, minutes: words ? Math.max(1, Math.ceil(words / 225)) : 0 };
  }, [text]);
  return <><div className="counter-grid"><Stat value={stats.words} label="Words"/><Stat value={stats.characters} label="Characters"/><Stat value={stats.sentences} label="Sentences"/><Stat value={stats.paragraphs} label="Paragraphs"/></div><label className="textarea-label">Your text<textarea value={text} onChange={e => setText(e.target.value)} rows="11" placeholder="Start typing or paste text…"/></label><div className="reading-strip"><span>Estimated reading time</span><strong>{stats.minutes} min</strong><span>{stats.noSpaces} characters without spaces</span></div></>;
}
