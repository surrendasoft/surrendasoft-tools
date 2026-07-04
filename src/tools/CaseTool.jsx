import { useState } from 'react';
import Icon from '../components/Icon.jsx';

export default function CaseTool() {
  const [text, setText] = useState('Turn this rough HEADING into something useful.');
  const convert = mode => {
    if (mode === 'upper') setText(text.toUpperCase());
    if (mode === 'lower') setText(text.toLowerCase());
    if (mode === 'title') setText(text.toLowerCase().replace(/\b\w/g, char => char.toUpperCase()));
    if (mode === 'sentence') setText(text.toLowerCase().replace(/(^|[.!?]\s+)\w/g, char => char.toUpperCase()));
  };
  const copy = () => navigator.clipboard?.writeText(text);
  return <><label className="textarea-label">Your text<textarea value={text} onChange={e => setText(e.target.value)} rows="9" placeholder="Paste text to convert…"/></label><div className="case-actions"><button onClick={() => convert('upper')}>UPPERCASE</button><button onClick={() => convert('lower')}>lowercase</button><button onClick={() => convert('title')}>Title Case</button><button onClick={() => convert('sentence')}>Sentence case</button></div><div className="workspace-actions"><span>{text.length} characters</span><button className="button primary compact" onClick={copy}><Icon name="copy" size={18}/> Copy result</button></div></>;
}
