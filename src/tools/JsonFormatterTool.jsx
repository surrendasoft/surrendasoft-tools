import { useState } from 'react';
import Icon from '../components/Icon.jsx';

export default function JsonFormatterTool() {
  const [json, setJson] = useState('{"business":"SurrendaSoft","tools":["Emoji Copy","GST Calculator"],"localFirst":true}');
  const [message, setMessage] = useState({ type: 'idle', text: 'Ready to validate' });
  const parse = action => {
    try {
      const value = JSON.parse(json);
      if (action === 'format') setJson(JSON.stringify(value, null, 2));
      if (action === 'minify') setJson(JSON.stringify(value));
      setMessage({ type: 'success', text: 'Valid JSON' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message.replace(/^JSON\.parse:\s*/i, '') });
    }
  };
  const lines = json ? json.split('\n').length : 0;
  return <><div className="json-actions"><button className="button primary compact" onClick={() => parse('format')}><Icon name="spark" size={17}/> Format JSON</button><button onClick={() => parse('minify')}>Minify</button><button onClick={() => parse('validate')}>Validate</button><button onClick={() => navigator.clipboard?.writeText(json)}><Icon name="copy" size={16}/> Copy</button></div><label className="json-editor"><span>JSON input</span><textarea value={json} onChange={e => { setJson(e.target.value); setMessage({ type: 'idle', text: 'Ready to validate' }); }} rows="18" spellCheck="false" placeholder="Paste JSON here…"/></label><div className={`json-status ${message.type}`}><span>{message.type === 'success' ? 'Valid: ' : message.type === 'error' ? 'Error: ' : ''}{message.text}</span><small>{lines} lines · {json.length} characters</small></div></>;
}
