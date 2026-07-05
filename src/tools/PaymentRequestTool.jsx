import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import Icon from '../components/Icon.jsx';
import ToolGlyph from '../components/ToolGlyph.jsx';
import { buildPaymentRequest } from '../utils/paymentRequest.js';
import './PaymentRequestTool.css';
import './PaymentRequestBpoint.css';

const initial = { businessName: 'SurrendaSoft', customerName: '', amount: '', currency: 'AUD', reference: '', description: '', dueDate: '', method: 'link', paymentUrl: '', accountName: '', bsb: '', accountNumber: '', bankReference: '', bpointShop: '', bpointBillerCode: '', bpointRef1: '', bpointRef2: '', bpointRef3: '', bpointAmount: '', contactEmail: '', contactPhone: '', notes: '' };

export default function PaymentRequestTool() {
  const [form, setForm] = useState(initial), [result, setResult] = useState(null), [error, setError] = useState(''), [copied, setCopied] = useState('');
  const canvasRef = useRef(null);
  const set = (name, value) => { setForm(current => ({ ...current, [name]: value })); setResult(null); setError(''); };
  const needsLink = form.method === 'link' || form.method === 'both', needsBank = form.method === 'bank' || form.method === 'both', isBpoint = form.method === 'bpoint';
  useEffect(() => {
    if (!result?.qrContent || result.qrContent.length > 1800 || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, result.qrContent, { width: 280, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#10183e', light: '#ffffff' } });
  }, [result]);
  const generate = () => { try { setResult(buildPaymentRequest(form)); setError(''); } catch (requestError) { setResult(null); setError(requestError.message); } };
  const copy = async (value, key) => { await navigator.clipboard.writeText(value); setCopied(key); window.setTimeout(() => setCopied(''), 1400); };
  const clear = () => { setForm(initial); setResult(null); setError(''); };
  const downloadQr = () => { const link = document.createElement('a'); link.download = 'payment-request-qr.png'; link.href = canvasRef.current.toDataURL('image/png'); link.click(); };

  return <div className="prg-root">
    <div className="prg-safety"><ToolGlyph name="shieldAlert" size={22}/><div><strong>Message generator only</strong><span>This tool never processes payments or asks for card details.</span></div></div>
    <section className="prg-form">
      <div className="prg-section"><h3>Request details</h3><div className="prg-grid"><label>Business name<input value={form.businessName} onChange={event => set('businessName', event.target.value)}/></label><label>Customer name<input value={form.customerName} onChange={event => set('customerName', event.target.value)} placeholder="John"/></label>{!isBpoint && <label>Amount<div className="prg-money"><select aria-label="Currency" value={form.currency} onChange={event => set('currency', event.target.value)}>{['AUD','NZD','USD','GBP','EUR'].map(currency => <option key={currency}>{currency}</option>)}</select><input aria-label="Payment amount" type="number" min="0" step="0.01" value={form.amount} onChange={event => set('amount', event.target.value)} placeholder="120.00"/></div></label>}<label>Reference / invoice number <span>Recommended</span><input value={form.reference} onChange={event => set('reference', event.target.value)} placeholder="INV-1042"/></label><label className="wide">Description<input value={form.description} onChange={event => set('description', event.target.value)} placeholder="Website support"/></label><label>Due date<input type="date" value={form.dueDate} onChange={event => set('dueDate', event.target.value)}/></label></div></div>
      <div className="prg-section"><h3>Payment method</h3><div className="prg-methods" role="group" aria-label="Payment method">{[['link','link','Payment link'],['bank','business','Bank transfer'],['both','checkSquare','Both'],['bpoint','dollar','BPOINT']].map(([value, icon, label]) => <button key={value} className={form.method === value ? 'active' : ''} aria-pressed={form.method === value} onClick={() => set('method', value)}><ToolGlyph name={icon} size={18}/>{label}</button>)}</div>
        {needsLink && <label className="prg-full-label">Secure payment URL<input type="url" value={form.paymentUrl} onChange={event => set('paymentUrl', event.target.value)} placeholder="https://pay.example.com/invoice/1042"/>{form.paymentUrl && !/^https:\/\//i.test(form.paymentUrl) && <small className="prg-inline-warning">Use an https:// payment link.</small>}</label>}
        {needsBank && <div className="prg-grid prg-bank"><label>Account name<input value={form.accountName} onChange={event => set('accountName', event.target.value)}/></label><label>BSB<input value={form.bsb} onChange={event => set('bsb', event.target.value)} inputMode="numeric" placeholder="062-000"/></label><label>Account number<input value={form.accountNumber} onChange={event => set('accountNumber', event.target.value)} inputMode="numeric"/></label><label>Bank reference<input value={form.bankReference} onChange={event => set('bankReference', event.target.value)} placeholder={form.reference || 'Customer name'}/></label></div>}
        {isBpoint && <div className="prg-bpoint"><div className="prg-bpoint-head"><ToolGlyph name="link" size={18}/><div><strong>BPOINT payment link</strong><span>Only the shop short name is required. Add optional values to pre-fill the BPOINT page.</span></div></div><div className="prg-grid"><label>Shop short name <b>Required</b><input value={form.bpointShop} onChange={event => set('bpointShop', event.target.value)} placeholder="yourshop"/></label><label>Biller Code <span>Optional</span><input value={form.bpointBillerCode} onChange={event => set('bpointBillerCode', event.target.value)}/></label><label>Ref1 <span>Optional</span><input value={form.bpointRef1} onChange={event => set('bpointRef1', event.target.value)}/></label><label>Ref2 <span>Optional</span><input value={form.bpointRef2} onChange={event => set('bpointRef2', event.target.value)}/></label><label>Ref3 <span>Optional</span><input value={form.bpointRef3} onChange={event => set('bpointRef3', event.target.value)}/></label><label>BPOINT amount (AUD) <span>Optional</span><input aria-label="BPOINT amount" type="number" min="0" step="0.01" value={form.bpointAmount} onChange={event => set('bpointAmount', event.target.value)} placeholder="10.00"/></label></div><p className="prg-bpoint-warning"><ToolGlyph name="warning" size={16}/> Fields included in the URL may be locked or pre-filled on the BPOINT payment page.</p></div>}
      </div>
      <details className="prg-optional"><summary>Optional contact details and notes</summary><div className="prg-grid"><label>Contact email<input type="email" value={form.contactEmail} onChange={event => set('contactEmail', event.target.value)}/></label><label>Contact phone<input type="tel" value={form.contactPhone} onChange={event => set('contactPhone', event.target.value)}/></label><label className="wide">Notes<textarea rows="3" value={form.notes} onChange={event => set('notes', event.target.value)} placeholder="Any additional payment instructions"/></label></div></details>
      {error && <p className="prg-error" role="alert">{error}</p>}
      <div className="prg-form-actions"><button className="button primary" onClick={generate}><ToolGlyph name="sparkles" size={17}/> Generate request</button><button className="button secondary" onClick={clear}>Clear form</button></div>
    </section>
    {result && <section className="prg-output" aria-label="Generated payment request">
      {(result.warning || result.referenceWarning || result.providerWarning) && <div className="prg-warnings">{result.providerWarning && <p><ToolGlyph name="warning" size={16}/>{result.providerWarning}</p>}{result.warning && <p><ToolGlyph name="warning" size={16}/>{result.warning}</p>}{result.referenceWarning && <p><ToolGlyph name="warning" size={16}/>{result.referenceWarning}</p>}</div>}
      <div className="prg-messages">{result.provider === 'bpoint' && <Message title="BPOINT payment URL" value={result.paymentUrl} action="Copy BPOINT URL" copied={copied === 'bpoint'} onCopy={() => copy(result.paymentUrl, 'bpoint')}/>}<Message title="SMS-style message" value={result.sms} action="Copy SMS message" copied={copied === 'sms'} onCopy={() => copy(result.sms, 'sms')}/><Message title="Email-style message" value={result.email} action="Copy email message" copied={copied === 'email'} onCopy={() => copy(result.email, 'email')}/><Message title="Payment details" value={result.details} action="Copy payment details" copied={copied === 'details'} onCopy={() => copy(result.details, 'details')}/></div>
      <div className="prg-qr"><strong>Payment request QR</strong><span>{result.paymentUrl ? 'Opens the secure payment link.' : 'Contains the bank payment instructions.'}</span>{result.qrContent.length <= 1800 ? <><canvas ref={canvasRef}/><button className="button secondary compact" onClick={downloadQr}><ToolGlyph name="download" size={16}/> Download QR</button></> : <p className="prg-error">The payment instructions are too long for a reliable QR code. Shorten the notes or use a payment link.</p>}</div>
    </section>}
    <p className="prg-note"><Icon name="shield" size={18}/><span>This tool only creates a payment request message. It does not process payments, collect card details, or verify payment. Use a trusted payment provider.</span></p>
  </div>;
}

function Message({ title, value, action, copied, onCopy }) {
  return <article className="prg-message"><header><strong>{title}</strong><button onClick={onCopy}><Icon name={copied ? 'check' : 'copy'} size={16}/>{copied ? 'Copied' : action}</button></header><pre>{value}</pre></article>;
}
