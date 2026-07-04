import { useState } from 'react';
import Icon from '../components/Icon.jsx';

export default function CleanerTool() {
  const [text,setText]=useState('Paste   messy text here...\n\n\nExtra spaces and line breaks will be cleaned up.'); const [mode,setMode]=useState('spaces');
  const clean = () => setText(mode==='lines' ? text.replace(/\n{2,}/g,'\n').trim() : text.replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim());
  return <><div className="segmented"><button className={mode==='spaces'?'active':''} onClick={()=>setMode('spaces')}>Clean spaces</button><button className={mode==='lines'?'active':''} onClick={()=>setMode('lines')}>Clean line breaks</button></div><label className="textarea-label">Your text<textarea value={text} onChange={e=>setText(e.target.value)} rows="10"/></label><div className="workspace-actions"><span>{text.trim()?text.trim().split(/\s+/).length:0} words · {text.length} characters</span><button className="button primary" onClick={clean}><Icon name="spark"/> Clean text</button></div></>;
}
