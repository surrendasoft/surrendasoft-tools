import { useEffect, useRef, useState } from 'react';

const PRESETS = [
  { label: '1 min', s: 60 },
  { label: '5 min', s: 300 },
  { label: '10 min', s: 600 },
  { label: '15 min', s: 900 },
  { label: '25 min', s: 1500 },
  { label: '30 min', s: 1800 },
  { label: '1 hr', s: 3600 },
];

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      const t = ctx.currentTime + i * 0.45;
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.38);
    }
  } catch {}
}

function fmt(totalSecs) {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TimerTool() {
  const [h, setH] = useState(0);
  const [m, setM] = useState(5);
  const [s, setS] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(null); // null = editing mode
  const [duration, setDuration] = useState(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);

  const started = secondsLeft !== null;
  const totalInput = h * 3600 + m * 60 + s;
  const sl = started ? secondsLeft : totalInput;
  const dur = started ? duration : totalInput;
  const pct = dur > 0 ? sl / dur : 1;

  const R = 58, CX = 70, CY = 70;
  const circ = 2 * Math.PI * R;
  const dashArr = `${circ * pct} ${circ}`;

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          setDone(true);
          beep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // Update document title while running
  useEffect(() => {
    if (running && started) document.title = `${fmt(sl)} — Timer`;
    return () => { document.title = 'SurrendaSoft Tools'; };
  }, [running, sl, started]);

  const startTimer = () => {
    if (totalInput <= 0) return;
    setDuration(totalInput);
    setSecondsLeft(totalInput);
    setDone(false);
    setRunning(true);
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setSecondsLeft(null);
    setDuration(null);
    setDone(false);
  };

  const applyPreset = preset => {
    reset();
    setH(Math.floor(preset / 3600));
    setM(Math.floor((preset % 3600) / 60));
    setS(preset % 60);
  };

  const clamp = (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));

  return (
    <div className="tmr-root">
      <div className="tmr-presets">
        {PRESETS.map(p => (
          <button key={p.s} className="tmr-preset" onClick={() => applyPreset(p.s)}>{p.label}</button>
        ))}
      </div>

      {!started && (
        <div className="tmr-inputs">
          <label>
            <input type="number" min="0" max="23" value={h === 0 ? '' : h} placeholder="0" onChange={e => setH(clamp(e.target.value, 0, 23))} aria-label="Hours" />
            <span>h</span>
          </label>
          <span className="tmr-colon">:</span>
          <label>
            <input type="number" min="0" max="59" value={m === 0 ? '' : m} placeholder="0" onChange={e => setM(clamp(e.target.value, 0, 59))} aria-label="Minutes" />
            <span>m</span>
          </label>
          <span className="tmr-colon">:</span>
          <label>
            <input type="number" min="0" max="59" value={s === 0 ? '' : s} placeholder="0" onChange={e => setS(clamp(e.target.value, 0, 59))} aria-label="Seconds" />
            <span>s</span>
          </label>
        </div>
      )}

      <div className="tmr-ring-wrap">
        <svg width="160" height="160" viewBox="0 0 140 140" role="img" aria-label={done ? 'Done' : fmt(sl)}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e8ecf5" strokeWidth="9" />
          {!done && (
            <circle
              cx={CX} cy={CY} r={R} fill="none"
              stroke={running ? '#2c5cc5' : '#7c9ed9'}
              strokeWidth="9" strokeLinecap="round"
              strokeDasharray={dashArr}
              transform={`rotate(-90 ${CX} ${CY})`}
              style={{ transition: running ? 'stroke-dasharray 0.9s linear' : 'none' }}
            />
          )}
        </svg>
        <div className="tmr-overlay">
          {done
            ? <span className="tmr-done">Done!</span>
            : <span className="tmr-digits">{fmt(sl)}</span>}
        </div>
      </div>

      <div className="tmr-btns">
        {!started && (
          <button className="button primary tmr-main-btn" onClick={startTimer} disabled={totalInput <= 0}>
            Start
          </button>
        )}
        {started && !done && (
          <button className="button primary tmr-main-btn" onClick={() => setRunning(r => !r)}>
            {running ? 'Pause' : 'Resume'}
          </button>
        )}
        {started && (
          <button className="button secondary" onClick={reset}>Reset</button>
        )}
        {done && (
          <button className="button primary tmr-main-btn" onClick={reset}>Set new timer</button>
        )}
      </div>
    </div>
  );
}
