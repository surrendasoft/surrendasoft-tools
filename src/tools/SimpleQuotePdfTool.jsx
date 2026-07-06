import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import ToolGlyph from '../components/ToolGlyph.jsx';
import { buildQuoteSummaryMessage, calculateInvoiceTotals, createQuotePdf, invoiceMoney, quoteDateWarning, validateQuote } from '../utils/simpleQuote.js';
import './SimpleInvoicePdfTool.css';

const isoDate = date => date.toISOString().slice(0, 10);
const makeInitial = () => {
  const now = new Date(), valid = new Date(now); valid.setDate(valid.getDate() + 30);
  return {
    businessName: '', abn: '', businessAddress: '', businessEmail: '', businessPhone: '', website: '',
    clientName: '', clientEmail: '', clientAddress: '',
    quoteNumber: '', quoteDate: isoDate(now), validUntil: isoDate(valid), currency: 'AUD', gstMode: 'added',
    depositAmount: '', validityNote: '', acceptanceNote: 'To accept this quote, reply in writing or sign and return a copy.',
    notes: '', terms: 'Prices are in AUD unless stated otherwise. Work begins after deposit or written acceptance.', footerText: 'Thank you for considering our quote.',
    items: [{ id: 1, description: '', quantity: '1', unitPrice: '' }],
  };
};

export default function SimpleQuotePdfTool() {
  const [data, setData] = useState(makeInitial), [preview, setPreview] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [pdfResult, setPdfResult] = useState(null), [copied, setCopied] = useState(false);
  const totals = useMemo(() => calculateInvoiceTotals(data.items, data.gstMode), [data.items, data.gstMode]);
  const dateWarning = quoteDateWarning(data.quoteDate, data.validUntil);
  useEffect(() => () => { if (pdfResult?.url) URL.revokeObjectURL(pdfResult.url); }, [pdfResult]);
  const set = (name, value) => { setData(current => ({ ...current, [name]: value })); setPreview(null); setPdfResult(null); setError(''); };
  const updateItem = (id, name, value) => { setData(current => ({ ...current, items: current.items.map(item => item.id === id ? { ...item, [name]: value } : item) })); setPreview(null); setPdfResult(null); setError(''); };
  const addItem = () => setData(current => ({ ...current, items: [...current.items, { id: Math.max(0, ...current.items.map(item => item.id)) + 1, description: '', quantity: '1', unitPrice: '' }] }));
  const removeItem = id => setData(current => ({ ...current, items: current.items.filter(item => item.id !== id) }));
  const previewQuote = () => { const validation = validateQuote(data); if (validation) { setError(validation); return; } setPreview(structuredClone(data)); setError(''); };
  const makePdf = async () => {
    const validation = validateQuote(data); if (validation) { setError(validation); return; }
    setBusy(true); setError('');
    try {
      const bytes = await createQuotePdf(data);
      setPdfResult({ url: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), size: bytes.length, name: `${(data.quoteNumber || 'quote').replace(/[^a-z0-9_-]+/gi, '-')}.pdf` });
      if (!preview) setPreview(structuredClone(data));
    } catch (pdfError) { setError(pdfError.message || 'The quote PDF could not be created.'); }
    setBusy(false);
  };
  const copySummary = async () => { await navigator.clipboard.writeText(buildQuoteSummaryMessage(data, totals)); setCopied(true); window.setTimeout(() => setCopied(false), 1400); };
  const clear = () => { setData(makeInitial()); setPreview(null); setPdfResult(null); setError(''); };

  return <div className="sip-root">
    <div className="sip-local"><ToolGlyph name="fileText" size={22}/><div><strong>Quote or estimate, made locally</strong><span>No account, cloud storage, or backend — send professional quotes from your browser.</span></div></div>
    <section className="sip-editor">
      <FormSection title="Business details" icon="business"><div className="sip-grid"><Field label="Business name" value={data.businessName} onChange={value => set('businessName', value)}/><Field label="ABN" value={data.abn} onChange={value => set('abn', value)}/><Field label="Address" value={data.businessAddress} onChange={value => set('businessAddress', value)} wide/><Field label="Email" type="email" value={data.businessEmail} onChange={value => set('businessEmail', value)}/><Field label="Phone" type="tel" value={data.businessPhone} onChange={value => set('businessPhone', value)}/><Field label="Website" type="url" value={data.website} onChange={value => set('website', value)} wide/></div></FormSection>
      <FormSection title="Client details" icon="userRound"><div className="sip-grid"><Field label="Client name" hint="Recommended" value={data.clientName} onChange={value => set('clientName', value)}/><Field label="Client email" type="email" value={data.clientEmail} onChange={value => set('clientEmail', value)}/><Field label="Client address" value={data.clientAddress} onChange={value => set('clientAddress', value)} wide/></div></FormSection>
      <FormSection title="Quote details" icon="fileText"><div className="sip-grid sip-grid-three"><Field label="Quote number" hint="Required" value={data.quoteNumber} onChange={value => set('quoteNumber', value)}/><Field label="Quote date" type="date" value={data.quoteDate} onChange={value => set('quoteDate', value)}/><Field label="Valid until" type="date" value={data.validUntil} onChange={value => set('validUntil', value)}/><label>Currency<select value={data.currency} onChange={event => set('currency', event.target.value)}>{['AUD','NZD','USD','GBP','EUR'].map(currency => <option key={currency}>{currency}</option>)}</select></label><label className="sip-gst-select">GST mode<select aria-label="GST mode" value={data.gstMode} onChange={event => set('gstMode', event.target.value)}><option value="none">No GST</option><option value="included">GST included</option><option value="added">GST added on top</option></select></label><Field label="Deposit amount" type="number" min="0" step="0.01" value={data.depositAmount} onChange={value => set('depositAmount', value)} placeholder="Optional"/></div>{dateWarning && <p className="sip-warning"><ToolGlyph name="warning" size={16}/>{dateWarning}</p>}</FormSection>
      <FormSection title="Line items" icon="listChecks" action={<button className="button secondary compact" onClick={addItem}><ToolGlyph name="plus" size={15}/> Add line item</button>}><div className="sip-items"><div className="sip-item-head"><span>Description</span><span>Quantity</span><span>Unit price</span><span>Amount</span><span/></div>{data.items.map((item, index) => <div className="sip-item" key={item.id}><label><span className="sr-only">Item {index + 1} description</span><input aria-label={`Item ${index + 1} description`} value={item.description} onChange={event => updateItem(item.id, 'description', event.target.value)} placeholder="Labour and materials"/></label><label><span className="sr-only">Item {index + 1} quantity</span><input aria-label={`Item ${index + 1} quantity`} type="number" min="0.01" step="0.01" value={item.quantity} onChange={event => updateItem(item.id, 'quantity', event.target.value)}/></label><label><span className="sr-only">Item {index + 1} unit price</span><input aria-label={`Item ${index + 1} unit price`} type="number" min="0" step="0.01" value={item.unitPrice} onChange={event => updateItem(item.id, 'unitPrice', event.target.value)} placeholder="0.00"/></label><strong>{invoiceMoney((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), data.currency)}</strong><button aria-label={`Remove item ${index + 1}`} onClick={() => removeItem(item.id)} disabled={data.items.length === 1}><ToolGlyph name="trash" size={16}/></button></div>)}</div><Totals totals={totals} currency={data.currency} included={data.gstMode === 'included'}/></FormSection>
      <FormSection title="Validity and terms" icon="text"><div className="sip-grid"><Field label="Validity note" value={data.validityNote} onChange={value => set('validityNote', value)} wide placeholder="This quote is valid for 30 days."/><Field label="Acceptance note" value={data.acceptanceNote} onChange={value => set('acceptanceNote', value)} wide/><label>Notes<textarea rows="3" value={data.notes} onChange={event => set('notes', event.target.value)}/></label><label>Terms<textarea rows="3" value={data.terms} onChange={event => set('terms', event.target.value)}/></label><Field label="Footer text" value={data.footerText} onChange={value => set('footerText', value)} wide/></div></FormSection>
      {error && <p className="sip-error" role="alert">{error}</p>}
      <div className="sip-actions"><button className="button primary" onClick={previewQuote}><ToolGlyph name="fileSearch" size={17}/> Preview quote</button><button className="button secondary" onClick={makePdf} disabled={busy}><ToolGlyph name="download" size={17}/>{busy ? 'Creating PDF…' : 'Create PDF'}</button><button className="button secondary" onClick={copySummary}><Icon name={copied ? 'check' : 'copy'} size={17}/>{copied ? 'Copied quote summary' : 'Copy quote summary'}</button><button className="button secondary" onClick={clear}>Clear form</button></div>
      {pdfResult && <div className="sip-pdf-ready"><div><strong>Quote PDF ready</strong><span>{Math.max(1, Math.round(pdfResult.size / 1024))} KB · generated in your browser</span></div><a className="button primary compact" href={pdfResult.url} download={pdfResult.name}>Download PDF</a></div>}
    </section>
    {preview && <QuotePreview data={preview}/>}
    <div className="sip-disclaimer"><Icon name="shield" size={18}/><p><strong>Private and intentionally simple.</strong> Quote details stay in your browser. This document does not replace accounting, tax, or legal advice.</p></div>
  </div>;
}

function FormSection({ title, icon, action, children }) { return <section className="sip-section"><header><div><ToolGlyph name={icon} size={18}/><h3>{title}</h3></div>{action}</header>{children}</section>; }
function Field({ label, hint, value, onChange, type = 'text', wide = false, placeholder = '', min, step }) { return <label className={wide ? 'wide' : ''}>{label}{hint && <> <span>{hint}</span></>}<input type={type} value={value} min={min} step={step} onChange={event => onChange(event.target.value)} placeholder={placeholder}/></label>; }
function Totals({ totals, currency, included }) { return <div className="sip-totals"><div><span>{included ? 'Subtotal ex GST' : 'Subtotal'}</span><strong>{invoiceMoney(totals.subtotal, currency)}</strong></div><div><span>GST</span><strong>{invoiceMoney(totals.gst, currency)}</strong></div><div className="total"><span>Total</span><strong>{invoiceMoney(totals.total, currency)}</strong></div></div>; }
function QuotePreview({ data }) {
  const totals = calculateInvoiceTotals(data.items, data.gstMode);
  return <section className="sip-preview" aria-label="Quote preview"><header><div><strong>{data.businessName || 'Business name'}</strong><span>{[data.abn && `ABN ${data.abn}`, data.businessEmail, data.businessPhone].filter(Boolean).join(' · ')}</span></div><h2>QUOTE</h2></header><div className="sip-preview-meta"><div><span>Prepared for</span><strong>{data.clientName || 'Client name'}</strong><p>{data.clientAddress}</p></div><dl><dt>Quote</dt><dd>{data.quoteNumber || '-'}</dd><dt>Date</dt><dd>{data.quoteDate}</dd><dt>Valid until</dt><dd>{data.validUntil}</dd></dl></div><div className="sip-preview-table"><div className="head"><span>Description</span><span>Qty</span><span>Price</span><span>Amount</span></div>{data.items.map(item => <div key={item.id}><strong>{item.description}</strong><span>{item.quantity}</span><span>{invoiceMoney(item.unitPrice, data.currency)}</span><span>{invoiceMoney(Number(item.quantity) * Number(item.unitPrice), data.currency)}</span></div>)}</div><Totals totals={totals} currency={data.currency} included={data.gstMode === 'included'}/>{Number(data.depositAmount) > 0 && <p><strong>Deposit requested:</strong> {invoiceMoney(data.depositAmount, data.currency)}</p>}{data.notes && <p><strong>Notes:</strong> {data.notes}</p>}{data.footerText && <footer>{data.footerText}</footer>}</section>;
}
