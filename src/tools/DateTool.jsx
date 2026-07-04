import { useMemo, useState } from 'react';

export default function DateTool() {
  const today = new Date().toISOString().slice(0,10); const later = new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  const [start,setStart]=useState(today), [end,setEnd]=useState(later);
  const result = useMemo(() => { const a=new Date(start+'T00:00:00'), b=new Date(end+'T00:00:00'); if (!start||!end||isNaN(a)||isNaN(b)) return null; const days=Math.round((b-a)/86400000); let business=0, d=new Date(a), dir=days>=0?1:-1; for(let i=0;i<Math.abs(days);i++){d.setDate(d.getDate()+dir); if(d.getDay()!==0&&d.getDay()!==6)business+=dir;} return {days,weeks:(days/7).toFixed(1),business}; },[start,end]);
  return <><div className="field-row"><label>Start date<input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>End date<input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label></div>{result && <div className="result-grid"><div><strong>{Math.abs(result.days)}</strong><span>calendar days</span></div><div><strong>{Math.abs(result.business)}</strong><span>business days</span></div><div><strong>{Math.abs(result.weeks)}</strong><span>weeks</span></div></div>}<p className="result-caption">{result?.days === 0 ? 'These dates are the same day.' : `${Math.abs(result?.days || 0)} days ${result?.days < 0 ? 'before' : 'after'} the start date.`}</p></>;
}
