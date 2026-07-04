import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import ToolGlyph from '../components/ToolGlyph.jsx';

export default function SuggestTool() {
  const [form, setForm] = useState({ name: '', email: '', toolName: '', details: '' });
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const upd = (f, v) => setForm(p => ({...p, [f]: v}));
  const submit = e => {
    e.preventDefault();
    if (!form.toolName.trim()) { setErr('Please name the tool you need.'); return; }
    setErr('');
    const subject = encodeURIComponent(`Tool suggestion: ${form.toolName.trim()}`);
    const body = encodeURIComponent([
      form.name ? `From: ${form.name}${form.email ? ` <${form.email}>` : ''}` : '',
      '',
      `Tool requested: ${form.toolName.trim()}`,
      '',
      form.details.trim() || '(no details provided)',
    ].join('\n').trimStart());
    window.open(`mailto:hello@surrendasoft.com?subject=${subject}&body=${body}`);
    setSent(true);
  };
  if (sent) return <div className="suggest-thanks">
    <span><ToolGlyph name="lightbulb" size={38}/></span>
    <h3>Thanks for the suggestion!</h3>
    <p>Your email client should have opened. If it didn't, email us directly at <a href="mailto:hello@surrendasoft.com">hello@surrendasoft.com</a>.</p>
    <button className="button secondary" onClick={() => { setSent(false); setForm({ name: '', email: '', toolName: '', details: '' }); }}>Send another</button>
  </div>;
  return <form className="suggest-form" onSubmit={submit} noValidate>
    <p className="suggest-intro">Got an idea for a tool? Every suggestion is read — your feedback shapes what gets built next.</p>
    <div className="field-row">
      <label>Your name <span>optional</span><input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. Alex"/></label>
      <label>Your email <span>optional</span><input type="email" value={form.email} onChange={e => upd('email', e.target.value)} placeholder="so we can follow up"/></label>
    </div>
    <label style={{display:'flex',flexDirection:'column',gap:6}}>What tool do you need? <span style={{fontWeight:500,opacity:.6,fontSize:12}}>required</span><input value={form.toolName} onChange={e => upd('toolName', e.target.value)} placeholder="e.g. Mortgage calculator, colour picker, password generator…"/></label>
    <label style={{display:'flex',flexDirection:'column',gap:6}}>Tell us more <span style={{fontWeight:500,opacity:.6,fontSize:12}}>optional</span><textarea rows="4" value={form.details} onChange={e => upd('details', e.target.value)} placeholder="What would you use it for? What inputs and outputs matter most?"/></label>
    {err && <p className="pdf-error">{err}</p>}
    <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
      <button className="button primary" type="submit">Send suggestion <Icon name="arrow"/></button>
      <p className="suggest-note">Opens your email client with your message pre-filled.</p>
    </div>
  </form>;
}
