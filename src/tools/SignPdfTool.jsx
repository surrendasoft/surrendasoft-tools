import { useEffect, useRef, useState } from 'react';
import { formatBytes } from '../utils/format.js';
import { FileDrop, FileList } from '../components/FileInputs.jsx';

export default function SignPdfTool() {
  const [file, setFile] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [result, setResult] = useState(null);
  const [rendering, setRendering] = useState(false), [numPages, setNumPages] = useState(0), [pageNum, setPageNum] = useState(1), [pageDims, setPageDims] = useState(null);
  const [sigMode, setSigMode] = useState('draw'), [sigDataUrl, setSigDataUrl] = useState(''), [sigAspect, setSigAspect] = useState(3), [signedText, setSignedText] = useState(''), [hasInk, setHasInk] = useState(false);
  const [placement, setPlacement] = useState({ fx: 0.6, fy: 0.82, fw: 0.3 });
  const previewRef = useRef(null), stageRef = useRef(null), drawCanvasRef = useRef(null), pdfDocRef = useRef(null);
  const drawing = useRef(false), lastPoint = useRef(null), dragRef = useRef(null);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const fheightFor = fw => pageDims ? (fw * pageDims.ptWidth) / (sigAspect * pageDims.ptHeight) : fw / sigAspect;
  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result?.url]);
  const renderPage = async (doc, number) => {
    setRendering(true);
    try {
      const page = await doc.getPage(number), base = page.getViewport({ scale: 1 });
      setPageDims({ ptWidth: base.width, ptHeight: base.height });
      const scale = Math.min(2, 1400 / base.width), viewport = page.getViewport({ scale }), canvas = previewRef.current;
      if (!canvas) return;
      canvas.width = viewport.width; canvas.height = viewport.height;
      const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
    } finally { setRendering(false); }
  };
  const loadPdf = async source => {
    setError(''); setRendering(true);
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await source.arrayBuffer()) }).promise;
      pdfDocRef.current = doc; setNumPages(doc.numPages); setPageNum(1);
      await renderPage(doc, 1);
    } catch (err) { setError(err.message || 'Could not open this PDF.'); setRendering(false); }
  };
  useEffect(() => { if (file) loadPdf(file); }, [file]);
  useEffect(() => { if (sigMode !== 'draw') return; const canvas = drawCanvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#10183e'; }, [sigMode, file]);
  const goToPage = async next => { const doc = pdfDocRef.current; if (!doc || next < 1 || next > doc.numPages || rendering) return; setPageNum(next); await renderPage(doc, next); };
  const reset = () => { setFile(null); setResult(null); setError(''); setSigDataUrl(''); setNumPages(0); setPageNum(1); setPageDims(null); setHasInk(false); pdfDocRef.current = null; };
  const pointerPos = event => { const canvas = drawCanvasRef.current, rect = canvas.getBoundingClientRect(), point = event.touches ? event.touches[0] : event; return { x: (point.clientX - rect.left) * (canvas.width / rect.width), y: (point.clientY - rect.top) * (canvas.height / rect.height) }; };
  const startDraw = event => { event.preventDefault(); drawing.current = true; lastPoint.current = pointerPos(event); };
  const moveDraw = event => { if (!drawing.current) return; event.preventDefault(); const ctx = drawCanvasRef.current.getContext('2d'), point = pointerPos(event); ctx.beginPath(); ctx.moveTo(lastPoint.current.x, lastPoint.current.y); ctx.lineTo(point.x, point.y); ctx.stroke(); lastPoint.current = point; setHasInk(true); };
  const endDraw = () => { drawing.current = false; };
  const clearInk = () => { const canvas = drawCanvasRef.current; canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); setHasInk(false); };
  const trimCanvas = canvas => {
    const ctx = canvas.getContext('2d'), { width, height } = canvas, data = ctx.getImageData(0, 0, width, height).data;
    let minX = width, minY = height, maxX = 0, maxY = 0, found = false;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 10) { found = true; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    if (!found) return null;
    const pad = 8;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad); maxX = Math.min(width - 1, maxX + pad); maxY = Math.min(height - 1, maxY + pad);
    const w = maxX - minX + 1, h = maxY - minY + 1, out = window.document.createElement('canvas');
    out.width = w; out.height = h; out.getContext('2d').drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
    return { dataUrl: out.toDataURL('image/png'), aspect: w / h };
  };
  const applyDrawn = () => { const trimmed = trimCanvas(drawCanvasRef.current); if (!trimmed) return; setSigDataUrl(trimmed.dataUrl); setSigAspect(trimmed.aspect); setPlacement(previous => ({ ...previous, fw: Math.min(0.35, Math.max(0.15, trimmed.aspect * 0.06)) })); setError(''); };
  const onUpload = event => {
    const image = event.target.files?.[0]; if (!image) return;
    const reader = new FileReader();
    reader.onload = () => { const url = reader.result, probe = new Image(); probe.onload = () => { setSigDataUrl(url); setSigAspect(probe.naturalWidth / probe.naturalHeight || 3); setPlacement(previous => ({ ...previous, fw: 0.3 })); setError(''); }; probe.src = url; };
    reader.readAsDataURL(image);
  };
  const beginDrag = mode => event => {
    event.preventDefault(); event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { mode, startX: event.clientX, startY: event.clientY, rect: stageRef.current.getBoundingClientRect(), orig: { ...placement } };
  };
  const onDrag = event => {
    const drag = dragRef.current; if (!drag) return;
    const dx = (event.clientX - drag.startX) / drag.rect.width, dy = (event.clientY - drag.startY) / drag.rect.height;
    if (drag.mode === 'move') { const fx = clamp(drag.orig.fx + dx, 0, 1 - drag.orig.fw), fy = clamp(drag.orig.fy + dy, 0, 1 - fheightFor(drag.orig.fw)); setPlacement(previous => ({ ...previous, fx, fy })); }
    else { const fw = clamp(drag.orig.fw + dx, 0.06, 1 - drag.orig.fx), fy = Math.min(drag.orig.fy, 1 - fheightFor(fw)); setPlacement(previous => ({ ...previous, fw, fy })); }
  };
  const endDrag = () => { dragRef.current = null; };
  const sign = async () => {
    if (!file) return;
    if (!sigDataUrl && !signedText.trim()) return setError('Add a signature or a typed line first.');
    setBusy(true); setError('');
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const page = pdf.getPages()[pageNum - 1], { width, height } = page.getSize();
      let textY = null, textX = placement.fx * width;
      if (sigDataUrl) {
        const bytes = await fetch(sigDataUrl).then(response => response.arrayBuffer());
        const image = sigDataUrl.startsWith('data:image/png') ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const sigW = placement.fw * width, sigH = sigW / sigAspect, x = placement.fx * width, y = height - (placement.fy * height) - sigH;
        page.drawImage(image, { x, y, width: sigW, height: sigH });
        textY = y - 14; textX = x;
      } else { textY = height - (placement.fy * height) - 14; }
      const textValue = signedText.trim();
      if (textValue) { const font = await pdf.embedFont(StandardFonts.Helvetica); page.drawText(textValue, { x: textX, y: textY, size: sigDataUrl ? 11 : 12, font, color: rgb(0.06, 0.09, 0.24) }); }
      const out = await pdf.save();
      setResult({ url: URL.createObjectURL(new Blob([out], { type: 'application/pdf' })), size: out.length, name: `${file.name.replace(/\.pdf$/i, '')}-signed.pdf` });
    } catch (err) { setError(err.message || 'Could not sign this PDF.'); }
    setBusy(false);
  };
  return <>{!file ? <FileDrop accept="application/pdf" onFiles={files => { setFile(files[0] || null); setResult(null); setError(''); setSigDataUrl(''); }} title="Choose a PDF to sign" hint="Your document is rendered and signed locally — never uploaded"/> : <FileList files={[file]} onRemove={reset}/>}
    {file && <>
      <div className="sign-layout">
        <div className="sign-stage-wrap">
          {numPages > 1 && <div className="sign-pager"><button className="button secondary compact" onClick={() => goToPage(pageNum - 1)} disabled={pageNum <= 1 || rendering}>Prev</button><span>Page {pageNum} of {numPages}</span><button className="button secondary compact" onClick={() => goToPage(pageNum + 1)} disabled={pageNum >= numPages || rendering}>Next</button></div>}
          <div className="sign-stage" ref={stageRef}>
            <canvas ref={previewRef} className="sign-page"/>
            {sigDataUrl && pageDims && <div className="sign-overlay" style={{ left: `${placement.fx * 100}%`, top: `${placement.fy * 100}%`, width: `${placement.fw * 100}%` }} onPointerDown={beginDrag('move')} onPointerMove={onDrag} onPointerUp={endDrag} onPointerCancel={endDrag}><img src={sigDataUrl} alt="Signature" draggable="false"/><span className="sign-handle" onPointerDown={beginDrag('resize')} onPointerMove={onDrag} onPointerUp={endDrag} onPointerCancel={endDrag}/></div>}
            {rendering && <div className="sign-loading">Rendering…</div>}
          </div>
          {sigDataUrl && <p className="sign-hint">Drag the signature to position it, and drag the corner handle to resize.</p>}
        </div>
        <div className="sign-panel">
          <div className="sign-tabs"><button type="button" className={sigMode === 'draw' ? 'active' : ''} onClick={() => { setSigMode('draw'); setHasInk(false); }}>Draw</button><button type="button" className={sigMode === 'upload' ? 'active' : ''} onClick={() => setSigMode('upload')}>Upload</button></div>
          {sigMode === 'draw' ? <><canvas ref={drawCanvasRef} width="600" height="200" className="sign-canvas" onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onMouseLeave={endDraw} onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw}/><div className="sign-canvas-actions"><span>{hasInk ? 'Signature ready' : 'Sign in the box'}</span><button className="button secondary compact" onClick={clearInk} disabled={!hasInk}>Clear</button></div><button className="button primary compact sign-apply" onClick={applyDrawn} disabled={!hasInk}>{sigDataUrl ? 'Update signature' : 'Place on document'}</button></> : <><label className="sign-upload"><input type="file" accept="image/png,image/jpeg" onChange={onUpload}/><span>{sigDataUrl ? 'Choose a different image' : 'Choose a signature image (PNG or JPG)'}</span></label><p className="sign-hint">A transparent PNG works best, but a photo of a signature also works.</p></>}
          <label className="textarea-label sign-text">Typed line <span>optional</span><input value={signedText} onChange={event => setSignedText(event.target.value)} placeholder="e.g. Jane Smith · 4 July 2026"/></label>
        </div>
      </div>
      <button className="button primary pdf-action" onClick={sign} disabled={busy || rendering}>{busy ? 'Signing PDF…' : 'Sign & download'}</button>
    </>}
    {error && <p className="pdf-error">{error}</p>}
    {result && <div className="pdf-result"><div><strong>Signed PDF ready</strong><span>{formatBytes(result.size)}</span></div><a className="button primary compact" href={result.url} download={result.name}>Download PDF</a></div>}
    <p className="tool-footnote">Place your signature exactly where you want it on the page you are viewing. Rotated pages may position differently. For legally binding e-signatures, use a dedicated service with audit trails.</p></>;
}
