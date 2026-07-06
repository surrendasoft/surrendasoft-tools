import { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
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

export const readPeerRoute = (hash = window.location.hash) => {
  const match = String(hash).match(/^#localtransfer\/peer\/([^/]+)\/([^/]+)$/);
  return match ? { peerId: decodeURIComponent(match[1]), token: decodeURIComponent(match[2]) } : null;
};

export const buildPeerJoinUrl = (peerId, token) => `${window.location.origin}${window.location.pathname}${window.location.search}#localtransfer/peer/${encodeURIComponent(peerId)}/${encodeURIComponent(token)}`;

export default function LocalDeviceTransferTool() {
  const peerRoute = readPeerRoute();
  const [phase, setPhase] = useState(peerRoute ? 'cloud-joining' : routeOffer() ? 'joining' : 'idle');
  const [status, setStatus] = useState(peerRoute ? 'Joining the one-QR session…' : routeOffer() ? 'Reading the first QR…' : 'Ready to pair');
  const [error, setError] = useState('');
  const [offerLink, setOfferLink] = useState('');
  const [easyLink, setEasyLink] = useState('');
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
  const signallingPeerRef = useRef(null);
  const signallingTimerRef = useRef(null);
  const channelRef = useRef(null);
  const sessionRef = useRef('');
  const pendingFilesRef = useRef(new Map());
  const receivingRef = useRef(null);
  const receivedUrlsRef = useRef([]);

  const setFailure = message => { setError(message); setStatus('Connection needs attention'); };
  const sendJson = value => {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== 'open') throw new Error('The devices are not connected yet.');
    channel.send(JSON.stringify(value));
  };

  const configurePeer = peer => {
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') { setPhase('connected'); setStatus('Devices connected directly'); setError(''); }
      if (['failed', 'disconnected'].includes(peer.connectionState)) setFailure('The peer connection was interrupted. Check that both devices are still on the same network.');
      if (peer.connectionState === 'closed') setStatus('Connection closed');
    };
    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === 'failed') setFailure('A local connection could not be established. Guest Wi-Fi, a VPN, or router isolation may be blocking device-to-device traffic.');
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

  const configurePeerJsConnection = connection => {
    const channel = {
      get readyState() { return connection.open ? 'open' : 'connecting'; },
      get bufferedAmount() { return connection.dataChannel?.bufferedAmount || 0; },
      set bufferedAmountLowThreshold(value) { if (connection.dataChannel) connection.dataChannel.bufferedAmountLowThreshold = value; },
      send: value => connection.send(value),
      close: () => connection.close(),
    };
    channelRef.current = channel;
    connection.on('open', () => { clearTimeout(signallingTimerRef.current); setPhase('connected'); setStatus('Devices connected directly'); setError(''); });
    connection.on('data', data => handleChannelMessage(data));
    connection.on('close', () => setStatus('Connection closed'));
    connection.on('error', () => setFailure('The peer-to-peer transfer channel reported an error. Try creating a new session.'));
  };

  const handlePeerServiceError = serviceError => {
    clearTimeout(signallingTimerRef.current);
    const unavailable = serviceError?.type === 'peer-unavailable';
    setFailure(unavailable
      ? 'That one-QR session is no longer available. Ask the first device to create a new QR.'
      : 'The third-party pairing service could not connect the devices. Check your internet connection or use the advanced private fallback.');
  };

  function createEasyHost() {
    closeConnection(false);
    setError(''); setStatus('Creating a one-QR session…'); setPhase('cloud-creating');
    const token = createTransferId();
    sessionRef.current = token;
    setVerifyCode(connectionCode({ sessionId: token }));
    const peer = new Peer();
    signallingPeerRef.current = peer;
    signallingTimerRef.current = window.setTimeout(() => handlePeerServiceError({ type: 'network' }), 15000);
    peer.on('open', peerId => {
      clearTimeout(signallingTimerRef.current);
      setEasyLink(buildPeerJoinUrl(peerId, token));
      setPhase('cloud-host'); setStatus('Waiting for the other device to scan');
    });
    peer.on('connection', connection => {
      if (connection.metadata?.token !== token) { connection.close(); return; }
      configurePeerJsConnection(connection);
      setStatus('Connecting the devices…');
    });
    peer.on('error', handlePeerServiceError);
    peer.on('disconnected', () => { if (phase !== 'connected') setStatus('Reconnecting to the pairing service…'); });
  }

  function joinEasySession({ peerId, token }) {
    closeConnection(false);
    setError(''); setStatus('Joining the one-QR session…'); setPhase('cloud-joining');
    sessionRef.current = token;
    setVerifyCode(connectionCode({ sessionId: token }));
    const peer = new Peer();
    signallingPeerRef.current = peer;
    signallingTimerRef.current = window.setTimeout(() => handlePeerServiceError({ type: 'network' }), 15000);
    peer.on('open', () => {
      const connection = peer.connect(peerId, { reliable: true, serialization: 'binary', metadata: { token } });
      configurePeerJsConnection(connection);
      setStatus('Connecting directly to the first device…');
    });
    peer.on('error', handlePeerServiceError);
  }

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
      setPhase('offer'); setStatus('Waiting for the receiving device');
    } catch (createError) { setFailure(createError.message || 'The connection QR could not be created.'); }
  }

  async function createReceiver(input) {
    if (!globalThis.RTCPeerConnection) { setFailure('WebRTC is not available in this browser. Try a current version of Chrome, Edge, or Safari.'); return; }
    closeConnection(false);
    try {
      setError(''); setPhase('joining'); setStatus('Creating the return handshake…');
      const signal = await decodeLocalSignal(input);
      if (signal.type !== 'offer') throw new Error('This is not a connection offer. Scan the first QR from the sending device.');
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
      setPhase('return'); setStatus('Return this answer to the first device');
    } catch (joinError) { setFailure(joinError.message || 'The first QR could not be read.'); setPhase('manual'); }
  }

  async function applyAnswer(input) {
    try {
      setError(''); setStatus('Completing the direct connection…');
      const signal = await decodeLocalSignal(input);
      if (signal.type !== 'answer') throw new Error('This is not a return answer. Scan the QR shown on the receiving device.');
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
    clearTimeout(signallingTimerRef.current);
    channelRef.current?.close(); peerRef.current?.close();
    signallingPeerRef.current?.destroy();
    channelRef.current = null; peerRef.current = null; signallingPeerRef.current = null; sessionRef.current = ''; pendingFilesRef.current.clear(); receivingRef.current = null;
    if (reset) { setPhase('idle'); setStatus('Ready to pair'); setEasyLink(''); setOfferLink(''); setOfferCode(''); setAnswerCode(''); setVerifyCode(''); setError(''); window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#localtransfer`); }
  };

  useEffect(() => {
    const easy = readPeerRoute();
    const code = routeOffer();
    const timer = easy
      ? window.setTimeout(() => joinEasySession(easy), 0)
      : code ? window.setTimeout(() => createReceiver(code), 0) : null;
    return () => {
      if (timer) clearTimeout(timer);
      clearTimeout(signallingTimerRef.current);
      channelRef.current?.close(); peerRef.current?.close();
      signallingPeerRef.current?.destroy();
      receivedUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const progress = transfer?.total ? Math.min(100, Math.round((transfer.done / transfer.total) * 100)) : 0;
  return <div className="ldt-root">
    <div className="ldt-local"><ToolGlyph name="swap" size={22}/><div><strong>One QR, then direct browser-to-browser transfer</strong><span>PeerJS Cloud introduces the browsers. Your text and files are not uploaded to it.</span></div></div>
    <div className="ldt-status" data-phase={phase}><span className="ldt-status-dot"/><div><strong>{status}</strong>{verifyCode && <small>Pairing verification code: <b>{verifyCode}</b></small>}</div></div>
    {error && <p className="ldt-error" role="alert"><ToolGlyph name="warning" size={17}/>{error}</p>}

    {phase === 'idle' && <section className="ldt-start">
      <div className="ldt-intro"><ToolGlyph name="monitor" size={38}/><h2>Connect two devices</h2><p>Create one QR here, then scan it with the other device’s normal camera. The receiving page opens and connects automatically.</p></div>
      <button className="ldt-start-card ldt-easy-start" onClick={createEasyHost}><span><ToolGlyph name="qr" size={24}/></span><div><strong>Create one-QR session</strong><small>Recommended · simplest setup · no return scan</small></div><Icon name="arrow" size={18}/></button>
      <p className="ldt-provider-note"><ToolGlyph name="globe" size={16}/><span><strong>Uses PeerJS Cloud for pairing only.</strong> The service sees temporary connection identifiers, not the text or files you transfer.</span></p>
      <details className="ldt-advanced"><summary>Advanced: pair without a third-party signalling service</summary><p>This older method keeps signalling inside QR codes, but it requires the animated offer and return scans.</p><button className="button secondary" onClick={createHost}><ToolGlyph name="qr" size={17}/> Create private two-QR session</button><SignalScanner onSignal={createReceiver} scanLabel="Scan private pairing QR" idleHint="Point this camera at the animated QR on the other device" videoLabel="Private pairing QR scanner camera" uploadHint="Upload private pairing QR"/><details className="ldt-manual"><summary>Join with a copied connection code</summary><textarea aria-label="First device connection code" value={manualOffer} onChange={event => setManualOffer(event.target.value)} placeholder="Paste the first device’s connection code"/><button className="button primary" onClick={() => createReceiver(manualOffer)} disabled={!manualOffer.trim()}>Create return QR</button></details></details>
    </section>}

    {(phase === 'cloud-creating' || phase === 'cloud-joining') && <section className="ldt-wait" role="status"><ToolGlyph name="refresh" size={28}/><strong>{phase === 'cloud-creating' ? 'Creating your one-QR session…' : 'Connecting to the first device…'}</strong><span>PeerJS Cloud is exchanging temporary WebRTC connection details.</span></section>}

    {phase === 'cloud-host' && <section className="ldt-pairing ldt-easy-pairing">
      <div className="ldt-step-head"><span>1</span><div><strong>Scan once with the other device</strong><small>Use its normal Camera app. The link opens this tool and connects automatically—there is no return QR.</small></div></div>
      <SimpleQrDisplay value={easyLink}/>
      <textarea className="ldt-signal-code" aria-label="One-QR session link" readOnly value={easyLink}/>
      <div className="ldt-pair-actions"><button className="button secondary" onClick={() => copy(easyLink, 'easy')}><Icon name={copied === 'easy' ? 'check' : 'copy'} size={17}/>{copied === 'easy' ? 'Copied link' : 'Copy session link'}</button></div>
      <div className="ldt-one-qr success"><ToolGlyph name="shieldAlert" size={18}/><p><strong>Your transfer still travels peer-to-peer.</strong> PeerJS Cloud only helps the two browsers find each other; it does not carry or store your text and files.</p></div>
    </section>}

    {phase === 'creating' && <section className="ldt-wait" role="status"><ToolGlyph name="refresh" size={28}/><strong>Gathering private connection details…</strong><span>This can take a few seconds.</span></section>}

    {phase === 'offer' && <section className="ldt-pairing">
      <div className="ldt-step-head"><span>1</span><div><strong>Show this QR on the receiving device</strong><small>On the other device, open this tool and choose “Scan pairing QR”. This screen cycles through a few small codes automatically — no need to time it.</small></div></div>
      <AnimatedQrDisplay value={offerCode} peer={peerRef.current}/>
      <textarea className="ldt-signal-code" aria-label="Pairing link" readOnly value={offerLink}/>
      <div className="ldt-pair-actions"><button className="button secondary" onClick={() => copy(offerLink, 'offer')}><Icon name={copied === 'offer' ? 'check' : 'copy'} size={17}/>{copied === 'offer' ? 'Copied link' : 'Copy pairing link'}</button></div>
      <div className="ldt-one-qr"><ToolGlyph name="warning" size={18}/><p><strong>Why a return scan may appear</strong>One QR introduces the devices. With no signalling backend, the receiving browser still has to return its answer. That second QR is the smallest private fallback.</p></div>
      <div className="ldt-step-head second"><span>2</span><div><strong>Scan the return QR shown on the other device</strong><small>Use this device’s camera, upload a QR image, or paste the answer code.</small></div></div>
      <SignalScanner onSignal={applyAnswer}/>
      <details className="ldt-manual"><summary>Paste return connection code</summary><textarea aria-label="Return connection code" value={manualAnswer} onChange={event => setManualAnswer(event.target.value)} placeholder="Paste the answer code from the receiving device"/><button className="button primary" onClick={() => applyAnswer(manualAnswer)} disabled={!manualAnswer.trim()}>Complete connection</button></details>
    </section>}

    {(phase === 'joining' || phase === 'manual') && <section className="ldt-wait" role="status"><ToolGlyph name="refresh" size={28}/><strong>{phase === 'joining' ? 'Creating the private return handshake…' : 'The first connection code needs attention'}</strong><span>{phase === 'joining' ? 'Keep this page open while the browser gathers local connection details.' : 'Return to the start and paste a valid offer code.'}</span>{phase === 'manual' && <button className="button secondary" onClick={() => closeConnection()}>Start again</button>}</section>}

    {phase === 'return' && <section className="ldt-pairing">
      <div className="ldt-step-head"><span>2</span><div><strong>Return this QR to the first device</strong><small>On the first device, choose “Scan return QR” and point its camera at this screen. This QR cycles through a few small codes automatically — no need to time it.</small></div></div>
      <AnimatedQrDisplay value={answerCode} peer={peerRef.current}/>
      <textarea className="ldt-signal-code" aria-label="Return connection code" readOnly value={answerCode}/>
      <div className="ldt-pair-actions"><button className="button secondary" onClick={() => copy(answerCode, 'answer')}><Icon name={copied === 'answer' ? 'check' : 'copy'} size={17}/>{copied === 'answer' ? 'Copied code' : 'Copy return code'}</button></div>
      <div className="ldt-one-qr success"><ToolGlyph name="shieldAlert" size={18}/><p><strong>The second QR contains connection data only.</strong>It does not contain your files or text. Once scanned, transfers use the encrypted WebRTC channel.</p></div>
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

    <div className="ldt-privacy"><Icon name="shield" size={19}/><p><strong>Encrypted peer-to-peer transfer.</strong> The recommended flow uses PeerJS Cloud for temporary signalling only. Transfer contents travel through WebRTC and are not uploaded or stored by PeerJS or SurrendaSoft. Network policies can still block direct connections.</p></div>
  </div>;
}

const ANIMATED_QR_INTERVAL_MS = 1500;

function SimpleQrDisplay({ value }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!value || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, { width: 320, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#10183e', light: '#ffffff' } }, qrError => setError(qrError ? 'The one-QR session could not be drawn. Copy the session link instead.' : ''));
  }, [value]);
  return <div className="ldt-qr">{error ? <p className="ldt-error">{error}</p> : <canvas ref={canvasRef}/>}<p className="ldt-qr-caption">One scan · opens and connects automatically</p></div>;
}

// Cycles through several small, low-density QR codes (same idea as hardware wallets
// use for air-gapped signing) so fixed-focus cameras and smaller screens can read
// the handshake reliably. Stops on its own once this device's RTCPeerConnection
// reports 'connected'.
function AnimatedQrDisplay({ value, peer }) {
  const canvasRef = useRef(null);
  const [chunks, setChunks] = useState([]);
  const [index, setIndex] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setIndex(0); setStopped(false);
    if (!value) { setChunks([]); return; }
    try { setChunks(splitIntoQrChunks(value)); }
    catch { setChunks([]); setError('This connection QR could not be prepared.'); }
  }, [value]);

  useEffect(() => {
    if (!peer) return undefined;
    const checkConnected = () => { if (peer.connectionState === 'connected') setStopped(true); };
    checkConnected();
    peer.addEventListener?.('connectionstatechange', checkConnected);
    return () => peer.removeEventListener?.('connectionstatechange', checkConnected);
  }, [peer]);

  useEffect(() => {
    if (stopped || chunks.length <= 1) return undefined;
    const timer = window.setInterval(() => setIndex(current => (current + 1) % chunks.length), ANIMATED_QR_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [chunks, stopped]);

  const current = chunks[index] || '';
  useEffect(() => {
    if (!current || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, current, { width: QR_CHUNK_DISPLAY_PX, margin: 2, errorCorrectionLevel: 'Q', color: { dark: '#10183e', light: '#ffffff' } }, qrError => setError(qrError ? 'This connection QR could not be drawn.' : ''));
  }, [current]);

  return <div className="ldt-qr">
    {error ? <p className="ldt-error">{error}</p> : <canvas ref={canvasRef}/>}
    {!error && chunks.length > 1 && !stopped && <p className="ldt-qr-caption">Showing part {index + 1} of {chunks.length} · repeats automatically</p>}
    {!error && stopped && <p className="ldt-qr-caption success"><ToolGlyph name="check" size={13}/> Connected — no need to keep scanning</p>}
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
    setProgress({ total: state.total, captured: new Set(state.map.keys()) });
    if (state.map.size >= state.total) {
      try { finish(assembleQrChunks(state.map, state.total, state.compressed)); }
      catch { /* a duplicate/late frame raced the completion check — keep scanning */ }
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
    if (!navigator.mediaDevices?.getUserMedia) { setError('Camera scanning requires HTTPS in most browsers. Upload a QR image or paste the return code instead.'); return; }
    try {
      setError(''); resetScan();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      setActive(true);
    }
    catch { setError('Camera access was unavailable. Upload a QR image or paste the return code instead.'); stop(); }
  };
  const upload = event => {
    const file = event.target.files?.[0]; if (!file) return;
    const image = new Image(); image.onload = () => { const canvas = canvasRef.current; canvas.width = image.width; canvas.height = image.height; const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0); const pixels = context.getImageData(0, 0, canvas.width, canvas.height); const code = jsQR(pixels.data, pixels.width, pixels.height); URL.revokeObjectURL(image.src); if (code?.data && ingestChunkText(code.data)) setError(''); else setError('No readable connection QR part was found in that image.'); }; image.src = URL.createObjectURL(file);
  };
  // The video element is rendered only after `active` changes. Attach the stream
  // after that render, matching the working Camera tool's lifecycle.
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

  const hint = quality === 'green' ? 'Reading…' : quality === 'orange' ? 'Hold steady…' : 'Looking for the QR code on the other screen…';
  return <div className="ldt-scanner">
    <div className={`ldt-viewfinder${active ? ' active' : ''}`}>
      {active ? <>
        <video ref={videoRef} autoPlay muted playsInline aria-label={videoLabel}/>
        <canvas ref={overlayRef} className="ldt-viewfinder-overlay" aria-hidden="true"/>
        <span className={`ldt-scan-hint quality-${quality}`}>{hint}</span>
      </> : <><ToolGlyph name="camera" size={40}/><span>{idleHint}</span></>}
      <canvas ref={canvasRef} hidden/>
    </div>
    {progress && progress.total > 1 && <div className="ldt-chunk-progress" role="status" aria-label={`Captured ${progress.captured.size} of ${progress.total} connection QR parts`}>
      {Array.from({ length: progress.total }, (_, part) => <span key={part} className={progress.captured.has(part) ? 'done' : 'pending'}/>)}
    </div>}
    <div className="ldt-scanner-actions">{active ? <button className="button secondary" onClick={stop}>Stop camera</button> : <button className="button primary" onClick={start}><ToolGlyph name="camera" size={17}/> {scanLabel}</button>}<label className="button secondary"><ToolGlyph name="image" size={17}/> {uploadHint}<input type="file" accept="image/*" onChange={upload}/></label></div>
    {error && <p className="ldt-error">{error}</p>}
  </div>;
}
