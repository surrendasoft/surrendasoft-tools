import { useMemo, useState } from 'react';
import Stat from '../components/Stat.jsx';

export default function HourlyRateTool() {
  const [income, setIncome] = useState('120000'), [hours, setHours] = useState('25'), [weeksOff, setWeeksOff] = useState('5'), [overhead, setOverhead] = useState('15'), [profit, setProfit] = useState('20');
  const money = value => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value || 0);
  const values = useMemo(() => {
    const targetIncome = Math.max(0, Number(income) || 0), billableHours = Math.max(1, Number(hours) || 1), workingWeeks = Math.max(1, 52 - (Number(weeksOff) || 0));
    const overheadRate = Math.max(0, Number(overhead) || 0) / 100, profitRate = Math.max(0, Number(profit) || 0) / 100;
    const requiredRevenue = targetIncome * (1 + overheadRate) / Math.max(.01, 1 - profitRate);
    const yearlyHours = billableHours * workingWeeks;
    return { rate: requiredRevenue / yearlyHours, yearlyHours, monthlyRevenue: requiredRevenue / 12, requiredRevenue };
  }, [income, hours, weeksOff, overhead, profit]);
  return <><div className="calculator-form"><label>Target annual pay<input type="number" min="0" value={income} onChange={event => setIncome(event.target.value)}/></label><label>Billable hours per week<input type="number" min="1" value={hours} onChange={event => setHours(event.target.value)}/></label><label>Weeks off per year<input type="number" min="0" max="51" value={weeksOff} onChange={event => setWeeksOff(event.target.value)}/></label><label>Overheads<input type="number" min="0" value={overhead} onChange={event => setOverhead(event.target.value)}/><span>%</span></label><label>Profit buffer<input type="number" min="0" max="95" value={profit} onChange={event => setProfit(event.target.value)}/><span>%</span></label></div><div className="calculator-results"><div className="hero-stat"><span>Suggested hourly rate</span><strong>{money(values.rate)}</strong></div><Stat value={Math.round(values.yearlyHours)} label="Billable hours/year"/><Stat value={money(values.monthlyRevenue)} label="Monthly revenue"/><Stat value={money(values.requiredRevenue)} label="Annual revenue"/></div><p className="tool-footnote">Thoughts: this is a genuinely useful business tool because it turns vague pricing anxiety into concrete inputs.</p></>;
}
