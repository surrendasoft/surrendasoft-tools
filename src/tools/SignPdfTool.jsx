import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import ToolGlyph from '../components/ToolGlyph.jsx';
import { formatBytes } from '../utils/format.js';
import { completedPdfName, exportMarkedPdf, hasMarkup } from '../utils/pdfMarkup.js';
import { openPdfDocument } from '../utils/pdfjs.js';
import { FileDrop, FileList } from '../components/FileInputs.jsx';
import './SignPdfTool.css';

let nextTextId = 0;

export default function SignPdfTool() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [rendering, setRendering] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageDims, setPageDims] = useState(null);
  const [docReady, setDocReady] = useState(0);
  const [layoutTick, setLayoutTick] = useState(0);
  const [toolMode, setToolMode] = useState('text');
  const [textFields, setTextFields] = useState([]);
  const [selectedTextId, setSelectedTextId] = useState('');
  const [textSize, setTextSize] = useState(11);
  const [signature, setSignature] = useState(null);
  const [sigMode, setSigMode] = useState('draw');
  const [sigDataUrl, setSigDataUrl] = useState('');
  const [sigAspect, setSigAspect] = useState(3);
  const [hasInk, setHasInk] = useState(false);
  const [sigPlacement, setSigPlacement] = useState({ fx: 0.6, fy: 0.82, fw: 0.3 });

  const previewRef = useRef(null);
  const stageRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const panelInputRef = useRef(null);
  const pdfDocRef = useRef(null);
  const sourceBytesRef = useRef(null);
  const renderGenRef = useRef(0);
  const drawing = useRef(false);
  const lastPoint = useRef(null);
  const dragRef = useRef(null);

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const fheightFor = fw => pageDims ? (fw * pageDims.ptWidth) / (sigAspect * pageDims.ptHeight) : fw / sigAspect;
  const pageTextFields = useMemo(() => textFields.filter(field => field.page === pageNum), [textFields, pageNum]);
  const selectedField = textFields.find(field => field.id === selectedTextId);

  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result?.url]);

  useEffect(() => {
    if (!file) return undefined;
    let cancelled = false;
    renderGenRef.current += 1;
    setError('');
    setRendering(true);
    setNumPages(0);
    setPageNum(1);
    setPageDims(null);
    setDocReady(0);
    pdfDocRef.current = null;
    sourceBytesRef.current = null;

    (async () => {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (cancelled) return;
        sourceBytesRef.current = bytes;
        const { doc } = await openPdfDocument(bytes);
        if (cancelled) return;
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setDocReady(current => current + 1);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not open this PDF.');
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();

    return () => { cancelled = true; };
  }, [file]);

  useEffect(() => {
    const doc = pdfDocRef.current;
    if (!file || !doc || !docReady) return undefined;
    const generation = ++renderGenRef.current;
    let cancelled = false;

    const paintPage = async () => {
      let canvas = previewRef.current;
      for (let attempt = 0; attempt < 40 && !canvas; attempt += 1) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        canvas = previewRef.current;
      }
      if (!canvas || cancelled || generation !== renderGenRef.current) return;

      setRendering(true);
      try {
        const page = await doc.getPage(pageNum);
        if (cancelled || generation !== renderGenRef.current) return;
        const base = page.getViewport({ scale: 1 });
        setPageDims({ ptWidth: base.width, ptHeight: base.height });
        const width = stageRef.current?.clientWidth || canvas.parentElement?.clientWidth || base.width;
        const viewport = page.getViewport({ scale: width / base.width });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        if (!cancelled && generation === renderGenRef.current && err?.name !== 'RenderingCancelledException') {
          setError(err.message || 'Could not render this page.');
        }
      } finally {
        if (!cancelled && generation === renderGenRef.current) setRendering(false);
      }
    };

    paintPage();
    return () => { cancelled = true; };
  }, [file, pageNum, docReady, layoutTick]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !docReady) return undefined;
    let timer;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => setLayoutTick(current => current + 1), 120);
    });
    observer.observe(stage);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [docReady, file]);

  useEffect(() => {
    if (sigMode !== 'draw') return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#10183e';
  }, [sigMode, file]);

  useEffect(() => {
    if (!selectedTextId || toolMode !== 'text') return;
    panelInputRef.current?.focus();
  }, [selectedTextId, toolMode]);

  const goToPage = next => {
    const doc = pdfDocRef.current;
    if (!doc || next < 1 || next > doc.numPages || rendering) return;
    setPageNum(next);
    setSelectedTextId('');
  };

  const reset = () => {
    renderGenRef.current += 1;
    setFile(null);
    setResult(null);
    setError('');
    setTextFields([]);
    setSelectedTextId('');
    setSignature(null);
    setSigDataUrl('');
    setNumPages(0);
    setPageNum(1);
    setPageDims(null);
    setDocReady(0);
    setHasInk(false);
    pdfDocRef.current = null;
    sourceBytesRef.current = null;
  };

  const addTextField = (fx, fy, text = '') => {
    const id = `t${nextTextId++}`;
    const field = { id, page: pageNum, fx: clamp(fx, 0, 0.92), fy: clamp(fy, 0, 0.96), text, size: textSize };
    setTextFields(current => [...current, field]);
    setSelectedTextId(id);
    setToolMode('text');
    setResult(null);
    setError('');
  };

  const updateTextField = (id, patch) => {
    setTextFields(current => current.map(field => (field.id === id ? { ...field, ...patch } : field)));
    setResult(null);
  };

  const removeTextField = id => {
    setTextFields(current => current.filter(field => field.id !== id));
    setSelectedTextId(current => (current === id ? '' : current));
    setResult(null);
  };

  const onStageClick = event => {
    if (toolMode !== 'text' || rendering) return;
    if (event.target !== previewRef.current && event.target !== stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    addTextField((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
  };

  const pointerPos = event => {
    const canvas = drawCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const point = event.touches ? event.touches[0] : event;
    return {
      x: (point.clientX - rect.left) * (canvas.width / rect.width),
      y: (point.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = event => { event.preventDefault(); drawing.current = true; lastPoint.current = pointerPos(event); };
  const moveDraw = event => {
    if (!drawing.current) return;
    event.preventDefault();
    const ctx = drawCanvasRef.current.getContext('2d');
    const point = pointerPos(event);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint.current = point;
    setHasInk(true);
  };
  const endDraw = () => { drawing.current = false; };
  const clearInk = () => {
    const canvas = drawCanvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  const trimCanvas = canvas => {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let found = false;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (data[(y * width + x) * 4 + 3] > 10) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found) return null;
    const pad = 8;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width - 1, maxX + pad);
    maxY = Math.min(height - 1, maxY + pad);
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const out = window.document.createElement('canvas');
    out.width = w;
    out.height = h;
    out.getContext('2d').drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
    return { dataUrl: out.toDataURL('image/png'), aspect: w / h };
  };

  const applyDrawn = () => {
    const trimmed = trimCanvas(drawCanvasRef.current);
    if (!trimmed) return;
    setSigDataUrl(trimmed.dataUrl);
    setSigAspect(trimmed.aspect);
    setSigPlacement(previous => ({ ...previous, fw: Math.min(0.35, Math.max(0.15, trimmed.aspect * 0.06)) }));
    setError('');
  };

  const onUpload = event => {
    const image = event.target.files?.[0];
    if (!image) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result;
      const probe = new Image();
      probe.onload = () => {
        setSigDataUrl(url);
        setSigAspect(probe.naturalWidth / probe.naturalHeight || 3);
        setSigPlacement(previous => ({ ...previous, fw: 0.3 }));
        setError('');
      };
      probe.src = url;
    };
    reader.readAsDataURL(image);
  };

  const placeSignature = () => {
    if (!sigDataUrl) return;
    setSignature({
      page: pageNum,
      fx: sigPlacement.fx,
      fy: sigPlacement.fy,
      fw: sigPlacement.fw,
      dataUrl: sigDataUrl,
      aspect: sigAspect,
    });
    setToolMode('signature');
    setResult(null);
    setError('');
  };

  const beginSigDrag = mode => event => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      kind: 'signature',
      mode,
      startX: event.clientX,
      startY: event.clientY,
      rect: stageRef.current.getBoundingClientRect(),
      orig: { ...sigPlacement },
    };
  };

  const beginTextDrag = id => event => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedTextId(id);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const field = textFields.find(item => item.id === id);
    dragRef.current = {
      kind: 'text',
      id,
      startX: event.clientX,
      startY: event.clientY,
      rect: stageRef.current.getBoundingClientRect(),
      orig: { fx: field.fx, fy: field.fy },
    };
  };

  const onDrag = event => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / drag.rect.width;
    const dy = (event.clientY - drag.startY) / drag.rect.height;
    if (drag.kind === 'signature') {
      if (drag.mode === 'move') {
        const fx = clamp(drag.orig.fx + dx, 0, 1 - sigPlacement.fw);
        const fy = clamp(drag.orig.fy + dy, 0, 1 - fheightFor(sigPlacement.fw));
        setSigPlacement(previous => ({ ...previous, fx, fy }));
        if (signature?.page === pageNum) setSignature(previous => previous ? { ...previous, fx, fy } : previous);
      } else {
        const fw = clamp(drag.orig.fw + dx, 0.06, 1 - drag.orig.fx);
        const fy = Math.min(drag.orig.fy, 1 - fheightFor(fw));
        setSigPlacement(previous => ({ ...previous, fw, fy }));
        if (signature?.page === pageNum) setSignature(previous => previous ? { ...previous, fw, fy } : previous);
      }
      return;
    }
    updateTextField(drag.id, {
      fx: clamp(drag.orig.fx + dx, 0, 0.92),
      fy: clamp(drag.orig.fy + dy, 0, 0.96),
    });
  };

  const endDrag = () => { dragRef.current = null; };

  const activeSignature = signature?.page === pageNum ? signature : null;
  const signaturePreview = activeSignature || (sigDataUrl && toolMode === 'signature' ? { ...sigPlacement, dataUrl: sigDataUrl, aspect: sigAspect } : null);

  const downloadPdf = async () => {
    if (!file) return;
    if (!hasMarkup(textFields, signature)) return setError('Add some text or a signature first.');
    setBusy(true);
    setError('');
    try {
      const bytes = await exportMarkedPdf(sourceBytesRef.current?.slice().buffer || await file.arrayBuffer(), { textFields, signature });
      setResult({
        url: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })),
        size: bytes.length,
        name: completedPdfName(file.name),
      });
    } catch (err) {
      setError(err.message || 'Could not save this PDF.');
    }
    setBusy(false);
  };

  return <>
    {!file ? (
      <FileDrop
        accept="application/pdf"
        onFiles={files => { setFile(files[0] || null); setResult(null); setError(''); setTextFields([]); setSignature(null); setSigDataUrl(''); }}
        title="Choose a PDF to fill and sign"
        hint="Add text anywhere on flat forms, place a signature, then download — all locally"
      />
    ) : (
      <FileList files={[file]} onRemove={reset}/>
    )}

    {file && <>
      <div className="sign-workspace">
        <div className="sign-stage-wrap">
          {numPages > 1 && (
            <div className="sign-pager">
              <button className="button secondary compact" onClick={() => goToPage(pageNum - 1)} disabled={pageNum <= 1 || rendering}>Prev</button>
              <span>Page {pageNum} of {numPages}</span>
              <button className="button secondary compact" onClick={() => goToPage(pageNum + 1)} disabled={pageNum >= numPages || rendering}>Next</button>
            </div>
          )}
          <div
            className={`sign-stage${toolMode === 'text' ? ' sign-stage-text' : ''}`}
            ref={stageRef}
            onClick={onStageClick}
            onPointerMove={onDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <canvas ref={previewRef} className="sign-page"/>
            {pageTextFields.map(field => (
              <div
                key={field.id}
                className={`sign-text-overlay${selectedTextId === field.id ? ' selected' : ''}`}
                style={{ left: `${field.fx * 100}%`, top: `${field.fy * 100}%` }}
                onClick={event => { event.stopPropagation(); setSelectedTextId(field.id); }}
              >
                <button
                  type="button"
                  className="sign-text-overlay-handle"
                  aria-label="Drag text box"
                  onPointerDown={beginTextDrag(field.id)}
                >⋮⋮</button>
                <div className="sign-text-overlay-value">{field.text || 'Empty text box'}</div>
                <button type="button" className="sign-text-overlay-remove" onClick={event => { event.stopPropagation(); removeTextField(field.id); }}>Remove</button>
              </div>
            ))}
            {signaturePreview && pageDims && (
              <div
                className="sign-overlay"
                style={{ left: `${(activeSignature ? activeSignature.fx : sigPlacement.fx) * 100}%`, top: `${(activeSignature ? activeSignature.fy : sigPlacement.fy) * 100}%`, width: `${(activeSignature ? activeSignature.fw : sigPlacement.fw) * 100}%` }}
                onPointerDown={beginSigDrag('move')}
              >
                <img src={signaturePreview.dataUrl} alt="Signature" draggable="false"/>
                <span className="sign-handle" onPointerDown={beginSigDrag('resize')}/>
              </div>
            )}
            {rendering && <div className="sign-loading">Loading page…</div>}
          </div>
          <p className="sign-hint">
            {toolMode === 'text'
              ? 'Click the page to add a text box, then type below. Drag using the handle on each box.'
              : signaturePreview
                ? 'Drag the signature to position it, and drag the corner handle to resize.'
                : 'Draw or upload a signature below, then place it on the document.'}
          </p>
        </div>

        <div className="sign-panel">
          <div className="sign-mode-tabs" role="tablist" aria-label="Fill and sign mode">
            <button type="button" role="tab" aria-selected={toolMode === 'text'} className={toolMode === 'text' ? 'active' : ''} onClick={() => setToolMode('text')}>
              <ToolGlyph name="type" size={16}/> Add text
            </button>
            <button type="button" role="tab" aria-selected={toolMode === 'signature'} className={toolMode === 'signature' ? 'active' : ''} onClick={() => setToolMode('signature')}>
              <ToolGlyph name="signature" size={16}/> Signature
            </button>
          </div>

          {toolMode === 'text' ? (
            <div className="sign-text-tools">
              <p className="sign-hint">For flat forms like bank authority forms — add text boxes on the page, then type your answers here.</p>
              <div className="sign-text-toolbar">
                <button type="button" className="button secondary compact" onClick={() => addTextField(0.12, 0.12)}>Add text box on this page</button>
                <label>Text size<input type="range" min="8" max="18" value={textSize} onChange={event => {
                  const size = Number(event.target.value);
                  setTextSize(size);
                  if (selectedTextId) updateTextField(selectedTextId, { size });
                }}/> {textSize} pt</label>
              </div>
              {selectedField ? (
                <label className="sign-selected-editor">
                  Text for selected box
                  <input
                    ref={panelInputRef}
                    value={selectedField.text}
                    placeholder="Type the answer for this field"
                    onChange={event => updateTextField(selectedField.id, { text: event.target.value })}
                  />
                </label>
              ) : (
                <p className="sign-hint">Select a text box on the page, or click the page to add one.</p>
              )}
              {pageTextFields.length > 0 && (
                <div className="sign-text-list">
                  {pageTextFields.map(field => (
                    <button
                      key={field.id}
                      type="button"
                      className={`sign-text-list-item${selectedTextId === field.id ? ' active' : ''}`}
                      onClick={() => setSelectedTextId(field.id)}
                    >
                      <div><strong>{field.text || 'Empty text box'}</strong><span>{field.size} pt on page {field.page}</span></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="sign-tabs">
                <button type="button" className={sigMode === 'draw' ? 'active' : ''} onClick={() => { setSigMode('draw'); setHasInk(false); }}>Draw</button>
                <button type="button" className={sigMode === 'upload' ? 'active' : ''} onClick={() => setSigMode('upload')}>Upload</button>
              </div>
              {sigMode === 'draw' ? (
                <>
                  <canvas ref={drawCanvasRef} width="600" height="200" className="sign-canvas" onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onMouseLeave={endDraw} onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw}/>
                  <div className="sign-canvas-actions"><span>{hasInk ? 'Signature ready' : 'Sign in the box'}</span><button className="button secondary compact" onClick={clearInk} disabled={!hasInk}>Clear</button></div>
                  <button className="button primary compact sign-apply" onClick={() => { applyDrawn(); placeSignature(); }} disabled={!hasInk}>{signature ? 'Update signature' : 'Place on document'}</button>
                </>
              ) : (
                <>
                  <label className="sign-upload"><input type="file" accept="image/png,image/jpeg" onChange={onUpload}/><span>{sigDataUrl ? 'Choose a different image' : 'Choose a signature image (PNG or JPG)'}</span></label>
                  <p className="sign-hint">A transparent PNG works best, but a photo of a signature also works.</p>
                  {sigDataUrl && <button className="button primary compact sign-apply" onClick={placeSignature}>{signature ? 'Update signature on page' : 'Place on document'}</button>}
                </>
              )}
              {signature && <button type="button" className="button secondary compact" onClick={() => { setSignature(null); setSigDataUrl(''); }}>Remove signature</button>}
            </>
          )}
        </div>
      </div>

      <button className="button primary pdf-action" onClick={downloadPdf} disabled={busy || rendering}>
        <ToolGlyph name="download" size={17}/>
        {busy ? 'Saving PDF…' : 'Download completed PDF'}
      </button>
    </>}

    {error && <p className="pdf-error">{error}</p>}
    {result && (
      <div className="pdf-result">
        <div><strong>Completed PDF ready</strong><span>{formatBytes(result.size)}</span></div>
        <a className="button primary compact" href={result.url} download={result.name}><Icon name="arrow" size={16}/>Download PDF</a>
      </div>
    )}
    <p className="tool-footnote">Fill flat PDF forms by placing text boxes, add a signature if needed, then download once. For PDFs with built-in fillable fields, use PDF Form Filler instead. For legally binding e-signatures, use a dedicated service with audit trails.</p>
  </>;
}
