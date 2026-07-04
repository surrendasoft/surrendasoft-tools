import { useEffect, useState } from 'react';
import ToolGlyph from '../components/ToolGlyph.jsx';

export default function ScamCheckerTool() {
  const [sender, setSender] = useState(''), [body, setBody] = useState(''), [result, setResult] = useState(null);
  const [aiStatus, setAiStatus] = useState('checking'); // 'checking' | 'ready' | 'unavailable'
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const freeProviders = ['gmail.com','yahoo.com','hotmail.com','outlook.com','live.com','aol.com','icloud.com','protonmail.com','mail.com','ymail.com','msn.com'];
  const urlShorteners = ['bit.ly','tinyurl.com','goo.gl','t.co','ow.ly','buff.ly','short.io','rebrand.ly','cutt.ly','rb.gy'];
  const patterns = [
    { id:'urgent',   label:'Urgency / pressure',          re:/\b(urgent|immediately|act now|within 24 hours|limited time|expires today|respond asap|last chance|time sensitive|final notice)\b/gi },
    { id:'prize',    label:'Prize / lottery / windfall',   re:/\b(you.ve? won|you are a winner|lottery|jackpot|prize|claim your|million dollars?|inheritance|next of kin|unclaimed funds?|beneficiary)\b/gi },
    { id:'money',    label:'Money / payment request',      re:/\b(wire transfer|western union|moneygram|bitcoin|crypto|gift card|itunes card|google play card|send money|transfer funds?|pay via)\b/gi },
    { id:'creds',    label:'Credential / info request',    re:/\b(verify your (account|identity|details)|confirm your (password|pin|ssn|bank account|credit card)|log ?in to confirm|suspended|account locked|unusual activity|security alert)\b/gi },
    { id:'impersonate',label:'Impersonation signals',      re:/\b(microsoft|apple|amazon|paypal|netflix|your bank|australian tax|ato|irs|hmrc|federal bureau|fbi|interpol|official notice|government department)\b/gi },
    { id:'secrecy',  label:'Secrecy / confidentiality',    re:/\b(keep (this |it )?confidential|do not (tell|share|discuss)|strictly private|top secret|for your eyes only)\b/gi },
    { id:'threat',   label:'Threat / fear tactic',         re:/\b(legal action|arrest warrant|court order|suspend your account|cancel your (service|subscription)|report you|law enforcement|your account will be (closed|terminated))\b/gi },
    { id:'grammar',  label:'Scam phrasing patterns',       re:/(\bkindly\b|\bdo the needful\b|\bdearest\b|\bbeloved\b|\bGod bless you\b|\bAllah\b.*\btransfer\b|\brespected sir\b|\bdear friend\b.*\bproposal\b)/gi },
  ];
  const analyse = () => {
    const text = `${sender} ${body}`;
    const flags = patterns.map(p => ({ ...p, hits: [...text.matchAll(p.re)].map(m => m[0].toLowerCase()) })).filter(p => p.hits.length > 0);
    const senderFlags = [];
    const s = sender.trim().toLowerCase();
    if (s) {
      const domain = (s.match(/@([\w.-]+)$/) || [])[1] || '';
      const local = s.split('@')[0] || '';
      if (freeProviders.includes(domain) && /\b(bank|ato|tax|gov|amazon|paypal|microsoft|apple|netflix|support|security|noreply|admin|service)\b/.test(s)) senderFlags.push('Free email provider (e.g. Gmail) pretending to be a company or service');
      if (/[a-z]{1,4}[0-9]{5,}|[0-9]{4,}[a-z]{1,4}/.test(local)) senderFlags.push('Username looks auto-generated (random letters and numbers)');
      if (domain && !/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) senderFlags.push('Sender domain looks malformed or unusual');
    }
    const urlFlags = [];
    const urls = [...body.matchAll(/https?:\/\/[^\s<>"']+/gi)].map(m => m[0]);
    urls.forEach(raw => { try { const host = new URL(raw).hostname.replace(/^www\./, ''); if (urlShorteners.includes(host)) urlFlags.push(`Shortened URL: ${raw.slice(0,55)}${raw.length>55?'…':''}`); if (/^\d{1,3}(\.\d{1,3}){3}/.test(host)) urlFlags.push(`IP address used as domain: ${host}`); } catch {} });
    const total = flags.length + senderFlags.length + urlFlags.length;
    const verdict = total === 0 ? 'safe' : total <= 2 ? 'suspicious' : 'scam';
    setResult({ flags, senderFlags, urlFlags, total, verdict });
  };
  const vm = { safe:{ label:'Looks safe', icon:'check', col:'#08785f', bg:'#eaf9f4', bd:'#c6ebdf' }, suspicious:{ label:'Suspicious', icon:'warning', col:'#a05c00', bg:'#fff8ec', bd:'#f5d896' }, scam:{ label:'Likely a scam', icon:'siren', col:'#b53e3e', bg:'#fff0f0', bd:'#f5b8b8' } };

  useEffect(() => {
    const check = async () => {
      try {
        const api = window.LanguageModel ?? window.ai?.languageModel;
        if (!api) { setAiStatus('unavailable'); return; }
        if (window.LanguageModel) {
          const avail = await window.LanguageModel.availability();
          setAiStatus(['available', 'downloadable'].includes(avail) ? 'ready' : 'unavailable');
        } else {
          const caps = await window.ai.languageModel.capabilities();
          setAiStatus(caps.available !== 'no' ? 'ready' : 'unavailable');
        }
      } catch { setAiStatus('unavailable'); }
    };
    check();
  }, []);

  const AI_SYSTEM = 'You are an expert email scam and phishing detector. Analyse the provided email for fraud or social engineering. Reply in this exact format only:\nVERDICT: SCAM or SUSPICIOUS or SAFE\nCONFIDENCE: HIGH or MEDIUM or LOW\nSUMMARY: 1-2 sentence plain English explanation.\nRED FLAGS: comma-separated list of specific red flags found, or None detected';

  const parseAi = raw => {
    const get = key => (raw.match(new RegExp(key + ':\\s*(.+?)(?=\\n[A-Z ]+:|$)', 'si')) || [])[1]?.trim() || '';
    return { verdict: get('VERDICT').toUpperCase(), confidence: get('CONFIDENCE').toUpperCase(), summary: get('SUMMARY'), flags: get('RED FLAGS') };
  };

  const runAiCheck = async () => {
    if (!body.trim()) return;
    setAiLoading(true); setAiResult(null);
    try {
      const api = window.LanguageModel ?? window.ai?.languageModel;
      const session = await api.create({ systemPrompt: AI_SYSTEM });
      const text = `Sender: ${sender || '(not provided)'}\n\nMessage:\n${body.slice(0, 2000)}`;
      const raw = await session.prompt(text);
      session.destroy?.();
      setAiResult(parseAi(raw));
    } catch (err) {
      setAiResult({ error: err.message || 'AI analysis failed. Please try again.' });
    }
    setAiLoading(false);
  };

  const aiVm = { SCAM:{ label:'Likely a scam', col:'#b53e3e', bg:'#fff0f0', bd:'#f5b8b8' }, SUSPICIOUS:{ label:'Suspicious', col:'#a05c00', bg:'#fff8ec', bd:'#f5d896' }, SAFE:{ label:'Looks safe', col:'#08785f', bg:'#eaf9f4', bd:'#c6ebdf' } };
  const isChrome = /Chrome\//.test(navigator.userAgent) && !/Edg\/|OPR\//.test(navigator.userAgent);

  return <>
    <div className="scam-form">
      <label className="textarea-label">Sender email address <span>optional</span><input value={sender} onChange={e => setSender(e.target.value)} placeholder="e.g. noreply@amaz0n-support.com" type="text" autoComplete="off"/></label>
      <label className="textarea-label">Email body<textarea value={body} onChange={e => setBody(e.target.value)} rows="10" placeholder="Paste the email content here…"/></label>
    </div>
    <div className="scam-btn-row">
      <button className="button primary pdf-action" onClick={analyse} disabled={!body.trim()}>Check for scam signals</button>
      {aiStatus === 'ready' && (
        <button className="scam-ai-btn" onClick={runAiCheck} disabled={!body.trim() || aiLoading}>
          {aiLoading ? <><span className="scam-ai-spin" /> Analysing…</> : <>✨ Check with AI</>}
        </button>
      )}
    </div>
    {aiStatus === 'unavailable' && (
      isChrome ? (
        <div className="scam-ai-setup">
          <strong>Enable Chrome's built-in AI to use this feature:</strong>
          <ol>
            <li>Paste <code>chrome://flags/#prompt-api-for-gemini-nano</code> into your address bar and set it to <strong>Enabled</strong></li>
            <li>Relaunch Chrome — Chrome may download Gemini Nano (~1.7 GB) in the background</li>
            <li>Return here and refresh the page</li>
          </ol>
        </div>
      ) : (
        <p className="scam-ai-unavail">AI analysis is only available in Chrome at the moment.</p>
      )
    )}
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
    </>
    }
    {aiResult && !aiResult.error && (() => { const v = aiVm[aiResult.verdict] || aiVm.SUSPICIOUS; return (
      <div className="scam-ai-result" style={{ background: v.bg, borderColor: v.bd }}>
        <div className="scam-ai-header">
          <span className="scam-ai-tag">✨ AI Analysis</span>
          <strong style={{ color: v.col }}>{v.label}</strong>
          {aiResult.confidence && <span className="scam-ai-conf">{aiResult.confidence} confidence</span>}
        </div>
        {aiResult.summary && <p className="scam-ai-summary">{aiResult.summary}</p>}
        {aiResult.flags && !/^none/i.test(aiResult.flags) && (
          <p className="scam-ai-flags"><span className="scam-ai-flabel">Red flags:</span> {aiResult.flags}</p>
        )}
      </div>
    ); })()}
    {aiResult?.error && <div className="scam-ai-error">{aiResult.error}</div>}
    <p className="tool-footnote">Pattern matching + on-device AI — not a substitute for professional security advice. Never click links or provide personal details to emails you are unsure about.</p></>;
}
