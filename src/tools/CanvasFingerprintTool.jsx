import { useCallback, useEffect, useRef, useState } from 'react';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 120;

function drawFingerprint(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
  bg.addColorStop(0, '#eef1fb');
  bg.addColorStop(1, '#e4e9f8');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Geometric shapes (subpixel rendering varies per GPU + driver)
  ctx.save();
  ctx.translate(40, 60);
  ctx.rotate(0.1);
  ctx.fillStyle = 'rgba(44, 92, 197, 0.8)';
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillText('SurrendaSoft Tools 🔐 Cwm fjord-bank glyphs vext quiz', 0, 0);
  ctx.restore();

  // Emoji (rendering differs across OS/browser)
  ctx.font = '18px Arial';
  ctx.fillText('😀🎨🔬🌍', CANVAS_WIDTH - 100, 40);

  // Arc + bezier
  ctx.beginPath();
  ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10, 30, 0, Math.PI * 1.5);
  ctx.strokeStyle = 'rgba(124, 58, 237, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(10, CANVAS_HEIGHT - 20);
  ctx.bezierCurveTo(80, 10, 160, CANVAS_HEIGHT, 240, 30);
  ctx.strokeStyle = 'rgba(31, 156, 106, 0.5)';
  ctx.stroke();
}

async function sha256(canvas) {
  const dataUrl = canvas.toDataURL();
  const bytes = new TextEncoder().encode(dataUrl);
  const hashBuf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function CanvasFingerprintTool() {
  const canvasRef = useRef(null);
  const [hash, setHash] = useState('');
  const [dataUrl, setDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const generate = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      drawFingerprint(canvas);
      const url = canvas.toDataURL();
      setDataUrl(url);
      const h = await sha256(canvas);
      setHash(h);
    } catch (e) {
      setError('Canvas or crypto not supported: ' + e.message);
    }
  }, []);

  useEffect(() => { generate(); }, [generate]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(hash); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="cfp-root">
      <p className="cfp-intro">
        Your browser renders this canvas slightly differently from every other browser — due to GPU drivers, font rendering, anti-aliasing, and OS differences.
        The SHA-256 hash of the rendered pixels is your <strong>canvas fingerprint</strong>.
      </p>

      <div className="cfp-canvas-wrap">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="cfp-canvas" aria-label="Fingerprint canvas" />
      </div>

      {error && <p className="pdf-error">{error}</p>}

      {hash && (
        <div className="cfp-hash-block">
          <span className="cfp-hash-label">SHA-256 fingerprint</span>
          <div className="cfp-hash-row">
            <code className="cfp-hash">{hash.slice(0, 16)}…{hash.slice(-16)}</code>
            <button className="button secondary cfp-copy-btn" onClick={copy}>
              {copied ? 'Copied ✓' : 'Copy full hash'}
            </button>
          </div>
          <details className="cfp-full-hash">
            <summary>Show full hash</summary>
            <code>{hash}</code>
          </details>
        </div>
      )}

      <div className="cfp-explainer">
        <h3>How does this work?</h3>
        <ul>
          <li>We draw text, shapes, and emoji onto a hidden HTML canvas.</li>
          <li>Subpixel rendering, font hinting, and GPU drivers cause tiny pixel differences between systems.</li>
          <li>We hash the raw pixel data with SHA-256 — this hash is unique to your browser + GPU combination.</li>
          <li>Real fingerprinting scripts combine this with dozens of other signals to identify users without cookies.</li>
        </ul>
        <p className="cfp-privacy-note">⚠ <strong>No data leaves your browser.</strong> This demonstration uses only local Web APIs.</p>
      </div>
    </div>
  );
}
