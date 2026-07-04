import { useMemo, useState } from 'react';

export default function PercentageTool() {
  const [mode, setMode] = useState('of');
  const [a, setA] = useState('25'), [b, setB] = useState('200'), [c, setC] = useState('80'), [d, setD] = useState('100'), [e, setE] = useState('50'), [f, setF] = useState('75');
  const fmt = n => isFinite(n) ? (Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 4 })) : '—';
  const resultOf = useMemo(() => { const pct = parseFloat(a), num = parseFloat(b); return isFinite(pct) && isFinite(num) ? fmt((pct / 100) * num) : '—'; }, [a, b]);
  const resultIs = useMemo(() => { const num = parseFloat(c), total = parseFloat(d); return isFinite(num) && isFinite(total) && total !== 0 ? fmt((num / total) * 100) + '%' : '—'; }, [c, d]);
  const resultChange = useMemo(() => { const from = parseFloat(e), to = parseFloat(f); if (!isFinite(from) || !isFinite(to) || from === 0) return { value: '—', label: '' }; const pct = ((to - from) / Math.abs(from)) * 100; return { value: fmt(Math.abs(pct)) + '%', label: pct >= 0 ? 'increase' : 'decrease' }; }, [e, f]);
  return <>
    <div className="sign-tabs pct-tabs"><button type="button" className={mode==='of'?'active':''} onClick={()=>setMode('of')}>X% of Y</button><button type="button" className={mode==='is'?'active':''} onClick={()=>setMode('is')}>What % is X of Y</button><button type="button" className={mode==='change'?'active':''} onClick={()=>setMode('change')}>% Change</button></div>
    {mode === 'of' && <>
      <div className="calculator-form pct-form"><label>Percentage<div className="calc-input-wrap"><input type="number" value={a} onChange={e=>setA(e.target.value)} inputMode="decimal" placeholder="25"/><span>%</span></div></label><label>of number<input type="number" value={b} onChange={e=>setB(e.target.value)} inputMode="decimal" placeholder="200"/></label></div>
      <div className="pct-result"><span>Result</span><strong>{resultOf}</strong><p>{a}% of {b} = {resultOf}</p></div>
    </>
    }
    {mode === 'is' && <>
      <div className="calculator-form pct-form"><label>Number<input type="number" value={c} onChange={e=>setC(e.target.value)} inputMode="decimal" placeholder="80"/></label><label>out of<input type="number" value={d} onChange={e=>setD(e.target.value)} inputMode="decimal" placeholder="100"/></label></div>
      <div className="pct-result"><span>Result</span><strong>{resultIs}</strong><p>{c} is {resultIs} of {d}</p></div>
    </>
    }
    {mode === 'change' && <>
      <div className="calculator-form pct-form"><label>From<input type="number" value={e} onChange={ev=>setE(ev.target.value)} inputMode="decimal" placeholder="50"/></label><label>To<input type="number" value={f} onChange={ev=>setF(ev.target.value)} inputMode="decimal" placeholder="75"/></label></div>
      <div className="pct-result"><span>{resultChange.label || 'Change'}</span><strong>{resultChange.value}</strong><p>{e} → {f} is a {resultChange.value} {resultChange.label}</p></div>
    </>
    }
    <p className="tool-footnote">All calculations happen instantly in your browser.</p></>;
}
