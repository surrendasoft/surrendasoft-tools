import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import './CalculatorTool.css';

const friendlyExpression = value => value.replace(/\*\*/g, ' ^ ').replace(/\*/g, ' × ').replace(/\//g, ' ÷ ').replace(/\+/g, ' + ').replace(/-/g, ' − ').replace(/\s+/g, ' ').trim();
const formatNumber = value => Number.isFinite(value) ? String(parseFloat(value.toFixed(10))) : 'Error';
const evaluateExpression = value => {
  if (!value || !/^[\d.+\-*/()\s]+$/.test(value)) return 'Error';
  try {
    // eslint-disable-next-line no-new-func
    return formatNumber(Function('"use strict"; return (' + value + ')')());
  } catch { return 'Error'; }
};

export default function CalculatorTool() {
  const [display, setDisplay] = useState('0');
  const [expr, setExpr] = useState('');
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [justEvaled, setJustEvaled] = useState(false);
  const [completedExpression, setCompletedExpression] = useState('');
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState('');
  const [scientific, setScientific] = useState(false);
  const [angleUnit, setAngleUnit] = useState('DEG');

  const liveExpression = expr + (waitingForOperand ? '' : display);
  const runningResult = useMemo(() => expr && !waitingForOperand ? evaluateExpression(liveExpression) : display, [display, expr, liveExpression, waitingForOperand]);
  const visibleExpression = justEvaled && completedExpression ? completedExpression : friendlyExpression(liveExpression || display);

  const addHistory = useCallback((expression, result) => {
    setHistory(current => [{ id: `${Date.now()}-${current.length}`, expression, result }, ...current].slice(0, 20));
  }, []);

  const copy = async (value, key) => {
    if (!value || value === 'Error') return;
    await navigator.clipboard?.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(current => current === key ? '' : current), 1400);
  };

  const clear = useCallback(() => {
    setDisplay('0'); setExpr(''); setWaitingForOperand(false); setJustEvaled(false); setCompletedExpression('');
  }, []);

  const press = useCallback(key => {
    if (key === 'AC') { clear(); return; }
    if (key === '⌫') {
      if (display === 'Error' || justEvaled) { clear(); return; }
      if (waitingForOperand && expr) {
        const withoutOperator = expr.replace(/(\*\*|[+\-*/])$/, '');
        setExpr(withoutOperator.endsWith(display) ? withoutOperator.slice(0, -display.length) : withoutOperator);
        setWaitingForOperand(false);
        return;
      }
      setDisplay(current => current.length > 1 ? current.slice(0, -1) : '0'); return;
    }
    if (key === '±') { setDisplay(current => current.startsWith('-') ? current.slice(1) : current === '0' ? '0' : `-${current}`); setWaitingForOperand(false); return; }
    if (key === '%') { setDisplay(current => formatNumber(parseFloat(current) / 100)); setWaitingForOperand(false); return; }
    if (key === '=') {
      if (!expr || waitingForOperand) return;
      const full = expr + display, out = evaluateExpression(full);
      if (out !== 'Error') addHistory(friendlyExpression(full), out);
      setCompletedExpression(friendlyExpression(full)); setDisplay(out); setExpr(''); setWaitingForOperand(false); setJustEvaled(true);
      return;
    }
    const operators = { '+': '+', '-': '-', '×': '*', '÷': '/', 'xʸ': '**' };
    if (operators[key]) {
      if (display === 'Error') return;
      if (waitingForOperand && expr) {
        setExpr(current => current.replace(/(\*\*|[+\-*/])$/, operators[key]));
      } else {
        setExpr(current => `${justEvaled ? '' : current}${display}${operators[key]}`);
      }
      setWaitingForOperand(true); setJustEvaled(false); setCompletedExpression(''); return;
    }
    if (!/^\d$/.test(key) && key !== '.') return;
    if (justEvaled || display === 'Error' || waitingForOperand) {
      if (justEvaled) setExpr('');
      setDisplay(key === '.' ? '0.' : key); setWaitingForOperand(false); setJustEvaled(false); setCompletedExpression(''); return;
    }
    if (key === '.' && display.includes('.')) return;
    setDisplay(current => current === '0' && key !== '.' ? key : current + key);
  }, [addHistory, clear, display, expr, justEvaled, waitingForOperand]);

  const applyScientific = key => {
    if (waitingForOperand) return;
    const value = Number(display);
    if (!Number.isFinite(value)) return;
    const angle = angleUnit === 'DEG' ? value * Math.PI / 180 : value;
    const functions = {
      sin: () => Math.sin(angle), cos: () => Math.cos(angle), tan: () => Math.tan(angle),
      '√': () => value < 0 ? NaN : Math.sqrt(value), log: () => value <= 0 ? NaN : Math.log10(value),
      ln: () => value <= 0 ? NaN : Math.log(value), 'x²': () => value ** 2, '1/x': () => value === 0 ? NaN : 1 / value,
    };
    if (key === 'π' || key === 'e') {
      setDisplay(formatNumber(key === 'π' ? Math.PI : Math.E)); setWaitingForOperand(false); setJustEvaled(false); setCompletedExpression(''); return;
    }
    if (key === 'xʸ') { press(key); return; }
    const result = formatNumber(functions[key]?.());
    if (result !== 'Error' && !expr) {
      const suffix = ['sin', 'cos', 'tan'].includes(key) && angleUnit === 'DEG' ? '°' : '';
      const label = `${key}(${display}${suffix})`;
      addHistory(label, result); setCompletedExpression(label); setJustEvaled(true);
    } else { setJustEvaled(false); }
    setDisplay(result); setWaitingForOperand(false);
  };

  useEffect(() => {
    const onKeyDown = event => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable)) return;
      const keyMap = { Enter: '=', '=': '=', Escape: 'AC', Delete: 'AC', Backspace: '⌫', '*': '×', '/': '÷', '^': 'xʸ' };
      const mapped = keyMap[event.key] || event.key;
      if (/^\d$/.test(mapped) || ['.', '+', '-', '×', '÷', '%', '=', 'AC', '⌫', 'xʸ'].includes(mapped)) {
        event.preventDefault(); press(mapped);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [press]);

  const rows = [['AC','±','%','÷'],['7','8','9','×'],['4','5','6','-'],['1','2','3','+'],[['0',2],'.','=']];
  const scientificKeys = ['sin','cos','tan','√','log','ln','x²','1/x','π','e','xʸ','⌫'];
  const shownResult = runningResult.length > 12 && runningResult !== 'Error' ? parseFloat(parseFloat(runningResult).toPrecision(9)).toString() : runningResult;

  return <>
    <div className="calc-mode-bar">
      <div className="calc-mode-switch" role="group" aria-label="Calculator mode"><button className={!scientific ? 'active' : ''} aria-pressed={!scientific} onClick={() => setScientific(false)}>Basic</button><button className={scientific ? 'active' : ''} aria-pressed={scientific} onClick={() => setScientific(true)}>Scientific</button></div>
      <span className="calc-keyboard-hint"><Icon name="keyboard" size={16}/> Keyboard ready</span>
    </div>
    <div className={`calc-tool-layout${scientific ? ' scientific' : ''}`}>
      <div className={`calc-wrap${scientific ? ' calc-scientific' : ''}`}>
        <div className="calc-screen">
          <div className="calc-screen-top"><span className="calc-screen-label">CALCULATION</span><button className="calc-copy-result" onClick={() => copy(runningResult, 'current')} disabled={runningResult === 'Error'} aria-label="Copy current result"><Icon name={copied === 'current' ? 'check' : 'copy'} size={16}/><span>{copied === 'current' ? 'Copied' : 'Copy'}</span></button></div>
          <div className="calc-expression" aria-label="Current calculation">{visibleExpression}</div>
          <div className="calc-result-row"><span>=</span><div className="calc-display" aria-label="Running result" aria-live="polite">{shownResult}</div></div>
        </div>
        {scientific && <div className="calc-scientific-panel"><div className="calc-angle"><span>Angle</span><div role="group" aria-label="Angle unit"><button className={angleUnit === 'DEG' ? 'active' : ''} aria-pressed={angleUnit === 'DEG'} onClick={() => setAngleUnit('DEG')}>DEG</button><button className={angleUnit === 'RAD' ? 'active' : ''} aria-pressed={angleUnit === 'RAD'} onClick={() => setAngleUnit('RAD')}>RAD</button></div></div><div className="calc-scientific-keys">{scientificKeys.map(key => <button key={key} onClick={() => applyScientific(key)} aria-label={key === '√' ? 'Square root' : key === 'x²' ? 'Square' : key === '1/x' ? 'Reciprocal' : key === 'xʸ' ? 'Power' : key === '⌫' ? 'Backspace' : key}>{key}</button>)}</div></div>}
        <div className="calc-keys">{rows.map((row, rowIndex) => <div key={rowIndex} className="calc-row">{row.map((item, itemIndex) => {
          const [key, span] = Array.isArray(item) ? item : [item, 1];
          const isOp = ['÷','×','-','+','='].includes(key), isFn = ['AC','±','%'].includes(key);
          return <button key={itemIndex} onClick={() => press(key)} className={`calc-key${isOp ? ' calc-op' : ''}${isFn ? ' calc-fn' : ''}${key === '=' ? ' calc-eq' : ''}`} style={span > 1 ? { gridColumn: `span ${span}` } : {}}>{key}</button>;
        })}</div>)}</div>
      </div>

      <section className="calc-history" aria-labelledby="calculation-history-title">
        <div className="calc-history-head"><div><span>RECENT</span><h3 id="calculation-history-title">Calculation history</h3></div>{history.length > 0 && <button onClick={() => setHistory([])}>Clear history</button>}</div>
        {history.length === 0 ? <div className="calc-history-empty"><Icon name="history" size={24}/><p>Your calculations will appear here.</p><span>Results stay in this tab only.</span></div> : <ol>{history.map(item => <li key={item.id}><div><span>{item.expression}</span><strong>= {item.result}</strong></div><button onClick={() => copy(item.result, item.id)} aria-label={`Copy result ${item.result}`}><Icon name={copied === item.id ? 'check' : 'copy'} size={17}/><span>{copied === item.id ? 'Copied' : 'Copy'}</span></button></li>)}</ol>}
      </section>
    </div>
    <p className="calc-shortcuts"><strong>Keyboard:</strong> 0–9, +, −, *, /, %, ^ · Enter to calculate · Backspace to edit · Esc to clear</p>
  </>;
}
