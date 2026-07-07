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
  const [zoom, setZoom] = useState(1);
  const [paintZoom, setPaintZoom] = useState(1);
  const [pageDisplay, setPageDisplay] = useState(null);
  const [renderScale, setRenderScale] = useState(1);
  const [toolMode, setToolMode] = useState('text');
  const [textFields, setTextFields] = useState([]);
  const [selectedTextId, setSelectedTextId] = useState('');
  const [textSize, setTextSize] = useState(10);
  const [boxDraft, setBoxDraft] = useState(null);
  const [signature, setSignature] = useState(null);
  const [sigMode, setSigMode] = useState('draw');
  const [sigDataUrl, setSigDataUrl] = useState('');
  const [sigAspect, setSigAspect] = useState(3);
  const [hasInk, setHasInk] = useState(false);
  const [sigPlacement, setSigPlacement] = useState({ fx: 0.6, fy: 0.82, fw: 0.3 });

  const previewRef = useRef(null);
  const viewportRef = useRef(null);
  const stageRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const inlineInputRefs = useRef({});
  const pdfDocRef = useRef(null);
  const sourceBytesRef = useRef(null);
  const renderGenRef = useRef(0);
  const interactionRef = useRef(null);
  const drawing = useRef(false);
  const lastPoint = useRef(null);

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const clampZoom = value => clamp(value, 0.5, 4);
  const fheightFor = fw => pageDims ? (fw * pageDims.ptWidth) / (sigAspect * pageDims.ptHeight) : fw / sigAspect;
  const pageTextFields = useMemo(() => textFields.filter(field => field.page === pageNum), [textFields, pageNum]);
  const selectedField = textFields.find(field => field.id === selectedTextId);

  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result?.url]);

  useEffect(() => {
    const timer = setTimeout(() => setPaintZoom(zoom), 150);
    return () => clearTimeout(timer);
  }, [zoom]);

  useEffect(() => {
    if (!file) return undefined;
    let cancelled = false;
    renderGenRef.current += 1;
    setError('');
    setRendering(true);
    setNumPages(0);
    setPageNum(1);
    setPageDims(null);
    setPageDisplay(null);
    setDocReady(0);
    setBoxDraft(null);
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
      if (!canvas || cancelled || generation !== renderGenRef.current) {
        if (!cancelled && generation === renderGenRef.current && !canvas) {
          setError('Could not display the PDF preview.');
        }
        return;
      }

      setRendering(true);
      try {
        const page = await doc.getPage(pageNum);
        if (cancelled || generation !== renderGenRef.current) return;
        const base = page.getViewport({ scale: 1 });
        const containerWidth = Math.max(320, (viewportRef.current?.clientWidth || 320) - 24);
        const dpr = window.devicePixelRatio || 1;
        const fitScale = containerWidth / base.width;
        const displayScale = fitScale * paintZoom;
        const outputScale = displayScale * dpr;
        const viewport = page.getViewport({ scale: outputScale });
        const displayWidth = viewport.width / dpr;
        const displayHeight = viewport.height / dpr;
        setPageDims({ ptWidth: base.width, ptHeight: base.height });
        setPageDisplay({ width: displayWidth, height: displayHeight });
        setRenderScale(displayScale);
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
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
  }, [file, pageNum, docReady, layoutTick, paintZoom]);

  useEffect(() => {
    const target = viewportRef.current;
    if (!target || !docReady) return undefined;
    let timer;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => setLayoutTick(current => current + 1), 120);
    });
    observer.observe(target);
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

  const goToPage = next => {
    const doc = pdfDocRef.current;
    if (!doc || next < 1 || next > doc.numPages || rendering) return;
    setPageNum(next);
    setSelectedTextId('');
    setBoxDraft(null);
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
    setPageDisplay(null);
    setDocReady(0);
    setZoom(1);
    setPaintZoom(1);
    setBoxDraft(null);
    setHasInk(false);
    pdfDocRef.current = null;
    sourceBytesRef.current = null;
  };

  const addTextBox = (fx, fy, fw, fh, text = '') => {
    const id = `t${nextTextId++}`;
    const field = {
      id,
      page: pageNum,
      fx: clamp(fx, 0, 1),
      fy: clamp(fy, 0, 1),
      fw: clamp(fw, 0.02, 1 - fx),
      fh: clamp(fh, 0.015, 1 - fy),
      text,
      size: textSize,
    };
    setTextFields(current => [...current, field]);
    setSelectedTextId(id);
    setToolMode('text');
    setResult(null);
    setError('');
    requestAnimationFrame(() => inlineInputRefs.current[id]?.focus());
    return id;
  };

  const updateTextField = (id, patch) => {
    setTextFields(current => current.map(field => (field.id === id ? { ...field, ...patch } : field)));
    setResult(null);
  };

  const removeTextField = id => {
    setTextFields(current => current.filter(field => field.id !== id));
    setSelectedTextId(current => (current === id ? '' : current));
    delete inlineInputRefs.current[id];
    setResult(null);
  };

  const stageFraction = (clientX, clientY) => {
    const rect = stageRef.current.getBoundingClientRect();
    return {
      fx: clamp((clientX - rect.left) / rect.width, 0, 1),
      fy: clamp((clientY - rect.top) / rect.height, 0, 1),
    };
  };

  const onStagePointerDown = event => {
    if (rendering) return;
    if (toolMode === 'text') {
      if (event.target !== previewRef.current && event.target !== stageRef.current) return;
      event.preventDefault();
      stageRef.current?.setPointerCapture?.(event.pointerId);
      const { fx, fy } = stageFraction(event.clientX, event.clientY);
      interactionRef.current = { kind: 'drawBox', startFx: fx, startFy: fy };
      setBoxDraft({ fx, fy, fw: 0, fh: 0 });
      return;
    }
  };

  const onStagePointerMove = event => {
    const drag = interactionRef.current;
    if (!drag) return;

    if (drag.kind === 'drawBox') {
      const { fx, fy } = stageFraction(event.clientX, event.clientY);
      const left = Math.min(drag.startFx, fx);
      const top = Math.min(drag.startFy, fy);
      setBoxDraft({
        fx: left,
        fy: top,
        fw: Math.abs(fx - drag.startFx),
        fh: Math.abs(fy - drag.startFy),
      });
      return;
    }

    const dx = (event.clientX - drag.startX) / drag.rect.width;
    const dy = (event.clientY - drag.startY) / drag.rect.height;

    if (drag.kind === 'moveBox') {
      updateTextField(drag.id, {
        fx: clamp(drag.orig.fx + dx, 0, 1 - drag.orig.fw),
        fy: clamp(drag.orig.fy + dy, 0, 1 - drag.orig.fh),
      });
      return;
    }

    if (drag.kind === 'resizeBox') {
      updateTextField(drag.id, {
        fw: clamp(drag.orig.fw + dx, 0.02, 1 - drag.orig.fx),
        fh: clamp(drag.orig.fh + dy, 0.015, 1 - drag.orig.fy),
      });
      return;
    }

    if (drag.kind === 'signature') {
      if (drag.mode === 'move') {
        const nextFx = clamp(drag.orig.fx + dx, 0, 1 - sigPlacement.fw);
        const nextFy = clamp(drag.orig.fy + dy, 0, 1 - fheightFor(sigPlacement.fw));
        setSigPlacement(previous => ({ ...previous, fx: nextFx, fy: nextFy }));
        if (signature?.page === pageNum) setSignature(previous => previous ? { ...previous, fx: nextFx, fy: nextFy } : previous);
      } else {
        const fw = clamp(drag.orig.fw + dx, 0.06, 1 - drag.orig.fx);
        const nextFy = Math.min(drag.orig.fy, 1 - fheightFor(fw));
        setSigPlacement(previous => ({ ...previous, fw, fy: nextFy }));
        if (signature?.page === pageNum) setSignature(previous => previous ? { ...previous, fw, fy: nextFy } : previous);
      }
    }
  };

  const onStagePointerUp = event => {
    const drag = interactionRef.current;
    if (!drag) return;
    stageRef.current?.releasePointerCapture?.(event.pointerId);

    if (drag.kind === 'drawBox' && pageDisplay) {
      const { fx, fy } = stageFraction(event.clientX, event.clientY);
      const left = Math.min(drag.startFx, fx);
      const top = Math.min(drag.startFy, fy);
      const fw = Math.abs(fx - drag.startFx);
      const fh = Math.abs(fy - drag.startFy);
      if (fw * pageDisplay.width >= 24 && fh * pageDisplay.height >= 12) {
        addTextBox(left, top, fw, fh);
      }
      setBoxDraft(null);
    }

    interactionRef.current = null;
  };

  const beginMoveBox = id => event => {
    if (selectedTextId !== id) {
      setSelectedTextId(id);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const field = textFields.find(item => item.id === id);
    interactionRef.current = {
      kind: 'moveBox',
      id,
      startX: event.clientX,
      startY: event.clientY,
      rect: stageRef.current.getBoundingClientRect(),
      orig: { fx: field.fx, fy: field.fy, fw: field.fw, fh: field.fh },
    };
  };

  const beginResizeBox = id => event => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const field = textFields.find(item => item.id === id);
    setSelectedTextId(id);
    interactionRef.current = {
      kind: 'resizeBox',
      id,
      startX: event.clientX,
      startY: event.clientY,
      rect: stageRef.current.getBoundingClientRect(),
      orig: { fx: field.fx, fy: field.fy, fw: field.fw, fh: field.fh },
    };
  };

  const beginSigDrag = mode => event => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    interactionRef.current = {
      kind: 'signature',
      mode,
      startX: event.clientX,
      startY: event.clientY,
      rect: stageRef.current.getBoundingClientRect(),
      orig: { ...sigPlacement },
    };
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
        hint="Draw text boxes on flat forms, place a signature, then download — all locally"
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
          <div className="sign-stage-toolbar">
            <label className="sign-zoom-control">
              Zoom
              <div className="sign-zoom-buttons">
                <button type="button" className="button secondary compact" aria-label="Zoom out" onClick={() => setZoom(current => clampZoom(current - 0.25))}>−</button>
                <input type="range" min="50" max="400" step="5" value={Math.round(zoom * 100)} onChange={event => setZoom(clampZoom(Number(event.target.value) / 100))}/>
                <button type="button" className="button secondary compact" aria-label="Zoom in" onClick={() => setZoom(current => clampZoom(current + 0.25))}>+</button>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
            </label>
            <button type="button" className="button secondary compact" onClick={() => setZoom(1)}>Reset zoom</button>
          </div>
          <div className="sign-viewport" ref={viewportRef}>
            <div
              className={`sign-stage${toolMode === 'text' ? ' sign-stage-text' : ''}${!pageDisplay ? ' sign-stage-loading' : ''}`}
              ref={stageRef}
              style={pageDisplay ? { width: pageDisplay.width, height: pageDisplay.height } : undefined}
              onPointerDown={onStagePointerDown}
              onPointerMove={onStagePointerMove}
              onPointerUp={onStagePointerUp}
              onPointerCancel={onStagePointerUp}
            >
              <canvas ref={previewRef} className="sign-page"/>
              {boxDraft && (
                <div
                  className="sign-box-draft"
                  style={{
                    left: `${boxDraft.fx * 100}%`,
                    top: `${boxDraft.fy * 100}%`,
                    width: `${boxDraft.fw * 100}%`,
                    height: `${boxDraft.fh * 100}%`,
                  }}
                />
              )}
              {pageDisplay && pageTextFields.map(field => (
                <div
                  key={field.id}
                  className={`sign-text-box${selectedTextId === field.id ? ' selected' : ''}`}
                  style={{
                    left: `${field.fx * 100}%`,
                    top: `${field.fy * 100}%`,
                    width: `${field.fw * 100}%`,
                    height: `${field.fh * 100}%`,
                  }}
                  onClick={event => { event.stopPropagation(); setSelectedTextId(field.id); }}
                >
                  {selectedTextId === field.id && (
                    <span className="sign-text-box-dragbar" onPointerDown={beginMoveBox(field.id)} aria-hidden="true"/>
                  )}
                  <input
                    ref={node => { if (node) inlineInputRefs.current[field.id] = node; }}
                    className="sign-text-box-input"
                    value={field.text}
                    placeholder="Type here"
                    style={{ fontSize: `${Math.max(8, field.size * renderScale * 0.75)}px` }}
                    onChange={event => updateTextField(field.id, { text: event.target.value })}
                    onFocus={() => setSelectedTextId(field.id)}
                    onClick={event => event.stopPropagation()}
                  />
                  {selectedTextId === field.id && (
                    <span className="sign-text-box-handle" onPointerDown={beginResizeBox(field.id)}/>
                  )}
                </div>
              ))}
              {pageDisplay && signaturePreview && pageDims && (
                <div
                  className="sign-overlay"
                  style={{ left: `${(activeSignature ? activeSignature.fx : sigPlacement.fx) * 100}%`, top: `${(activeSignature ? activeSignature.fy : sigPlacement.fy) * 100}%`, width: `${(activeSignature ? activeSignature.fw : sigPlacement.fw) * 100}%` }}
                  onPointerDown={beginSigDrag('move')}
                >
                  <img src={signaturePreview.dataUrl} alt="Signature" draggable="false"/>
                  <span className="sign-handle" onPointerDown={beginSigDrag('resize')}/>
                </div>
              )}
              {rendering && <div className="sign-loading">{pageDisplay ? 'Rendering page…' : 'Opening PDF…'}</div>}
            </div>
          </div>
          <p className="sign-hint">
            {toolMode === 'text'
              ? 'Drag on the page to draw a text box, then type your answer inside it. Drag the box border to move, or the corner handle to resize.'
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
              <p className="sign-hint">For flat forms like bank authority forms — draw a box over each answer field, then type directly on the page.</p>
              <div className="sign-text-toolbar">
                <label>
                  Text size
                  <input type="range" min="8" max="18" value={textSize} onChange={event => {
                    const size = Number(event.target.value);
                    setTextSize(size);
                    if (selectedTextId) updateTextField(selectedTextId, { size });
                  }}/>
                  {textSize} pt
                </label>
                {selectedField && (
                  <button type="button" className="button secondary compact" onClick={() => removeTextField(selectedField.id)}>Remove selected box</button>
                )}
              </div>
              {pageTextFields.length > 0 && (
                <div className="sign-text-list">
                  {pageTextFields.map(field => (
                    <button
                      key={field.id}
                      type="button"
                      className={`sign-text-list-item${selectedTextId === field.id ? ' active' : ''}`}
                      onClick={() => {
                        setSelectedTextId(field.id);
                        inlineInputRefs.current[field.id]?.focus();
                      }}
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
    <p className="tool-footnote">Fill flat PDF forms by drawing text boxes on the page, add a signature if needed, then download once. For PDFs with built-in fillable fields, use PDF Form Filler instead. For legally binding e-signatures, use a dedicated service with audit trails.</p>
  </>;
}
