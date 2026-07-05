import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import Icon from '../components/Icon.jsx';
import ScamAiPanel from '../components/ScamAiPanel.jsx';
import ToolGlyph from '../components/ToolGlyph.jsx';
import { analyseQrPayload } from '../utils/scamAnalysis.js';
import './QrScamCheckerTool.css';

const VERDICT_UI = {
  safe: { label: 'Looks safe', icon: 'check', col: '#08785f', bg: '#eaf9f4', bd: '#c6ebdf' },
  suspicious: { label: 'Suspicious', icon: 'warning', col: '#a05c00', bg: '#fff8ec', bd: '#f5d896' },
  scam: { label: 'Likely a scam', icon: 'siren', col: '#b53e3e', bg: '#fff0f0', bd: '#f5b8b8' },
};

function linkCheckHref(value) {
  return `#linkscam/check/${encodeURIComponent(value)}`;
}

function ResultPanel({ result, onReset }) {
  const [copied, setCopied] = useState(false);
  const vm = VERDICT_UI[result.verdict];
  const flagCount = result.payloadFlags.length + result.urlFlags.length + result.textFlags.length;
  const embeddedUrls = result.parsed.urls?.length
    ? result.parsed.urls
    : (result.payloadType === 'url' ? [result.decoded] : []);

  const copyPayload = async () => {
    await navigator.clipboard?.writeText(result.decoded);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <section className="qrscam-result" aria-label="QR analysis result">
      <div className="qrscam-verdict" style={{ background: vm.bg, borderColor: vm.bd }}>
        <span style={{ color: vm.col }}>
          <ToolGlyph name={vm.icon} size={22} /> {vm.label}
        </span>
        <p>
          {flagCount === 0
            ? 'No QR-specific scam patterns detected. Still verify unexpected codes before acting.'
            : `${flagCount} signal${flagCount !== 1 ? 's' : ''} detected. ${result.verdict === 'scam' ? 'Do not call numbers, connect to Wi-Fi, or follow links from this code.' : 'Proceed with caution and verify independently.'}`}
        </p>
      </div>

      <div className="qrscam-decoded">
        <div className="qrscam-decoded-head">
          <span className="qrscam-type-tag">{result.payloadLabel}</span>
          <button type="button" className="qrscam-copy-btn" onClick={copyPayload}>
            <Icon name={copied ? 'check' : 'copy'} size={16} />
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="qrscam-payload">{result.decoded}</pre>
      </div>

      {result.payloadType === 'url' && result.parsed.host && (
        <dl className="qrscam-parsed">
          <div><dt>Host</dt><dd>{result.parsed.host}</dd></div>
          <div><dt>Scheme</dt><dd>{result.parsed.scheme || '—'}</dd></div>
          {result.parsed.path && result.parsed.path !== '/' && (
            <div><dt>Path</dt><dd>{result.parsed.path}</dd></div>
          )}
        </dl>
      )}

      {embeddedUrls.length > 0 && (
        <div className="qrscam-link-cta">
          <p>{embeddedUrls.length === 1 ? 'This QR contains a website link.' : 'This QR contains website links.'} Check for phishing before you visit.</p>
          <div className="qrscam-link-actions">
            {embeddedUrls.map(link => (
              <a key={link} href={linkCheckHref(link)} className="button primary">{embeddedUrls.length === 1 ? 'Check link safety' : `Check ${link.replace(/^https?:\/\//, '').slice(0, 32)}…`}</a>
            ))}
          </div>
        </div>
      )}

      {result.payloadType === 'mailto' && result.parsed.address && (
        <dl className="qrscam-parsed">
          <div><dt>Email</dt><dd>{result.parsed.address}</dd></div>
        </dl>
      )}

      {(result.payloadType === 'tel' || result.payloadType === 'sms') && result.parsed.number && (
        <dl className="qrscam-parsed">
          <div><dt>Number</dt><dd>{result.parsed.number}</dd></div>
        </dl>
      )}

      {result.payloadType === 'wifi' && (
        <dl className="qrscam-parsed">
          {result.parsed.ssid && <div><dt>Network</dt><dd>{result.parsed.ssid}</dd></div>}
          {result.parsed.auth && <div><dt>Security</dt><dd>{result.parsed.auth}</dd></div>}
        </dl>
      )}

      {flagCount > 0 && (
        <div className="scam-flags">
          {result.payloadFlags.map((flag, index) => (
            <div key={`p-${index}`} className="scam-flag scam-sender">
              <span className="scam-tag">Payload</span>
              <span>{flag}</span>
            </div>
          ))}
          {result.textFlags.map(flag => (
            <div key={flag.id} className="scam-flag scam-body">
              <span className="scam-tag">{flag.label}</span>
              <span>{flag.hits.slice(0, 3).join(', ')}</span>
            </div>
          ))}
        </div>
      )}

      <ScamAiPanel
        kind="qr"
        promptText={`QR payload type: ${result.payloadLabel}\n\nDecoded content:\n${result.decoded}`}
      />

      <div className="scam-related">
        <span>Checking something else?</span>
        <a href="#scam">Email Scam Checker</a>
        <a href="#linkscam">Link Scam Checker</a>
      </div>

      <div className="qrscam-result-actions">
        <button type="button" className="button secondary" onClick={onReset}>Scan another</button>
      </div>
    </section>
  );
}

export default function QrScamCheckerTool() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);

  const stopCamera = () => {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  const handleDecode = raw => {
    stopCamera();
    setError('');
    setResult(analyseQrPayload(raw));
  };

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      frameRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
    if (code?.data) handleDecode(code.data);
    else frameRef.current = requestAnimationFrame(scanFrame);
  };

  const startCamera = async () => {
    setError('');
    setResult(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera scanning is not supported in this browser. Upload a photo of the QR code instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      setActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        frameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch {
      setError('Camera permission was unavailable. Upload a screenshot of the QR code instead.');
    }
  };

  const scanImage = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setResult(null);
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(pixels.data, pixels.width, pixels.height);
      URL.revokeObjectURL(url);
      if (code?.data) handleDecode(code.data);
      else setError('No readable QR code was found in that image.');
    };
    image.src = url;
    event.target.value = '';
  };

  if (result) {
    return (
      <div className="qrscam-root">
        <ResultPanel result={result} onReset={() => { setResult(null); setError(''); }} />
        <p className="tool-footnote">Decoded locally in your browser. Pattern matching + optional on-device AI. Website links are checked in Link Scam Checker.</p>
      </div>
    );
  }

  return (
    <div className="qrscam-root">
      <div className="qrscam-promise">
        <ToolGlyph name="shieldAlert" size={22} />
        <div>
          <strong>Check a QR code before you scan it on your phone</strong>
          <span>Decode Wi-Fi, phone, email, and contact QR codes here first. Website links are checked separately.</span>
        </div>
      </div>

      <section className="qrscam-scan">
        <div className="qrscam-section-label">
          <span>1</span>
          <div>
            <strong>Scan or upload the QR code</strong>
            <small>Point your camera at a QR on screen, or upload a photo. Nothing is sent to a server.</small>
          </div>
        </div>

        <div className={`qrscam-viewfinder${active ? ' active' : ''}`}>
          {active
            ? <video ref={videoRef} muted playsInline aria-label="QR scanner camera" />
            : <><ToolGlyph name="qr" size={54} /><p>Camera preview will appear here</p></>}
          <canvas ref={canvasRef} hidden />
        </div>

        <div className="qrscam-scan-actions">
          {active
            ? <button type="button" className="button secondary" onClick={stopCamera}>Stop camera</button>
            : <button type="button" className="button primary" onClick={startCamera}><ToolGlyph name="camera" size={18} /> Start camera</button>}
          <label className="button secondary qrscam-upload">
            Upload QR photo
            <input type="file" accept="image/*" onChange={scanImage} />
          </label>
        </div>

        {error && <p className="qrscam-error">{error}</p>}

        <div className="qrscam-how">
          <strong>Tip: check a QR on your phone screen</strong>
          <p>Display the QR on your phone, then point this device&apos;s camera at it — or take a screenshot and upload it here.</p>
        </div>
      </section>

      <div className="scam-related">
        <span>Got a link or email instead?</span>
        <a href="#linkscam">Link Scam Checker</a>
        <a href="#scam">Email Scam Checker</a>
      </div>

      <p className="tool-footnote">Pattern matching + optional on-device AI — not a substitute for professional security advice. When in doubt, do not scan, tap, call, or connect.</p>
    </div>
  );
}
