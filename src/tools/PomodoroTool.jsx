import { useEffect, useRef, useState } from 'react';

const MODES = {
  work:  { label: 'Focus',       minutes: 25, color: '#2c5cc5' },
  short: { label: 'Short break', minutes: 5,  color: '#1f9c6a' },
  long:  { label: 'Long break',  minutes: 15, color: '#7c3aed' },
};

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.0);
  } catch {}
}

export default function PomodoroTool() {
  const [mode, setMode] = useState('work');
  const [seconds, setSeconds] = useState(MODES.work.minutes * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef(null);

  const cfg = MODES[mode];
  const total = cfg.minutes * 60;
  const pct = seconds / total;
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  // SVG ring
  const R = 58, CX = 70, CY = 70;
  const circ = 2 * Math.PI * R;
  const dash = circ * pct;

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          beep();
          if (mode === 'work') setSessions(n => n + 1);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  const switchMode = key => {
    clearInterval(intervalRef.current);
    setMode(key);
    setSeconds(MODES[key].minutes * 60);
    setRunning(false);
  };
  const reset = () => {
    clearInterval(intervalRef.current);
    setSeconds(MODES[mode].minutes * 60);
    setRunning(false);
  };

  useEffect(() => {
    const title = running ? `${mm}:${ss} — ${cfg.label}` : 'Pomodoro Timer';
    document.title = title;
    return () => { document.title = 'SurrendaSoft Tools'; };
  }, [running, mm, ss, cfg.label]);

  return (
    <div className="pom-root">
      <div className="pom-tabs">
        {Object.entries(MODES).map(([key, { label }]) => (
          <button key={key} className={`pom-tab${mode === key ? ' active' : ''}`} onClick={() => switchMode(key)}>{label}</button>
        ))}
      </div>

      <div className="pom-ring-wrap">
        <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`${mm}:${ss} remaining`}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e8ecf5" strokeWidth="9" />
          <circle
            cx={CX} cy={CY} r={R} fill="none"
            stroke={cfg.color} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{ transition: 'stroke-dasharray 0.9s linear' }}
          />
        </svg>
        <div className="pom-time-overlay">
          <span className="pom-digits">{mm}:{ss}</span>
          <span className="pom-mode-label">{cfg.label}</span>
        </div>
      </div>

      <div className="pom-btns">
        <button className="button primary pom-main-btn" onClick={() => setRunning(r => !r)}>
          {running ? 'Pause' : seconds === total ? 'Start' : 'Resume'}
        </button>
        <button className="button secondary" onClick={reset} disabled={seconds === total && !running}>Reset</button>
      </div>

      <div className="pom-sessions">
        <span>🍅</span>
        <strong>{sessions}</strong>
        <span>focus session{sessions !== 1 ? 's' : ''} completed</span>
      </div>
    </div>
  );
}
