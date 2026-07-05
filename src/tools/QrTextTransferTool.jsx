import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import Icon from '../components/Icon.jsx';
import ToolGlyph from '../components/ToolGlyph.jsx';
import { formatBytes } from '../utils/format.js';
import { buildFileTransfer, buildTransferUrl, isFileTransferRoute, isSafeWebLink, isTextLikeFile, QR_FILE_SOURCE_LIMIT, QR_TEXT_HARD_LIMIT, readFileTransfer, readTransferPayload, validateTinyFile, validateTransferText } from '../utils/qrTextTransfer.js';
import './QrTextTransferTool.css';
import './QrTextTransferFile.css';

const routePayload = () => readTransferPayload(window.location.hash);

export default function QrTextTransferTool() {
  const [received, setReceived] = useState(routePayload);
  const [receivedFile, setReceivedFile] = useState(null);
  const [routeLoading, setRouteLoading] = useState(isFileTransferRoute(window.location.hash));
  const [mode, setMode] = useState('send');

  useEffect(() => {
    const onHash = async () => {
      const text = routePayload();
      setReceived(text); setReceivedFile(null);
      if (isFileTransferRoute(window.location.hash)) {
        setRouteLoading(true); setReceivedFile(await readFileTransfer(window.location.hash)); setRouteLoading(false);
      } else setRouteLoading(false);
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const resetRoute = () => {
    window.location.hash = 'textqr';
    setReceived(null); setReceivedFile(null); setRouteLoading(false);
  };

  if (routeLoading) return <div className="qrt-route-loading" role="status"><ToolGlyph name="qr" size={34}/><strong>Decoding tiny file…</strong><span>Everything is happening in this browser.</span></div>;
  if (receivedFile) return <ReceivedFile file={receivedFile} onClear={resetRoute}/>;
  if (received !== null) return <ReceivedText text={received} onClear={resetRoute}/>;

  return <div className="qrt-root">
    <div className="qrt-promise"><ToolGlyph name="qr" size={22}/><div><strong>Text or a tiny file travels inside the QR code</strong><span>No backend, account, upload, or temporary room.</span></div></div>
    <div className="qrt-tabs" role="group" aria-label="QR text transfer mode"><button className={mode === 'send' ? 'active' : ''} aria-pressed={mode === 'send'} onClick={() => setMode('send')}><ToolGlyph name="arrowRight" size={17}/> Create QR</button><button className={mode === 'scan' ? 'active' : ''} aria-pressed={mode === 'scan'} onClick={() => setMode('scan')}><ToolGlyph name="camera" size={17}/> Scan QR</button></div>
    {mode === 'send' ? <CreateTransfer/> : <ScanTransfer onResult={setReceived}/>} 
    <div className="qrt-privacy"><Icon name="shield" size={20}/><p><strong>Keep private information out of QR codes.</strong> Anyone who can see or scan the code can read its contents.</p></div>
  </div>;
}

function CreateTransfer() {
  const [kind, setKind] = useState('text');
  return <div className="qrt-send-wrap"><div className="qrt-kind-tabs" role="group" aria-label="Transfer content type"><button className={kind === 'text' ? 'active' : ''} aria-pressed={kind === 'text'} onClick={() => setKind('text')}>Text or link</button><button className={kind === 'file' ? 'active' : ''} aria-pressed={kind === 'file'} onClick={() => setKind('file')}>Tiny file</button></div>{kind === 'text' ? <CreateTextTransfer/> : <CreateFileTransfer/>}</div>;
}

function CreateTextTransfer() {
  const [text, setText] = useState('');
  const [transferUrl, setTransferUrl] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const canvasRef = useRef(null);
  const validation = validateTransferText(text);

  useEffect(() => {
    if (!transferUrl || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, transferUrl, { width: 320, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#10183e', light: '#ffffff' } }, qrError => {
      if (qrError) setError('This text could not fit into a reliable QR code. Try shortening it.');
    });
  }, [transferUrl]);

  const generate = () => {
    if (!validation.valid) { setError(validation.error); setTransferUrl(''); return; }
    setError(''); setTransferUrl(buildTransferUrl(text)); setCopied('');
  };
  const copy = async (value, key) => { await navigator.clipboard?.writeText(value); setCopied(key); window.setTimeout(() => setCopied(''), 1400); };
  const download = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a'); link.download = 'surrendasoft-text-transfer.png'; link.href = canvasRef.current.toDataURL('image/png'); link.click();
  };

  return <div className={`qrt-create${transferUrl ? ' has-result' : ''}`}>
    <section className="qrt-compose">
      <div className="qrt-section-label"><span>1</span><div><strong>What text do you want to send?</strong><small>Links, notes, addresses, commands, or short lists work well.</small></div></div>
      <label className="qrt-textarea"><textarea value={text} onChange={event => { setText(event.target.value); setTransferUrl(''); setError(''); }} rows="9" maxLength={QR_TEXT_HARD_LIMIT + 100} placeholder="Type or paste text here…" aria-label="Text to transfer"/><span className={text.length > QR_TEXT_HARD_LIMIT ? 'over' : ''}>{text.length.toLocaleString()} / {QR_TEXT_HARD_LIMIT.toLocaleString()}</span></label>
      {validation.warning && <p className="qrt-warning"><ToolGlyph name="warning" size={17}/>{validation.warning}</p>}
      {error && <p className="qrt-error">{error}</p>}
      <button className="button primary qrt-generate" onClick={generate} disabled={!text.trim() || text.length > QR_TEXT_HARD_LIMIT}><ToolGlyph name="qr" size={18}/> Generate transfer QR</button>
    </section>
    {transferUrl && <section className="qrt-result" aria-label="Generated transfer QR">
      <div className="qrt-section-label"><span>2</span><div><strong>Scan this on your other device</strong><small>It opens SurrendaSoft Tools and displays the text.</small></div></div>
      <div className="qrt-code"><canvas ref={canvasRef}/></div>
      <p className="qrt-contains">The QR contains the transfer URL and encoded text—nothing is uploaded.</p>
      <div className="qrt-actions"><button className="button primary" onClick={() => copy(text, 'text')}><Icon name={copied === 'text' ? 'check' : 'copy'} size={17}/>{copied === 'text' ? 'Copied text' : 'Copy text'}</button><button className="button secondary" onClick={() => copy(transferUrl, 'link')}><Icon name={copied === 'link' ? 'check' : 'copy'} size={17}/>{copied === 'link' ? 'Copied link' : 'Copy transfer link'}</button><button className="button secondary" onClick={download}>Download QR</button></div>
    </section>}
  </div>;
}

function CreateFileTransfer() {
  const [file, setFile] = useState(null), [result, setResult] = useState(null), [error, setError] = useState(''), [working, setWorking] = useState(false), [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);
  const validation = validateTinyFile(file);
  useEffect(() => {
    if (!result?.url || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, result.url, { width: 320, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#10183e', light: '#ffffff' } }, qrError => qrError && setError('The encoded file did not fit into a reliable QR code.'));
  }, [result]);
  const create = async () => {
    if (!validation.valid) { setError(validation.error); return; }
    setWorking(true); setError(''); setResult(null);
    try { setResult(await buildFileTransfer(file)); } catch (createError) { setError(createError.message); }
    setWorking(false);
  };
  const copyLink = async () => { await navigator.clipboard?.writeText(result.url); setCopied(true); window.setTimeout(() => setCopied(false), 1400); };
  const downloadQr = () => { const link = document.createElement('a'); link.download = `${result.name.replace(/\.[^.]+$/, '') || 'tiny-file'}-qr.png`; link.href = canvasRef.current.toDataURL('image/png'); link.click(); };
  return <div className={`qrt-create${result ? ' has-result' : ''}`}><section className="qrt-compose">
    <div className="qrt-section-label"><span>1</span><div><strong>Choose a tiny file</strong><small>Best for TXT, JSON, CSV, Markdown, small configs, and tiny code snippets.</small></div></div>
    <label className="qrt-file-drop"><input type="file" aria-label="Choose a tiny file" onChange={event => { setFile(event.target.files?.[0] || null); setResult(null); setError(''); }}/><ToolGlyph name="fileText" size={34}/><strong>{file ? file.name : 'Choose a file'}</strong><span>{file ? `${formatBytes(file.size)} · ${file.type || 'Unknown type'}` : `Maximum source size ${formatBytes(QR_FILE_SOURCE_LIMIT)}; final compressed QR must also fit.`}</span></label>
    {file && validation.valid && <div className="qrt-file-ready"><Icon name="check" size={17}/><span>Ready to compress and test against QR capacity.</span></div>}
    {error && <p className="qrt-error">{error}</p>}
    <button className="button primary qrt-generate" onClick={create} disabled={!file || !validation.valid || working}><ToolGlyph name="qr" size={18}/>{working ? 'Compressing and checking…' : 'Create file QR'}</button>
    <p className="qrt-tiny-explain">Normal photos, PDFs, Office files, and ZIPs are too large. This mode is intentionally for tiny files.</p>
  </section>{result && <section className="qrt-result" aria-label="Generated file transfer QR">
    <div className="qrt-section-label"><span>2</span><div><strong>Scan to reconstruct the file</strong><small>The receiving browser rebuilds the original download.</small></div></div>
    <div className="qrt-code"><canvas ref={canvasRef}/></div>
    <div className="qrt-file-stats"><div><span>Original</span><strong>{formatBytes(result.originalSize)}</strong></div><div><span>QR payload</span><strong>{formatBytes(result.packedSize)}</strong></div><div><span>Encoding</span><strong>{result.compressed ? 'Gzip' : 'Raw'}</strong></div></div>
    <p className="qrt-contains">The complete file and its metadata are inside this QR URL. Nothing is uploaded.</p>
    <div className="qrt-actions"><button className="button primary" onClick={copyLink}><Icon name={copied ? 'check' : 'copy'} size={17}/>{copied ? 'Copied link' : 'Copy transfer link'}</button><button className="button secondary" onClick={downloadQr}>Download QR</button></div>
  </section>}</div>;
}

function ReceivedText({ text, onClear }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard?.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1400); };
  return <div className="qrt-received">
    <div className="qrt-success-icon"><Icon name="check" size={32}/></div><span className="qrt-kicker">QR TEXT RECEIVED</span><h2>Text transferred</h2><p>Copy it on this device. The text was decoded locally from the QR link.</p>
    <div className="qrt-received-text">{text}</div>
    <div className="qrt-received-actions"><button className="button primary" onClick={copy}><Icon name={copied ? 'check' : 'copy'} size={18}/>{copied ? 'Copied' : 'Copy text'}</button>{isSafeWebLink(text) && <a className="button secondary" href={text.trim()} target="_blank" rel="noreferrer noopener">Open link <Icon name="arrow" size={16}/></a>}<button className="button secondary" onClick={onClear}>Create another</button></div>
    <p className="qrt-local-note"><Icon name="shield" size={17}/> Decoded in this browser. No server lookup was needed.</p>
  </div>;
}

function ReceivedFile({ file, onClear }) {
  const [downloadUrl, setDownloadUrl] = useState('');
  const [preview] = useState(() => isTextLikeFile(file) ? new TextDecoder().decode(file.bytes) : '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const blob = new Blob([file.bytes], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const copyText = async () => {
    await navigator.clipboard?.writeText(preview);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return <div className="qrt-received qrt-received-file">
    <div className="qrt-success-icon"><Icon name="check" size={32}/></div><span className="qrt-kicker">TINY FILE RECEIVED</span><h2>File reconstructed</h2><p>The original file was rebuilt locally from the QR link.</p>
    <div className="qrt-file-summary"><ToolGlyph name="fileText" size={30}/><div><strong>{file.name}</strong><span>{formatBytes(file.originalSize)} · {file.mimeType} · {file.compressed ? 'Gzip transfer' : 'Raw transfer'}</span></div></div>
    {preview && <pre className="qrt-file-preview">{preview}</pre>}
    <div className="qrt-received-actions">{preview && <button className="button secondary" onClick={copyText}><Icon name={copied ? 'check' : 'copy'} size={18}/>{copied ? 'Copied' : 'Copy file text'}</button>}<a className="button primary" href={downloadUrl} download={file.name}>Download file</a><button className="button secondary" onClick={onClear}>Create another</button></div>
    <p className="qrt-local-note"><Icon name="shield" size={17}/> Only download files from people you trust. Nothing was fetched from a server.</p>
  </div>;
}

function ScanTransfer({ onResult }) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef(null), canvasRef = useRef(null), streamRef = useRef(null), frameRef = useRef(null);

  const stop = () => { cancelAnimationFrame(frameRef.current); streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; setActive(false); };
  useEffect(() => stop, []);

  const acceptCode = value => {
    const payload = readTransferPayload(value);
    stop();
    if (payload !== null) {
      window.location.hash = `textqr/receive/${value.split('#textqr/receive/')[1]}`;
      onResult(payload);
      return;
    }
    if (isFileTransferRoute(value)) {
      try {
        const hash = value.startsWith('#') ? value : new URL(value, window.location.href).hash;
        window.location.hash = hash.slice(1);
        return;
      } catch { /* handled below */ }
    }
    setError('This is not a SurrendaSoft QR transfer code.');
  };

  const scanFrame = () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) { frameRef.current = requestAnimationFrame(scanFrame); return; }
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
    if (code?.data) acceptCode(code.data); else frameRef.current = requestAnimationFrame(scanFrame);
  };

  const start = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) { setError('Camera scanning is not supported in this browser. Upload a QR image instead.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream; setActive(true);
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); frameRef.current = requestAnimationFrame(scanFrame); }
    } catch { setError('Camera permission was unavailable. You can upload a screenshot of the QR code instead.'); }
  };

  const scanImage = event => {
    const file = event.target.files?.[0]; if (!file) return;
    const image = new Image(), url = URL.createObjectURL(file);
    image.onload = () => {
      const canvas = canvasRef.current, context = canvas.getContext('2d', { willReadFrequently: true }); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height), code = jsQR(pixels.data, pixels.width, pixels.height);
      URL.revokeObjectURL(url);
      if (code?.data) acceptCode(code.data); else setError('No readable QR code was found in that image.');
    };
    image.src = url;
  };

  return <section className="qrt-scan">
    <div className="qrt-section-label"><span>1</span><div><strong>Scan the QR on your other device</strong><small>Allow camera access, or upload a QR screenshot.</small></div></div>
    <div className={`qrt-viewfinder${active ? ' active' : ''}`}>{active ? <video ref={videoRef} muted playsInline aria-label="QR scanner camera"/> : <><ToolGlyph name="qr" size={54}/><p>Camera preview will appear here</p></>}<canvas ref={canvasRef} hidden/></div>
    <div className="qrt-scan-actions">{active ? <button className="button secondary" onClick={stop}>Stop camera</button> : <button className="button primary" onClick={start}><ToolGlyph name="camera" size={18}/> Start camera scanner</button>}<label className="button secondary qrt-upload">Upload QR image<input type="file" accept="image/*" onChange={scanImage}/></label></div>
    {error && <p className="qrt-error">{error}</p>}
    <div className="qrt-how"><strong>To send phone → laptop</strong><p>Generate the QR on your phone, then scan it here using your laptop camera.</p></div>
  </section>;
}
