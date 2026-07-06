import { useEffect, useRef, useState } from 'react';
import ToolGlyph from '../components/ToolGlyph.jsx';
import { formatBytes } from '../utils/format.js';
import { buildPdfFromPages, createPageState, deletePageState, extractPdfPages, movePageState, rotatePageState } from '../utils/pdfPages.js';
import { FileDrop } from '../components/FileInputs.jsx';
import './PdfPageTool.css';

export default function PdfPageTool() {
  const [file, setFile] = useState(null);
  const [sourceBytes, setSourceBytes] = useState(null);
  const [pages, setPages] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const pdfDocRef = useRef(null);
  const thumbRefs = useRef(new Map());

  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result?.url]);

  const reset = () => {
    setFile(null); setSourceBytes(null); setPages([]); setSelected(new Set()); setError(''); setResult(null); pdfDocRef.current = null; thumbRefs.current.clear();
  };

  const loadPdf = async sourceFile => {
    setLoading(true); setError(''); setResult(null);
    try {
      const bytes = new Uint8Array(await sourceFile.arrayBuffer());
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
      pdfDocRef.current = doc;
      setFile(sourceFile);
      setSourceBytes(bytes);
      const nextPages = createPageState(doc.numPages);
      setPages(nextPages);
      setSelected(new Set(nextPages.map(page => page.id)));
    } catch (loadError) {
      setError(loadError.message || 'Could not open this PDF.');
      reset();
    }
    setLoading(false);
  };

  useEffect(() => {
    const doc = pdfDocRef.current;
    if (!doc || !pages.length) return undefined;
    let cancelled = false;
    const renderThumbs = async () => {
      for (const page of pages) {
        if (cancelled) return;
        const canvas = thumbRefs.current.get(page.id);
        if (!canvas) continue;
        try {
          const pdfPage = await doc.getPage(page.sourceIndex + 1);
          const viewport = pdfPage.getViewport({ scale: 0.22 });
          canvas.width = viewport.width; canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
      await pdfPage.render({ canvasContext: ctx, viewport }).promise;
        } catch { /* thumbnail preview is best-effort */ }
      }
    };
    renderThumbs();
    return () => { cancelled = true; };
  }, [pages]);

  const updatePages = updater => { setPages(current => updater(current)); setResult(null); };
  const toggleSelected = id => setSelected(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const downloadEdited = async () => {
    if (!sourceBytes || !pages.length) return;
    setBusy(true); setError('');
    try {
      const bytes = await buildPdfFromPages(sourceBytes, pages);
      setResult({ url: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), size: bytes.length, name: `${file.name.replace(/\.pdf$/i, '')}-edited.pdf` });
    } catch (downloadError) { setError(downloadError.message || 'Could not build the edited PDF.'); }
    setBusy(false);
  };

  const downloadExtract = async () => {
    if (!sourceBytes || !pages.length) return;
    setBusy(true); setError('');
    try {
      const bytes = await extractPdfPages(sourceBytes, pages, selected);
      setResult({ url: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), size: bytes.length, name: `${file.name.replace(/\.pdf$/i, '')}-extract.pdf` });
    } catch (downloadError) { setError(downloadError.message || 'Could not extract the selected pages.'); }
    setBusy(false);
  };

  return <div className="ppt-root">
    <div className="ppt-local"><ToolGlyph name="files" size={22}/><div><strong>Edit PDF pages in your browser</strong><span>Reorder, rotate, delete, or extract pages locally — your PDF is never uploaded.</span></div></div>
    {!file ? <>
      <FileDrop accept="application/pdf" onFiles={files => files[0] && loadPdf(files[0])} title="Choose a PDF to edit" hint="Encrypted PDFs may not be supported"/>
      {loading && <p className="ppt-loading" role="status"><ToolGlyph name="refresh" size={16}/> Opening PDF…</p>}
    </> : <>
      <div className="ppt-file-bar"><div><strong>{file.name}</strong><span>{pages.length} page{pages.length === 1 ? '' : 's'} · {formatBytes(file.size)}</span></div><button className="button secondary compact" onClick={reset}>Choose another PDF</button></div>
      <div className="ppt-pages" role="list" aria-label="PDF pages">
        {pages.map((page, index) => <article className="ppt-page" key={page.id} role="listitem">
          <label className="ppt-select"><input type="checkbox" checked={selected.has(page.id)} onChange={() => toggleSelected(page.id)} aria-label={`Select page ${index + 1}`}/></label>
          <div className="ppt-thumb-wrap" data-rotation={page.rotation}>
            <canvas ref={node => { if (node) thumbRefs.current.set(page.id, node); else thumbRefs.current.delete(page.id); }}/>
          </div>
          <div className="ppt-page-meta"><strong>Page {index + 1}</strong><span>Source page {page.sourceIndex + 1}{page.rotation ? ` · rotated ${page.rotation}°` : ''}</span></div>
          <div className="ppt-page-actions">
            <button className="button secondary compact" aria-label={`Move page ${index + 1} up`} disabled={index === 0} onClick={() => updatePages(current => movePageState(current, page.id, -1))}><ToolGlyph name="chevronUp" size={15}/></button>
            <button className="button secondary compact" aria-label={`Move page ${index + 1} down`} disabled={index === pages.length - 1} onClick={() => updatePages(current => movePageState(current, page.id, 1))}><ToolGlyph name="chevronDown" size={15}/></button>
            <button className="button secondary compact" aria-label={`Rotate page ${index + 1}`} onClick={() => updatePages(current => rotatePageState(current, page.id, 1))}><ToolGlyph name="refresh" size={15}/></button>
            <button className="button secondary compact" aria-label={`Delete page ${index + 1}`} disabled={pages.length === 1} onClick={() => { try { updatePages(current => deletePageState(current, page.id)); setSelected(current => { const next = new Set(current); next.delete(page.id); return next; }); } catch (deleteError) { setError(deleteError.message); } }}><ToolGlyph name="trash" size={15}/></button>
          </div>
        </article>)}
      </div>
      <div className="ppt-actions">
        <button className="button primary pdf-action" onClick={downloadEdited} disabled={busy || !pages.length}>{busy ? 'Building PDF…' : 'Download edited PDF'}</button>
        <button className="button secondary" onClick={downloadExtract} disabled={busy || selected.size === 0}>{busy ? 'Extracting…' : `Extract ${selected.size} selected page${selected.size === 1 ? '' : 's'}`}</button>
      </div>
    </>}
    {error && <p className="pdf-error">{error}</p>}
    {result && <div className="pdf-result"><div><strong>PDF ready</strong><span>{formatBytes(result.size)} · generated in your browser</span></div><a className="button primary compact" href={result.url} download={result.name}>Download PDF</a></div>}
  </div>;
}
