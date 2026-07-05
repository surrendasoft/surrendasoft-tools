import { useState } from 'react';
import ScamAiPanel from '../components/ScamAiPanel.jsx';
import ToolGlyph from '../components/ToolGlyph.jsx';
import { analyseEmail } from '../utils/scamAnalysis.js';

export default function ScamCheckerTool() {
  const [sender, setSender] = useState('');
  const [body, setBody] = useState('');
  const [result, setResult] = useState(null);

  const analyse = () => setResult(analyseEmail({ sender, body }));

  const vm = {
    safe: { label: 'Looks safe', icon: 'check', col: '#08785f', bg: '#eaf9f4', bd: '#c6ebdf' },
    suspicious: { label: 'Suspicious', icon: 'warning', col: '#a05c00', bg: '#fff8ec', bd: '#f5d896' },
    scam: { label: 'Likely a scam', icon: 'siren', col: '#b53e3e', bg: '#fff0f0', bd: '#f5b8b8' },
  };

  const aiPrompt = `Sender: ${sender || '(not provided)'}\n\nMessage:\n${body}`;

  return <>
    <div className="scam-form">
      <label className="textarea-label">Sender email address <span>optional</span><input value={sender} onChange={e => setSender(e.target.value)} placeholder="e.g. noreply@amaz0n-support.com" type="text" autoComplete="off"/></label>
      <label className="textarea-label">Email body<textarea value={body} onChange={e => setBody(e.target.value)} rows="10" placeholder="Paste the email content here…"/></label>
    </div>
    <button className="button primary pdf-action" onClick={analyse} disabled={!body.trim()}>Check for scam signals</button>
    {result && <>
      <div className="scam-verdict" style={{ background: vm[result.verdict].bg, borderColor: vm[result.verdict].bd }}>
        <span style={{ color: vm[result.verdict].col }}><ToolGlyph name={vm[result.verdict].icon} size={22}/> {vm[result.verdict].label}</span>
        <p>{result.total === 0 ? 'No common scam patterns detected. Always stay cautious with unexpected emails.' : `${result.total} signal${result.total !== 1 ? 's' : ''} detected. ${result.verdict === 'scam' ? 'Do not click links, reply, or provide personal details.' : 'Proceed with caution and verify independently.'}`}</p>
      </div>
      {(result.flags.length + result.senderFlags.length + result.urlFlags.length) > 0 && <div className="scam-flags">
        {result.senderFlags.map((f, i) => <div key={i} className="scam-flag scam-sender"><span className="scam-tag">Sender</span><span>{f}</span></div>)}
        {result.urlFlags.map((f, i) => <div key={i} className="scam-flag scam-link"><span className="scam-tag">Link</span><span>{f}</span></div>)}
        {result.flags.map(f => <div key={f.id} className="scam-flag scam-body"><span className="scam-tag">{f.label}</span><span>{f.hits.slice(0,3).join(', ')}</span></div>)}
      </div>}
    </>}
    <ScamAiPanel kind="email" promptText={aiPrompt} disabled={!body.trim()} />
    <div className="scam-related">
      <span>Checking something else?</span>
      <a href="#linkscam">Link Scam Checker</a>
      <a href="#qrscam">QR Scam Checker</a>
    </div>
    <p className="tool-footnote">Pattern matching + optional on-device AI — not a substitute for professional security advice. Never click links or provide personal details to emails you are unsure about.</p></>;
}
