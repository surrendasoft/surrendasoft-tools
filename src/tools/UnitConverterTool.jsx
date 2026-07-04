import { useEffect, useState } from 'react';

export default function UnitConverterTool() {
  const categories = {
    Length:      { units: ['mm','cm','m','km','in','ft','yd','mi'], toBase: { mm:0.001, cm:0.01, m:1, km:1000, in:0.0254, ft:0.3048, yd:0.9144, mi:1609.344 } },
    Weight:      { units: ['mg','g','kg','t','oz','lb','st'], toBase: { mg:0.000001, g:0.001, kg:1, t:1000, oz:0.0283495, lb:0.453592, st:6.35029 } },
    Temperature: { units: ['°C','°F','K'], toBase: null },
    Volume:      { units: ['ml','L','fl oz','cup','pt','qt','gal'], toBase: { ml:0.001, L:1, 'fl oz':0.0295735, cup:0.236588, pt:0.473176, qt:0.946353, gal:3.78541 } },
    Speed:       { units: ['m/s','km/h','mph','knots'], toBase: { 'm/s':1, 'km/h':1/3.6, mph:0.44704, knots:0.514444 } },
    Area:        { units: ['mm²','cm²','m²','km²','in²','ft²','acre','ha'], toBase: { 'mm²':0.000001, 'cm²':0.0001, 'm²':1, 'km²':1000000, 'in²':0.00064516, 'ft²':0.092903, acre:4046.86, ha:10000 } },
  };
  const catNames = Object.keys(categories);
  const [cat, setCat] = useState('Length');
  const { units } = categories[cat];
  const [fromUnit, setFromUnit] = useState(units[0]), [toUnit, setToUnit] = useState(units[4]);
  const [fromVal, setFromVal] = useState('1'), [toVal, setToVal] = useState('');
  const convertTemp = (val, from, to) => { let c; if (from==='°C') c=val; else if (from==='°F') c=(val-32)/1.8; else c=val-273.15; if (to==='°C') return c; if (to==='°F') return c*1.8+32; return c+273.15; };
  const convert = (val, from, to, cat) => { if (!isFinite(val)) return ''; if (cat==='Temperature') return convertTemp(val,from,to); const base = categories[cat].toBase; return val * base[from] / base[to]; };
  const fmt = n => { if (!isFinite(n)) return ''; const abs = Math.abs(n); if (abs === 0) return '0'; if (abs < 0.0001 || abs >= 1e9) return n.toExponential(4); return parseFloat(n.toPrecision(7)).toString(); };
  const onFromChange = val => { setFromVal(val); setToVal(fmt(convert(parseFloat(val), fromUnit, toUnit, cat))); };
  const onToChange = val => { setToVal(val); setFromVal(fmt(convert(parseFloat(val), toUnit, fromUnit, cat))); };
  const swap = () => { const newFrom = toUnit, newTo = fromUnit, newFromVal = toVal, newToVal = fromVal; setFromUnit(newFrom); setToUnit(newTo); setFromVal(newFromVal); setToVal(newToVal); };
  const onCatChange = next => { const u = categories[next].units; setCat(next); setFromUnit(u[0]); setToUnit(u[next==='Temperature'?1:4] || u[1]); setFromVal('1'); setToVal(fmt(convert(1, u[0], u[next==='Temperature'?1:4]||u[1], next))); };
  useEffect(() => { onFromChange(fromVal); }, [fromUnit, toUnit, cat]);
  return <>
    <div className="unit-cats">{catNames.map(n => <button key={n} type="button" className={cat===n?'active':''} onClick={()=>onCatChange(n)}>{n}</button>)}</div>
    <div className="unit-row">
      <div className="unit-field"><select value={fromUnit} onChange={e=>{setFromUnit(e.target.value);}} aria-label="From unit">{units.map(u=><option key={u}>{u}</option>)}</select><input type="number" value={fromVal} onChange={e=>onFromChange(e.target.value)} inputMode="decimal" placeholder="0" aria-label="Value to convert"/></div>
      <button className="unit-swap" onClick={swap} aria-label="Swap units">⇄</button>
      <div className="unit-field"><select value={toUnit} onChange={e=>{setToUnit(e.target.value);}} aria-label="To unit">{units.map(u=><option key={u}>{u}</option>)}</select><input type="number" value={toVal} onChange={e=>onToChange(e.target.value)} inputMode="decimal" placeholder="0" aria-label="Converted value"/></div>
    </div>
    <p className="unit-eq">{fromVal || '0'} {fromUnit} = <strong>{toVal || '0'} {toUnit}</strong></p>
    <p className="tool-footnote">Conversions use standard international values. Temperature converts exactly. All calculations run locally.</p></>;
}
