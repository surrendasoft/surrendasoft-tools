import { useEffect, useRef, useState } from 'react';

function formatMs(ms) {
  const total = Math.max(0, ms);
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10); // centiseconds
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export default function StopwatchTool() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState([]);
  const startRef = useRef(null);  // performance.now() when current segment began
  const baseRef = useRef(0);      // total elapsed before current segment
  const rafRef = useRef(null);

  const tick = () => {
    setElapsed(baseRef.current + (performance.now() - startRef.current));
    rafRef.current = requestAnimationFrame(tick);
  };

  const start = () => {
    startRef.current = performance.now();
    setRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  };

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    baseRef.current += performance.now() - startRef.current;
    setRunning(false);
  };

  const reset = () => {
    cancelAnimationFrame(rafRef.current);
    baseRef.current = 0;
    setElapsed(0);
    setLaps([]);
    setRunning(false);
  };

  const addLap = () => {
    const prevTotal = laps.length > 0 ? laps[laps.length - 1].total : 0;
    setLaps(prev => [...prev, {
      n: prev.length + 1,
      total: elapsed,
      lap: elapsed - prevTotal,
    }]);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const minLap = laps.length > 1 ? Math.min(...laps.map(l => l.lap)) : null;
  const maxLap = laps.length > 1 ? Math.max(...laps.map(l => l.lap)) : null;

  const [main, centis] = formatMs(elapsed).split('.');
  const centisStr = centis ?? '00';

  return (
    <div className="sw-root">
      <div className="sw-display" aria-live="off" aria-label={formatMs(elapsed)}>
        <span className="sw-main">{main}</span>
        <span className="sw-centis">.{centisStr}</span>
      </div>

      <div className="sw-btns">
        {!running ? (
          <>
            <button className="button primary sw-start-btn" onClick={start}>
              {elapsed > 0 ? 'Resume' : 'Start'}
            </button>
            {elapsed > 0 && (
              <button className="button secondary" onClick={reset}>Reset</button>
            )}
          </>
        ) : (
          <>
            <button className="button secondary sw-lap-btn" onClick={addLap}>Lap</button>
            <button className="button primary sw-stop-btn" onClick={stop}>Stop</button>
          </>
        )}
      </div>

      {laps.length > 0 && (
        <div className="sw-laps">
          <div className="sw-laps-header">
            <span>#</span>
            <span>Lap time</span>
            <span>Total</span>
          </div>
          {[...laps].reverse().map(l => {
            const isFastest = laps.length > 1 && l.lap === minLap;
            const isSlowest = laps.length > 1 && l.lap === maxLap;
            return (
              <div key={l.n} className={`sw-lap-row${isFastest ? ' sw-fastest' : isSlowest ? ' sw-slowest' : ''}`}>
                <span className="sw-lap-n">
                  {l.n}
                  {isFastest && <span className="sw-lap-badge sw-lap-badge-fast">Best</span>}
                  {isSlowest && <span className="sw-lap-badge sw-lap-badge-slow">Slow</span>}
                </span>
                <span>{formatMs(l.lap)}</span>
                <span className="sw-lap-total">{formatMs(l.total)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
