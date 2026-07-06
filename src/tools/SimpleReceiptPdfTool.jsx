import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import ToolGlyph from '../components/ToolGlyph.jsx';
import { buildReceiptMessage, createReceiptPdf, receiptPaymentMethods, validateReceipt } from '../utils/simpleReceipt.js';
import { invoiceMoney } from '../utils/simpleInvoice.js';
import './SimpleInvoicePdfTool.css';

const isoDate = date => date.toISOString().slice(0, 10);
const makeInitial = () => ({
  businessName: '', abn: '', businessAddress: '', businessEmail: '', businessPhone: '',
  receiptNumber: '', receiptDate: isoDate(new Date()), paidBy: '', paidByEmail: '',
  amountPaid: '', currency: 'AUD', paymentMethod: 'Bank transfer', invoiceReference: '', description: '', notes: '', footerText: 'Thank you for your payment.',
});

export default function SimpleReceiptPdfTool() {
  const [data, setData] = useState(makeInitial), [preview, setPreview] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [pdfResult, setPdfResult] = useState(null), [copied, setCopied] = useState(false);
  useEffect(() => () => { if (pdfResult?.url) URL.revokeObjectURL(pdfResult.url); }, [pdfResult]);
  const set = (name, value) => { setData(current => ({ ...current, [name]: value })); setPreview(null); setPdfResult(null); setError(''); };
  const previewReceipt = () => { const validation = validateReceipt(data); if (validation) { setError(validation); return; } setPreview(structuredClone(data)); setError(''); };
  const makePdf = async () => {
    const validation = validateReceipt(data); if (validation) { setError(validation); return; }
    setBusy(true); setError('');
    try {
      const bytes = await createReceiptPdf(data);
      setPdfResult({ url: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), size: bytes.length, name: `${(data.receiptNumber || 'receipt').replace(/[^a-z0-9_-]+/gi, '-')}.pdf` });
      if (!preview) setPreview(structuredClone(data));
    } catch (pdfError) { setError(pdfError.message || 'The receipt PDF could not be created.'); }
    setBusy(false);
  };
  const copySummary = async () => { await navigator.clipboard.writeText(buildReceiptMessage(data)); setCopied(true); window.setTimeout(() => setCopied(false), 1400); };
  const clear = () => { setData(makeInitial()); setPreview(null); setPdfResult(null); setError(''); };

  return <div className="sip-root">
    <div className="sip-local"><ToolGlyph name="fileText" size={22}/><div><strong>Payment receipt, made locally</strong><span>Issue a simple paid receipt PDF — no accounting software or backend required.</span></div></div>
    <section className="sip-editor">
      <FormSection title="Business details" icon="business"><div className="sip-grid"><Field label="Business name" hint="Required" value={data.businessName} onChange={value => set('businessName', value)}/><Field label="ABN" value={data.abn} onChange={value => set('abn', value)}/><Field label="Address" value={data.businessAddress} onChange={value => set('businessAddress', value)} wide/><Field label="Email" type="email" value={data.businessEmail} onChange={value => set('businessEmail', value)}/><Field label="Phone" type="tel" value={data.businessPhone} onChange={value => set('businessPhone', value)}/></div></FormSection>
      <FormSection title="Receipt details" icon="dollar"><div className="sip-grid sip-grid-three"><Field label="Receipt number" hint="Required" value={data.receiptNumber} onChange={value => set('receiptNumber', value)}/><Field label="Date paid" type="date" value={data.receiptDate} onChange={value => set('receiptDate', value)}/><label>Payment method<select aria-label="Payment method" value={data.paymentMethod} onChange={event => set('paymentMethod', event.target.value)}>{receiptPaymentMethods().map(method => <option key={method}>{method}</option>)}</select></label><Field label="Paid by" hint="Required" value={data.paidBy} onChange={value => set('paidBy', value)}/><Field label="Payer email" type="email" value={data.paidByEmail} onChange={value => set('paidByEmail', value)}/><label>Currency<select value={data.currency} onChange={event => set('currency', event.target.value)}>{['AUD','NZD','USD','GBP','EUR'].map(currency => <option key={currency}>{currency}</option>)}</select></label><Field label="Amount paid" hint="Required" type="number" min="0.01" step="0.01" value={data.amountPaid} onChange={value => set('amountPaid', value)} wide placeholder="0.00"/></div></FormSection>
      <FormSection title="Payment context" icon="text"><div className="sip-grid"><Field label="Invoice / reference" value={data.invoiceReference} onChange={value => set('invoiceReference', value)} placeholder="INV-1001"/><Field label="Description" value={data.description} onChange={value => set('description', value)} wide placeholder="Website support — June 2026"/><label className="wide">Notes<textarea rows="3" value={data.notes} onChange={event => set('notes', event.target.value)} placeholder="Optional note for your records"/></label><Field label="Footer text" value={data.footerText} onChange={value => set('footerText', value)} wide/></div></FormSection>
      {error && <p className="sip-error" role="alert">{error}</p>}
      <div className="sip-actions"><button className="button primary" onClick={previewReceipt}><ToolGlyph name="fileSearch" size={17}/> Preview receipt</button><button className="button secondary" onClick={makePdf} disabled={busy}><ToolGlyph name="download" size={17}/>{busy ? 'Creating PDF…' : 'Create PDF'}</button><button className="button secondary" onClick={copySummary}><Icon name={copied ? 'check' : 'copy'} size={17}/>{copied ? 'Copied receipt text' : 'Copy receipt text'}</button><button className="button secondary" onClick={clear}>Clear form</button></div>
      {pdfResult && <div className="sip-pdf-ready"><div><strong>Receipt PDF ready</strong><span>{Math.max(1, Math.round(pdfResult.size / 1024))} KB · generated in your browser</span></div><a className="button primary compact" href={pdfResult.url} download={pdfResult.name}>Download PDF</a></div>}
    </section>
    {preview && <ReceiptPreview data={preview}/>}
    <div className="sip-disclaimer"><Icon name="shield" size={18}/><p><strong>Private and intentionally simple.</strong> Receipt details stay in your browser. This is not tax or accounting advice.</p></div>
  </div>;
}

function FormSection({ title, icon, children }) { return <section className="sip-section"><header><div><ToolGlyph name={icon} size={18}/><h3>{title}</h3></div></header>{children}</section>; }
function Field({ label, hint, value, onChange, type = 'text', wide = false, placeholder = '', min, step }) { return <label className={wide ? 'wide' : ''}>{label}{hint && <> <span>{hint}</span></>}<input type={type} value={value} min={min} step={step} onChange={event => onChange(event.target.value)} placeholder={placeholder}/></label>; }
function ReceiptPreview({ data }) {
  return <section className="sip-preview" aria-label="Receipt preview"><header><div><strong>{data.businessName}</strong><span>{[data.abn && `ABN ${data.abn}`, data.businessEmail].filter(Boolean).join(' · ')}</span></div><h2>RECEIPT</h2></header><div className="sip-preview-meta"><div><span>Received from</span><strong>{data.paidBy}</strong></div><dl><dt>Receipt</dt><dd>{data.receiptNumber}</dd><dt>Date</dt><dd>{data.receiptDate}</dd><dt>Method</dt><dd>{data.paymentMethod}</dd></dl></div><div className="sip-totals"><div className="total"><span>Amount paid</span><strong>{invoiceMoney(data.amountPaid, data.currency)}</strong></div></div>{data.description && <p><strong>For:</strong> {data.description}</p>}{data.invoiceReference && <p><strong>Reference:</strong> {data.invoiceReference}</p>}{data.footerText && <footer>{data.footerText}</footer>}</section>;
}
