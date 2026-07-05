import { useCallback, useMemo, useState } from 'react';
import ToolSharePanel, { ToolShareBanner } from '../components/ToolSharePanel.jsx';
import { useToolShare } from '../hooks/useToolShare.js';

export default function ProfitMarginTool() {
  const [mode, setMode] = useState('price');
  const [cost, setCost] = useState('65');
  const [price, setPrice] = useState('120');
  const [targetMargin, setTargetMargin] = useState('35');

  const loadShared = useCallback(data => {
    if (data?.mode === 'price' || data?.mode === 'target') setMode(data.mode);
    if (data?.cost != null) setCost(String(data.cost));
    if (data?.price != null) setPrice(String(data.price));
    if (data?.targetMargin != null) setTargetMargin(String(data.targetMargin));
  }, []);

  const { loadedFromShare, dismissLoadedBanner, sharePanelProps } = useToolShare({
    toolId: 'margin',
    getPayload: () => ({ mode, cost, price, targetMargin }),
    onLoad: loadShared,
    canShare: true,
    invalidateDeps: [mode, cost, price, targetMargin],
  });

  const money = value => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value || 0);
  const values = useMemo(() => {
    const costValue = Math.max(0, Number(cost) || 0);
    const sellPrice = mode === 'target' ? costValue / Math.max(.01, 1 - (Math.max(0, Number(targetMargin) || 0) / 100)) : Math.max(0, Number(price) || 0);
    const grossProfit = sellPrice - costValue;
    return { sellPrice, grossProfit, margin: sellPrice ? grossProfit / sellPrice * 100 : 0, markup: costValue ? grossProfit / costValue * 100 : 0 };
  }, [mode, cost, price, targetMargin]);

  return <>
    <ToolShareBanner show={loadedFromShare} onDismiss={dismissLoadedBanner}/>
    <div className="gst-mode" role="group" aria-label="Profit margin mode"><button className={mode === 'price' ? 'active' : ''} onClick={() => setMode('price')}>Known sell price</button><button className={mode === 'target' ? 'active' : ''} onClick={() => setMode('target')}>Target margin</button></div>
    <div className="calculator-form"><label>Cost<input type="number" min="0" step="0.01" value={cost} onChange={event => setCost(event.target.value)}/></label>{mode === 'price' ? <label>Sell price<input type="number" min="0" step="0.01" value={price} onChange={event => setPrice(event.target.value)}/></label> : <label>Target margin<input type="number" min="0" max="95" step="0.1" value={targetMargin} onChange={event => setTargetMargin(event.target.value)}/><span>%</span></label>}</div>
    <div className="margin-results"><div><span>Sell price</span><strong>{money(values.sellPrice)}</strong></div><div><span>Gross profit</span><strong>{money(values.grossProfit)}</strong></div><div><span>Profit margin</span><strong>{values.margin.toFixed(1)}%</strong></div><div><span>Markup</span><strong>{values.markup.toFixed(1)}%</strong></div></div>
    <ToolSharePanel {...sharePanelProps} qrHint="Scan to open this margin calc on another device"/>
    <p className="tool-footnote">Thoughts: this pairs well with the hourly calculator and makes markup versus margin obvious.</p>
  </>;
}
