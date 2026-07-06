import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import Icon from '../components/Icon.jsx';
import ToolGlyph from '../components/ToolGlyph.jsx';
import { formatBytes } from '../utils/format.js';
import {
  assembleQrChunks, buildJoinUrl, connectionCode, createTransferId, decodeLocalSignal, decodeQrChunk,
  encodeLocalSignal, extractLocalSignal, LOCAL_TRANSFER_CHUNK_SIZE, LOCAL_TRANSFER_FILE_LIMIT,
  LOCAL_TRANSFER_SIGNAL_PREFIX, LOCAL_TRANSFER_TEXT_LIMIT, safeFileName, sha256Hex, splitIntoQrChunks,
  waitForIceGathering,
} from '../utils/localTransfer.js';
import { QR_CHUNK_DISPLAY_PX } from '../utils/qrSizing.js';
import './LocalDeviceTransferTool.css';
import './LocalDeviceTransferFallback.css';

const routeOffer = () => {
  const match = window.location.hash.match(/^#localtransfer\/join\/(.+)$/);
  return match?.[1] || '';
};

function StepProgress({ step, total = 2 }) {
  return <div className="ldt-steps" role="list" aria-label={`Pairing step ${step} of ${total}`}>
    {Array.from({ length: total }, (_, index) => {
      const number = index + 1;
      const state = number < step ? 'done' : number === step ? 'current' : 'pending';
      return <span key={number} className={`ldt-step ${state}`} role="listitem" aria-current={state === 'current' ? 'step' : undefined}>
        <i>{state === 'done' ? '✓' : number}</i>
        <small>Step {number}</small>
      </span>;
    })}
  </div>;
}

function VerifyBadge({ code }) {
  if (!code) return null;
  return <div className="ldt-verify" role="status"><ToolGlyph name="shieldAlert" size={16}/><span>Check both screens show <b>{code}</b> — this confirms the same pairing session. It is <em>not</em> the code to paste.</span></div>;
}

function PasteCodePanel({ label, value, onChange, onSubmit, submitLabel, placeholder, hint }) {
  return <div className="ldt-paste">
    {hint && <p className="ldt-paste-hint">{hint}</p>}
    <label className="ldt-paste-label">{label}</label>
    <textarea aria-label={label} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} rows={4}/>
    <button className="button primary" onClick={onSubmit} disabled={!value.trim()}>{submitLabel}</button>
  </div>;
}

export default function LocalDeviceTransferTool() {
  const [phase, setPhase] = useState(routeOffer() ? 'joining' : 'idle');
  const [status, setStatus] = useState(routeOffer() ? 'Reading the first QR…' : 'Ready to pair');
  const [error, setError] = useState('');
  const [offerLink, setOfferLink] = useState('');
  const [offerCode, setOfferCode] = useState('');
  const [answerCode, setAnswerCode] = useState('');
  const [manualOffer, setManualOffer] = useState('');
  const [manualAnswer, setManualAnswer] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [text, setText] = useState('');
  const [receivedTexts, setReceivedTexts] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [incomingFiles, setIncomingFiles] = useState([]);
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [transfer, setTransfer] = useState(null);
  const [activity, setActivity] = useState('');
  const [copied, setCopied] = useState('');
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const phaseRef = useRef(phase);
  const sessionRef = useRef('');
  const pendingFilesRef = useRef(new Map());
  const receivingRef = useRef(null);
  const receivedUrlsRef = useRef([]);

  const setFailure = message => { setError(message); setStatus('Connection needs attention'); };
  phaseRef.current = phase;
  const pairingPhases = new Set(['creating', 'offer', 'joining', 'return']);
  const sendJson = value => {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== 'open') throw new Error('The devices are not connected yet.');
    channel.send(JSON.stringify(value));
  };

  const configurePeer = peer => {
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') { setPhase('connected'); setStatus('Devices connected directly'); setError(''); }
      if (['failed', 'disconnected'].includes(peer.connectionState) && !pairingPhases.has(phaseRef.current)) {
        setFailure('The peer connection was interrupted. Check that both devices are still on the same network.');
      }
      if (peer.connectionState === 'closed') setStatus('Connection closed');
    };
    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === 'failed' && !pairingPhases.has(phaseRef.current)) {
        setFailure('A local connection could not be established. Guest Wi-Fi, a VPN, or router isolation may be blocking device-to-device traffic.');
      }
    };
  };

  const configureChannel = channel => {
    channelRef.current = channel;
    channel.binaryType = 'arraybuffer';
    channel.bufferedAmountLowThreshold = 256 * 1024;
    channel.onopen = () => { setPhase('connected'); setStatus('Devices connected directly'); setError(''); };
    channel.onclose = () => setStatus('Connection closed');
    channel.onerror = () => setFailure('The transfer channel reported an error.');
    channel.onmessage = event => handleChannelMessage(event.data);
  };

  async function createHost() {
    if (!globalThis.RTCPeerConnection) { setFailure('WebRTC is not available in this browser. Try a current version of Chrome, Edge, or Safari.'); return; }
    closeConnection(false);
    try {
      setError(''); setStatus('Preparing the first QR…'); setPhase('creating');
      const sessionId = createTransferId();
      sessionRef.current = sessionId;
      const peer = new RTCPeerConnection({ iceServers: [] });
      peerRef.current = peer; configurePeer(peer);
      configureChannel(peer.createDataChannel('surrendasoft-local-transfer', { ordered: true }));
      await peer.setLocalDescription(await peer.createOffer());
      await waitForIceGathering(peer);
      const signal = { type: 'offer', sdp: peer.localDescription.sdp, sessionId };
      const encoded = await encodeLocalSignal(signal);
      setOfferCode(encoded);
      setOfferLink(buildJoinUrl(encoded));
      setVerifyCode(connectionCode(signal));
      setPhase('offer'); setStatus('Show this QR on the other device, then paste their return code');
    } catch (createError) { setFailure(createError.message || 'The connection QR could not be created.'); }
  }

  async function createReceiver(input) {
    if (!globalThis.RTCPeerConnection) { setFailure('WebRTC is not available in this browser. Try a current version of Chrome, Edge, or Safari.'); return; }
    closeConnection(false);
    try {
      setError(''); setPhase('joining'); setStatus('Creating the return handshake…');
      const signal = await decodeLocalSignal(input);
      if (signal.type !== 'offer') throw new Error('This is not a connection offer. Scan the first QR from the other device.');
      sessionRef.current = signal.sessionId;
      const peer = new RTCPeerConnection({ iceServers: [] });
      peerRef.current = peer; configurePeer(peer);
      peer.ondatachannel = event => configureChannel(event.channel);
      await peer.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
      await peer.setLocalDescription(await peer.createAnswer());
      await waitForIceGathering(peer);
      const answer = { type: 'answer', sdp: peer.localDescription.sdp, sessionId: signal.sessionId };
      setAnswerCode(await encodeLocalSignal(answer));
      setVerifyCode(connectionCode(signal));
      setPhase('return'); setStatus('Send this return code to the other device');
    } catch (joinError) { setFailure(joinError.message || 'The first QR could not be read.'); setPhase('manual'); }
  }

  async function applyAnswer(input) {
    try {
      setError(''); setStatus('Completing the direct connection…');
      const trimmed = extractLocalSignal(input);
      if (/^\d{4,8}$/.test(trimmed)) {
        throw new Error(`That looks like the verification code (${trimmed}), not the return connection code. On the other device, tap “Copy return code” and paste the long sslt1… string here.`);
      }
      const signal = await decodeLocalSignal(input);
      if (signal.type !== 'answer') throw new Error('This is not a return answer. Scan or paste the code from the other device.');
      if (!peerRef.current) throw new Error('Create a new pairing QR before applying the return answer.');
      if (sessionRef.current && signal.sessionId !== sessionRef.current) throw new Error('That return QR belongs to a different pairing session.');
      await peerRef.current.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
      setStatus('Connecting over the local network…');
    } catch (answerError) { setFailure(answerError.message || 'The return QR could not be applied.'); }
  }

  async function handleChannelMessage(data) {
    if (typeof data !== 'string') {
      const current = receivingRef.current;
      if (!current) return;
      const buffer = data instanceof ArrayBuffer ? data : await data.arrayBuffer();
      current.chunks.push(buffer); current.received += buffer.byteLength;
      setTransfer({ direction: 'Receiving', name: current.name, done: current.received, total: current.size });
      return;
    }
    let message;
    try { message = JSON.parse(data); } catch { return; }
    if (message.type === 'text') {
      setReceivedTexts(current => [{ id: message.id, text: message.text, receivedAt: new Date().toISOString() }, ...current]);
      setActivity('Text received');
    }
    if (message.type === 'file-offer') setIncomingFiles(current => current.some(file => file.id === message.id) ? current : [...current, message]);
    if (message.type === 'file-accept') {
      const file = pendingFilesRef.current.get(message.id);
      if (file) sendFileBytes(file, message.id);
    }
    if (message.type === 'file-decline') {
      pendingFilesRef.current.delete(message.id); setTransfer(null); setActivity(`${message.name || 'File'} was declined.`);
    }
    if (message.type === 'file-start') {
      receivingRef.current = { ...message, chunks: [], received: 0 };
      setTransfer({ direction: 'Receiving', name: message.name, done: 0, total: message.size });
    }
    if (message.type === 'file-end') await finishReceivedFile(message);
  }

  async function sendFileBytes(file, id) {
    try {
      const channel = channelRef.current;
      if (!channel || channel.readyState !== 'open') throw new Error('The devices disconnected before the file transfer started.');
      const bytes = await file.arrayBuffer();
      const hash = await sha256Hex(bytes);
      channel.send(JSON.stringify({ type: 'file-start', id, name: file.name, mime: file.type || 'application/octet-stream', size: file.size, hash }));
      for (let offset = 0; offset < bytes.byteLength; offset += LOCAL_TRANSFER_CHUNK_SIZE) {
        while (channel.bufferedAmount > 1024 * 1024) await new Promise(resolve => setTimeout(resolve, 20));
        const chunk = bytes.slice(offset, Math.min(offset + LOCAL_TRANSFER_CHUNK_SIZE, bytes.byteLength));
        channel.send(chunk);
        setTransfer({ direction: 'Sending', name: file.name, done: offset + chunk.byteLength, total: file.size });
      }
      channel.send(JSON.stringify({ type: 'file-end', id }));
      pendingFilesRef.current.delete(id); setActivity(`${file.name} sent successfully.`);
    } catch (sendError) { setFailure(sendError.message); }
  }

  async function finishReceivedFile(message) {
    const current = receivingRef.current;
    if (!current || current.id !== message.id) return;
    const blob = new Blob(current.chunks, { type: current.mime });
    const bytes = await blob.arrayBuffer();
    const actualHash = await sha256Hex(bytes);
    const verified = Boolean(current.hash && actualHash && current.hash === actualHash);
    const url = URL.createObjectURL(blob); receivedUrlsRef.current.push(url);
    setReceivedFiles(files => [{ id: current.id, name: safeFileName(current.name), size: blob.size, type: current.mime, url, verified, hashAvailable: Boolean(current.hash && actualHash) }, ...files]);
    receivingRef.current = null; setTransfer(null); setActivity(`${current.name} received successfully.`);
  }

  const sendText = () => {
    const value = text.trim();
    if (!value) return;
    if (value.length > LOCAL_TRANSFER_TEXT_LIMIT) { setError(`Keep text under ${LOCAL_TRANSFER_TEXT_LIMIT.toLocaleString()} characters.`); return; }
    try { sendJson({ type: 'text', id: createTransferId(), text: value }); setText(''); setActivity('Text sent successfully.'); setError(''); }
    catch (sendError) { setFailure(sendError.message); }
  };

  const offerFile = () => {
    if (!selectedFile) return;
    if (selectedFile.size > LOCAL_TRANSFER_FILE_LIMIT) { setError(`Choose a file smaller than ${formatBytes(LOCAL_TRANSFER_FILE_LIMIT)}.`); return; }
    try {
      const id = createTransferId(); pendingFilesRef.current.set(id, selectedFile);
      sendJson({ type: 'file-offer', id, name: selectedFile.name, size: selectedFile.size, mime: selectedFile.type || 'application/octet-stream' });
      setTransfer({ direction: 'Waiting for approval', name: selectedFile.name, done: 0, total: selectedFile.size });
      setSelectedFile(null); setError('');
    } catch (sendError) { setFailure(sendError.message); }
  };

  const acceptFile = file => {
    try { sendJson({ type: 'file-accept', id: file.id }); setIncomingFiles(files => files.filter(item => item.id !== file.id)); setActivity(`Receiving ${file.name}…`); }
    catch (acceptError) { setFailure(acceptError.message); }
  };
  const declineFile = file => {
    try { sendJson({ type: 'file-decline', id: file.id, name: file.name }); setIncomingFiles(files => files.filter(item => item.id !== file.id)); }
    catch (declineError) { setFailure(declineError.message); }
  };

  const copy = async (value, key) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        const field = document.createElement('textarea'); field.value = value; field.style.position = 'fixed'; field.style.opacity = '0'; document.body.appendChild(field); field.select(); document.execCommand('copy'); field.remove();
      }
      setCopied(key); window.setTimeout(() => setCopied(''), 1400);
    } catch { setError('Clipboard access is blocked here. Select and copy the connection code shown below.'); }
  };
  const closeConnection = (reset = true) => {
    channelRef.current?.close(); peerRef.current?.close();
    channelRef.current = null; peerRef.current = null; sessionRef.current = ''; pendingFilesRef.current.clear(); receivingRef.current = null;
    if (reset) { setPhase('idle'); setStatus('Ready to pair'); setOfferLink(''); setOfferCode(''); setAnswerCode(''); setVerifyCode(''); setError(''); window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#localtransfer`); }
  };

  useEffect(() => {
    const code = routeOffer();
    const timer = code ? window.setTimeout(() => createReceiver(code), 0) : null;
    return () => {
      if (timer) clearTimeout(timer);
      channelRef.current?.close(); peerRef.current?.close();
      receivedUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const progress = transfer?.total ? Math.min(100, Math.round((transfer.done / transfer.total) * 100)) : 0;
  const pairingStep = phase === 'offer' ? 1 : phase === 'return' || phase === 'joining' ? 2 : 0;
  return <div className="ldt-root">
    <div className="ldt-local"><ToolGlyph name="swap" size={22}/><div><strong>Direct browser-to-browser transfer</strong><span>No account, cloud file storage, or transfer-content upload.</span></div></div>
    <div className="ldt-status" data-phase={phase}><span className="ldt-status-dot"/><div><strong>{status}</strong>{verifyCode && pairingStep === 0 && <small>Pairing verification code: <b>{verifyCode}</b></small>}</div></div>
    {error && <p className="ldt-error" role="alert"><ToolGlyph name="warning" size={17}/>{error}</p>}
    {pairingStep > 0 && <StepProgress step={pairingStep}/>}

    {phase === 'idle' && <section className="ldt-start">
      <div className="ldt-intro"><ToolGlyph name="swap" size={38}/><h2>Connect two devices</h2><p>Pair over QR codes on the same Wi‑Fi. Either device can send files once connected.</p></div>
      <ol className="ldt-how">
        <li><strong>This device</strong> shows a connection QR, or <strong>the other device</strong> scans it.</li>
        <li>The scanning device copies a return code back.</li>
        <li>Paste the return code here to finish — both devices can then transfer.</li>
      </ol>
      <div className="ldt-start-actions">
        <button className="button primary ldt-show-qr" onClick={createHost}><ToolGlyph name="monitor" size={20}/> Show connection QR</button>
        <p className="ldt-start-divider"><span>on the other device</span></p>
      </div>
      <SignalScanner onSignal={createReceiver} scanLabel="Open camera to scan" idleHint="Point at the connection QR on the other screen" videoLabel="Pairing QR scanner camera" uploadHint="Upload QR photo"/>
      <details className="ldt-manual"><summary>Paste a connection code instead</summary>
        <PasteCodePanel label="First connection code" value={manualOffer} onChange={setManualOffer} onSubmit={() => createReceiver(manualOffer)} submitLabel="Continue to return step" placeholder="Paste the sslt1… code from the other device" hint="Paste the full sslt1… code or use the camera scanner. Pairing links often fail on mobile — prefer the raw code or QR scan."/>
      </details>
    </section>}

    {phase === 'creating' && <section className="ldt-wait" role="status"><ToolGlyph name="refresh" size={28}/><strong>Gathering local connection details…</strong><span>This can take a few seconds. Keep this page open.</span></section>}

    {phase === 'offer' && <section className="ldt-pairing">
      <VerifyBadge code={verifyCode}/>
      <div className="ldt-step-head"><span>1</span><div><strong>Show this to the other device</strong><small>They open this tool and tap “Open camera to scan”. Tap a part number below to jump — e.g. part 10 if they missed it.</small></div></div>
      <QrChunkPager value={offerCode} peer={peerRef.current} roleLabel="First connection QR"/>
      <div className="ldt-pair-actions">
        <button className="button secondary" onClick={() => copy(offerCode, 'offer-code')}><Icon name={copied === 'offer-code' ? 'check' : 'copy'} size={17}/>{copied === 'offer-code' ? 'Copied code' : 'Copy connection code'}</button>
        <button className="button secondary" onClick={() => copy(offerLink, 'offer-link')}><Icon name={copied === 'offer-link' ? 'check' : 'copy'} size={17}/>{copied === 'offer-link' ? 'Copied link' : 'Copy pairing link'}</button>
      </div>

      <div className="ldt-step-head second recommended"><span>2</span><div><strong>Paste what they send back</strong><small>On the other device, tap “Copy return code”, then paste the full sslt1… string here — not the 6-digit verification number.</small></div></div>
      <PasteCodePanel label="Return connection code" value={manualAnswer} onChange={setManualAnswer} onSubmit={() => applyAnswer(manualAnswer)} submitLabel="Complete connection" placeholder="Paste the long sslt1… code (not the 6-digit verification number)" hint="Paste the entire return code in one go with no line breaks."/>
      <details className="ldt-manual alt"><summary>Or scan their return QR with this camera</summary>
        <p className="ldt-alt-note">Works best with a good rear camera. Paste is usually more reliable on laptops.</p>
        <SignalScanner onSignal={applyAnswer} scanLabel="Scan return QR" idleHint="Point at the return QR on the other device" videoLabel="Return QR scanner camera" uploadHint="Upload return QR photo"/>
      </details>
    </section>}

    {(phase === 'joining' || phase === 'manual') && <section className="ldt-wait" role="status"><ToolGlyph name="refresh" size={28}/><strong>{phase === 'joining' ? 'Creating the return handshake…' : 'The connection code needs attention'}</strong><span>{phase === 'joining' ? 'Keep this page open while the browser gathers local connection details.' : 'Return to the start and paste a valid connection code.'}</span>{phase === 'manual' && <button className="button secondary" onClick={() => closeConnection()}>Start again</button>}</section>}

    {phase === 'return' && <section className="ldt-pairing">
      <VerifyBadge code={verifyCode}/>
      <div className="ldt-step-head"><span>2</span><div><strong>Send this to the other device</strong><small>Tap “Copy return code”, switch to the other device, and paste it there. If they’re still scanning, tap a part number below to show the one they need.</small></div></div>
      <div className="ldt-copy-primary"><button className="button primary" onClick={() => copy(answerCode, 'answer')}><Icon name={copied === 'answer' ? 'check' : 'copy'} size={18}/>{copied === 'answer' ? 'Return code copied — paste on other device' : 'Copy return code'}</button></div>
      <QrChunkPager value={answerCode} peer={peerRef.current} roleLabel="Return connection QR"/>
      <details className="ldt-manual"><summary>Show raw return code</summary><textarea className="ldt-signal-code" aria-label="Return connection code" readOnly value={answerCode}/></details>
      <div className="ldt-one-qr success"><ToolGlyph name="shieldAlert" size={18}/><p><strong>Connection data only — not your files.</strong> Once the other device pastes this code, transfers use an encrypted WebRTC channel between the two browsers.</p></div>
    </section>}

    {phase === 'connected' && <section className="ldt-connected">
      <div className="ldt-connected-head"><div><ToolGlyph name="check" size={22}/><span><strong>Connected</strong><small>Verification code {verifyCode} · Keep both pages open</small></span></div><button onClick={() => closeConnection()}>Disconnect</button></div>
      <div className="ldt-transfer-grid">
        <article className="ldt-panel"><div className="ldt-panel-title"><ToolGlyph name="text" size={20}/><div><strong>Send text</strong><small>Notes, links, addresses, or longer text.</small></div></div><textarea aria-label="Text to send to connected device" value={text} onChange={event => setText(event.target.value)} maxLength={LOCAL_TRANSFER_TEXT_LIMIT} rows="6" placeholder="Type or paste text…"/><div className="ldt-count">{text.length.toLocaleString()} / {LOCAL_TRANSFER_TEXT_LIMIT.toLocaleString()}</div><button className="button primary" onClick={sendText} disabled={!text.trim()}><ToolGlyph name="arrowRight" size={17}/> Send text</button></article>
        <article className="ldt-panel"><div className="ldt-panel-title"><ToolGlyph name="fileText" size={20}/><div><strong>Send a file</strong><small>The other device must approve it first.</small></div></div><label className="ldt-file"><input type="file" aria-label="Choose file to send" onChange={event => setSelectedFile(event.target.files?.[0] || null)}/><ToolGlyph name="folder" size={30}/><strong>{selectedFile?.name || 'Choose a file'}</strong><span>{selectedFile ? formatBytes(selectedFile.size) : `Up to ${formatBytes(LOCAL_TRANSFER_FILE_LIMIT)}`}</span></label><button className="button primary" onClick={offerFile} disabled={!selectedFile}><ToolGlyph name="arrowRight" size={17}/> Ask to send file</button></article>
      </div>
      {incomingFiles.map(file => <div className="ldt-incoming" key={file.id}><ToolGlyph name="download" size={23}/><div><strong>{file.name}</strong><span>{formatBytes(file.size)} · {file.mime}</span></div><button className="button primary compact" onClick={() => acceptFile(file)}>Accept</button><button className="button secondary compact" onClick={() => declineFile(file)}>Decline</button></div>)}
      {transfer && <div className="ldt-progress"><div><strong>{transfer.direction}: {transfer.name}</strong><span>{transfer.done ? `${formatBytes(transfer.done)} of ${formatBytes(transfer.total)}` : 'Waiting for the other device'}</span></div><div className="ldt-progress-track"><i style={{ width: `${progress}%` }}/></div></div>}
      {activity && <p className="ldt-activity"><ToolGlyph name="check" size={16}/>{activity}</p>}
      {(receivedTexts.length > 0 || receivedFiles.length > 0) && <div className="ldt-received"><h3>Received on this device</h3>{receivedTexts.map(item => <article key={item.id}><div><ToolGlyph name="text" size={18}/><strong>Received text</strong></div><pre>{item.text}</pre><button onClick={() => copy(item.text, item.id)}><Icon name={copied === item.id ? 'check' : 'copy'} size={16}/>{copied === item.id ? 'Copied' : 'Copy text'}</button></article>)}{receivedFiles.map(file => <article key={file.id}><div><ToolGlyph name="fileText" size={18}/><strong>{file.name}</strong><span>{formatBytes(file.size)} · {file.hashAvailable ? file.verified ? 'SHA-256 verified' : 'Integrity check failed' : 'Received'}</span></div><a className="button secondary compact" href={file.url} download={file.name}><ToolGlyph name="download" size={16}/> Download</a></article>)}</div>}
    </section>}

    <div className="ldt-privacy"><Icon name="shield" size={19}/><p><strong>Local-first and encrypted in transit.</strong> Pairing data is exchanged through QR codes. Transfer contents travel through WebRTC and are not uploaded or stored by SurrendaSoft. Guest Wi-Fi, VPNs, and router client isolation can block local connections.</p></div>
  </div>;
}

const QR_CYCLE_INTERVAL_MS = 1800;
const AUTO_CYCLE_RESUME_MS = 8000;
const SWIPE_THRESHOLD_PX = 40;

export function QrChunkPager({ value, peer, roleLabel = 'Connection QR', showAutoCycle = true }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const touchStartRef = useRef(null);
  const [chunks, setChunks] = useState([]);
  const [index, setIndex] = useState(0);
  const [autoCycle, setAutoCycle] = useState(true);
  const [stopped, setStopped] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setIndex(0); setAutoCycle(true); setStopped(false); setError('');
    if (!value) { setChunks([]); return; }
    try { setChunks(splitIntoQrChunks(value)); }
    catch { setChunks([]); setError('This connection QR could not be prepared.'); }
  }, [value]);

  useEffect(() => () => { if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current); }, []);

  useEffect(() => {
    if (!peer) return undefined;
    const checkConnected = () => { if (peer.connectionState === 'connected') setStopped(true); };
    checkConnected();
    peer.addEventListener?.('connectionstatechange', checkConnected);
    return () => peer.removeEventListener?.('connectionstatechange', checkConnected);
  }, [peer]);

  useEffect(() => {
    if (stopped || !autoCycle || chunks.length <= 1) return undefined;
    const timer = window.setInterval(() => setIndex(current => (current + 1) % chunks.length), QR_CYCLE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [chunks, stopped, autoCycle]);

  const selectPart = (partIndex, manual = true) => {
    const next = Math.max(0, Math.min(partIndex, chunks.length - 1));
    setIndex(next);
    if (manual && showAutoCycle) {
      setAutoCycle(false);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = window.setTimeout(() => setAutoCycle(true), AUTO_CYCLE_RESUME_MS);
    }
  };

  const toggleAutoCycle = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    setAutoCycle(current => !current);
  };

  const handleTouchStart = event => { touchStartRef.current = event.changedTouches[0]?.clientX ?? null; };
  const handleTouchEnd = event => {
    const start = touchStartRef.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartRef.current = null;
    if (start == null || end == null) return;
    const delta = end - start;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    selectPart(delta < 0 ? index + 1 : index - 1);
  };

  const current = chunks[index] || '';
  useEffect(() => {
    if (!current || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, current, { width: QR_CHUNK_DISPLAY_PX, margin: 2, errorCorrectionLevel: 'Q', color: { dark: '#10183e', light: '#ffffff' } }, qrError => setError(qrError ? 'This connection QR could not be drawn.' : ''));
  }, [current]);

  return <div className="ldt-qr-display">
    <div className="ldt-qr-pager-controls">
      {chunks.length > 1 && !stopped && <button type="button" className="ldt-qr-nav" onClick={() => selectPart(index - 1)} disabled={index <= 0} aria-label="Previous QR part"><Icon name="arrow" size={18}/></button>}
      <div
        ref={frameRef}
        className="ldt-qr-frame"
        aria-label={roleLabel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {error ? <p className="ldt-error">{error}</p> : <>
          <canvas ref={canvasRef}/>
          <span className="ldt-qr-corner tl" aria-hidden="true"/><span className="ldt-qr-corner tr" aria-hidden="true"/>
          <span className="ldt-qr-corner bl" aria-hidden="true"/><span className="ldt-qr-corner br" aria-hidden="true"/>
        </>}
      </div>
      {chunks.length > 1 && !stopped && <button type="button" className="ldt-qr-nav next" onClick={() => selectPart(index + 1)} disabled={index >= chunks.length - 1} aria-label="Next QR part"><Icon name="arrow" size={18}/></button>}
    </div>
    {!error && chunks.length > 1 && !stopped && <>
      <div className="ldt-chunk-pager" role="tablist" aria-label={`Connection QR parts, showing part ${index + 1} of ${chunks.length}`}>
        {chunks.map((_, part) => <button
          key={part}
          type="button"
          role="tab"
          aria-selected={part === index}
          aria-label={`Show part ${part + 1}`}
          className={`ldt-chunk-part${part === index ? ' current' : ''}`}
          onClick={() => selectPart(part)}
        >{part + 1}</button>)}
      </div>
      {showAutoCycle && <button type="button" className={`ldt-auto-cycle${autoCycle ? ' active' : ''}`} onClick={toggleAutoCycle}>
        {autoCycle ? 'Auto-cycling on' : 'Paused — tap to resume auto-cycle'}
      </button>}
      <p className="ldt-qr-caption">Part {index + 1} of {chunks.length} · tap a number to jump · swipe the QR left or right</p>
    </>}
    {!error && chunks.length <= 1 && !stopped && <p className="ldt-qr-caption">Hold the other device’s camera steady on this code</p>}
    {!error && stopped && <p className="ldt-qr-caption success"><ToolGlyph name="check" size={13}/> Connected — you can stop showing this QR</p>}
  </div>;
}

// Tuning for the live scan-quality overlay. jsQR only reports a location on frames it
// fully decodes, so "orange" is an approximation based on recency/position of the last
// successful decode rather than true continuous tracking — still gives the intended
// "hold steady" coaching feel without over-promising a capability jsQR doesn't expose.
const QR_QUALITY_RECENT_MS = 1500;
const QR_QUALITY_STEADY_MS = 800;
const QR_QUALITY_MOVE_RATIO = 0.12;
const emptyChunkState = () => ({ sessionId: '', total: 0, compressed: '0', map: new Map() });

export function SignalScanner({
  onSignal,
  scanLabel = 'Scan return QR',
  idleHint = 'Scan the return QR from this device',
  videoLabel = 'Return QR scanner camera',
  uploadHint = 'Upload QR image',
}) {
  const videoRef = useRef(null), canvasRef = useRef(null), overlayRef = useRef(null);
  const streamRef = useRef(null), frameRef = useRef(null);
  const [active, setActive] = useState(false), [error, setError] = useState('');
  const [quality, setQuality] = useState('searching');
  const [progress, setProgress] = useState(null);
  const chunkStateRef = useRef(emptyChunkState());
  const lastDetectionRef = useRef(null);
  const lastGoodRef = useRef(null);
  const qualityRef = useRef('searching');

  const resetScan = () => { chunkStateRef.current = emptyChunkState(); setProgress(null); lastDetectionRef.current = null; lastGoodRef.current = null; qualityRef.current = 'searching'; setQuality('searching'); };
  const stop = () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; setActive(false); };
  const finish = value => { stop(); setError(''); resetScan(); onSignal(value); };

  const ingestChunkText = text => {
    let parsed;
    try { parsed = decodeQrChunk(text); } catch {
      const direct = extractLocalSignal(text);
      if (direct.startsWith(`${LOCAL_TRANSFER_SIGNAL_PREFIX}.`)) { finish(direct); return true; }
      return false;
    }
    const state = chunkStateRef.current;
    if (state.sessionId && state.sessionId !== parsed.sessionId) state.map = new Map();
    state.sessionId = parsed.sessionId; state.total = parsed.total; state.compressed = parsed.compressed;
    state.map.set(parsed.index, parsed.data);
    setProgress({ total: state.total, captured: new Set(state.map.keys()), current: parsed.index });
    if (state.map.size >= state.total) {
      try {
        finish(assembleQrChunks(state.map, state.total, state.compressed));
      } catch (assemblyError) {
        setError(assemblyError.message || 'Some QR parts are still missing. Keep scanning until every dot is filled.');
        resetScan();
      }
    }
    return true;
  };

  const setQualityIfChanged = value => { if (qualityRef.current !== value) { qualityRef.current = value; setQuality(value); } };

  const updateOverlay = (location, now) => {
    const overlay = overlayRef.current, video = videoRef.current;
    if (!overlay || !video || !video.videoWidth) return;
    if (overlay.width !== video.clientWidth || overlay.height !== video.clientHeight) { overlay.width = video.clientWidth; overlay.height = video.clientHeight; }
    const ctx = overlay.getContext?.('2d');
    ctx?.clearRect(0, 0, overlay.width, overlay.height);
    if (location) lastDetectionRef.current = { location, timestamp: now };
    const detection = lastDetectionRef.current;
    if (!detection || now - detection.timestamp > QR_QUALITY_RECENT_MS) { setQualityIfChanged('searching'); return; }

    const scaleX = video.clientWidth / video.videoWidth, scaleY = video.clientHeight / video.videoHeight;
    const { topLeftCorner: tl, topRightCorner: tr, bottomLeftCorner: bl, bottomRightCorner: br } = detection.location;
    const xs = [tl.x, tr.x, bl.x, br.x].map(x => x * scaleX), ys = [tl.y, tr.y, bl.y, br.y].map(y => y * scaleY);
    const left = Math.min(...xs), top = Math.min(...ys), width = Math.max(...xs) - left, height = Math.max(...ys) - top;

    let nextQuality;
    if (location) {
      const center = { x: left + width / 2, y: top + height / 2 };
      const previous = lastGoodRef.current;
      const movedRatio = previous ? Math.hypot(center.x - previous.center.x, center.y - previous.center.y) / video.clientWidth : 0;
      nextQuality = previous && now - previous.timestamp <= QR_QUALITY_STEADY_MS && movedRatio < QR_QUALITY_MOVE_RATIO ? 'green' : 'orange';
      lastGoodRef.current = { center, timestamp: now };
    } else {
      nextQuality = 'orange';
    }
    setQualityIfChanged(nextQuality);
    if (ctx) {
      const color = nextQuality === 'green' ? '#0a8b6c' : '#c98a1f';
      ctx.lineWidth = 4; ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12;
      ctx.strokeRect(left, top, width, height);
    }
  };

  const scanFrame = () => {
    if (!streamRef.current) return;
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) { frameRef.current = requestAnimationFrame(scanFrame); return; }
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(video, 0, 0);
    const image = context.getImageData(0, 0, canvas.width, canvas.height), code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
    const now = Date.now();
    updateOverlay(code?.location || null, now);
    if (code?.data) ingestChunkText(code.data);
    if (streamRef.current) frameRef.current = requestAnimationFrame(scanFrame);
  };
  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setError('Camera scanning requires HTTPS in most browsers. Upload a QR photo or paste the code instead.'); return; }
    try {
      setError(''); resetScan();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      setActive(true);
    }
    catch { setError('Camera access was unavailable. Upload a QR photo or paste the code instead.'); stop(); }
  };
  const upload = event => {
    const file = event.target.files?.[0]; if (!file) return;
    const image = new Image(); image.onload = () => { const canvas = canvasRef.current; canvas.width = image.width; canvas.height = image.height; const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0); const pixels = context.getImageData(0, 0, canvas.width, canvas.height); const code = jsQR(pixels.data, pixels.width, pixels.height); URL.revokeObjectURL(image.src); if (code?.data && ingestChunkText(code.data)) setError(''); else setError('No readable connection QR part was found in that image. Try a clearer photo of one cycling part.'); }; image.src = URL.createObjectURL(file);
  };
  useEffect(() => {
    if (!active || !videoRef.current || !streamRef.current) return undefined;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    const beginScanning = async () => {
      try { await video.play(); frameRef.current = requestAnimationFrame(scanFrame); }
      catch { setError('The camera opened but its preview could not start. Try Stop camera, then scan again.'); }
    };
    beginScanning();
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [active]);
  useEffect(() => () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); streamRef.current?.getTracks().forEach(track => track.stop()); }, []);

  const missingParts = progress ? Array.from({ length: progress.total }, (_, part) => part).filter(part => !progress.captured.has(part)) : [];
  const hint = progress && progress.total > 1
    ? (quality === 'green' ? `Reading part ${(progress.current ?? 0) + 1}…` : quality === 'orange' ? 'Hold steady on the QR…' : missingParts.length ? `Still need part${missingParts.length === 1 ? '' : 's'} ${missingParts.map(part => part + 1).join(', ')}` : 'Keep scanning')
    : (quality === 'green' ? 'Reading…' : quality === 'orange' ? 'Hold steady…' : 'Point at the connection QR on the other screen');

  return <div className="ldt-scanner">
    <div className={`ldt-viewfinder${active ? ' active' : ''}`}>
      {active ? <>
        <video ref={videoRef} autoPlay muted playsInline aria-label={videoLabel}/>
        <canvas ref={overlayRef} className="ldt-viewfinder-overlay" aria-hidden="true"/>
        <span className="ldt-viewfinder-corner tl" aria-hidden="true"/><span className="ldt-viewfinder-corner tr" aria-hidden="true"/>
        <span className="ldt-viewfinder-corner bl" aria-hidden="true"/><span className="ldt-viewfinder-corner br" aria-hidden="true"/>
        <span className={`ldt-scan-hint quality-${quality}`}>{hint}</span>
      </> : <><ToolGlyph name="camera" size={40}/><span>{idleHint}</span></>}
      <canvas ref={canvasRef} hidden/>
    </div>
    {progress && progress.total > 1 && <div className="ldt-chunk-progress scanner" role="status" aria-label={`Captured ${progress.captured.size} of ${progress.total} connection QR parts`}>
      {Array.from({ length: progress.total }, (_, part) => <button
        key={part}
        type="button"
        disabled
        className={`ldt-chunk-part status${progress.captured.has(part) ? ' done' : ''}${part === progress.current ? ' current' : ''}`}
        aria-label={`Part ${part + 1}${progress.captured.has(part) ? ', captured' : ', still needed'}`}
      >{part + 1}</button>)}
      <p className="ldt-chunk-label">{progress.captured.size} of {progress.total} parts captured</p>
      {missingParts.length > 0 && <p className="ldt-chunk-missing">
        Still need part{missingParts.length === 1 ? '' : 's'}: <strong>{missingParts.map(part => part + 1).join(', ')}</strong>.
        Ask the other device to tap part {missingParts[missingParts.length - 1] + 1} on their screen.
      </p>}
    </div>}
    <div className="ldt-scanner-actions">{active ? <button className="button secondary" onClick={stop}>Stop camera</button> : <button className="button primary" onClick={start}><ToolGlyph name="camera" size={17}/> {scanLabel}</button>}<label className="button secondary"><ToolGlyph name="image" size={17}/> {uploadHint}<input type="file" accept="image/*" onChange={upload}/></label></div>
    {error && <p className="ldt-error">{error}</p>}
  </div>;
}
