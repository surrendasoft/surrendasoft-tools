import { useState } from 'react';
import Icon from '../components/Icon.jsx';

export default function OneLineTool() {
  const [text, setText] = useState('First line of text.\nSecond line with more detail.\n\nThird line after a gap.');
  const [converted, setConverted] = useState(false);
  const lineCount = text ? text.split(/\r?\n/).length : 0;
  const convert = () => {
    setText(text.replace(/\r?\n+/g, ' ').replace(/[ \t]+/g, ' ').trim());
    setConverted(true);
  };
  return <><label className="textarea-label">Text with line breaks<textarea value={text} onChange={event => { setText(event.target.value); setConverted(false); }} rows="10" placeholder="Paste multi-line text here…"/></label><div className="one-line-meta"><span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span><span>{text.length} characters</span></div><div className="one-line-actions"><button className="button primary" onClick={convert} disabled={!text || lineCount === 1}>{lineCount === 1 ? 'Already one line' : 'Convert to one line'}</button><button className="button secondary" onClick={() => navigator.clipboard?.writeText(text)} disabled={!text}><Icon name="copy" size={18}/> Copy text</button></div>{converted && <div className="one-line-success"><Icon name="check" size={17}/> Line breaks removed. Your text is ready to copy.</div>}</>;
}
