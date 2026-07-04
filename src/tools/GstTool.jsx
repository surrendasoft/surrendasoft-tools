import { useMemo, useState } from 'react';

export default function GstTool() {
  const [mode, setMode] = useState('add');
  const [amount, setAmount] = useState('1000');
  const numericAmount = Math.max(0, Number(amount) || 0);
  const values = useMemo(() => {
    if (mode === 'add') return { ex: numericAmount, gst: numericAmount * 0.1, inc: numericAmount * 1.1 };
    return { ex: numericAmount / 1.1, gst: numericAmount - numericAmount / 1.1, inc: numericAmount };
  }, [mode, numericAmount]);
  const money = value => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
  return <><div className="gst-mode" role="group" aria-label="GST calculation mode"><button className={mode === 'add' ? 'active' : ''} onClick={() => setMode('add')}>Add GST</button><button className={mode === 'remove' ? 'active' : ''} onClick={() => setMode('remove')}>Remove GST</button></div><label className="money-field"><span>{mode === 'add' ? 'Price excluding GST' : 'Price including GST'}</span><div><b>$</b><input type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} aria-label="Amount in Australian dollars"/><em>AUD</em></div></label><div className="gst-results"><div><span>Price excluding GST</span><strong>{money(values.ex)}</strong></div><div className="gst-highlight"><span>GST amount · 10%</span><strong>{money(values.gst)}</strong></div><div><span>Price including GST</span><strong>{money(values.inc)}</strong></div></div><p className="gst-note">Uses the standard Australian GST rate of 10%. Results are rounded to the nearest cent.</p></>;
}
