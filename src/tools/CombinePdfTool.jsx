import { useEffect, useState } from 'react';
import { formatBytes } from '../utils/format.js';
import { FileDrop, FileList } from '../components/FileInputs.jsx';

export default function CombinePdfTool() {
  const [files, setFiles] = useState([]), [busy, setBusy] = useState(false), [result, setResult] = useState(null), [error, setError] = useState('');
  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result?.url]);
  const move = (index, direction) => { const next = [...files], target = index + direction; [next[index], next[target]] = [next[target], next[index]]; setFiles(next); setResult(null); };
  const combine = async () => {
    if (files.length < 2) return;
    setBusy(true); setError('');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const merged = await PDFDocument.create();
      for (const file of files) {
        const source = await PDFDocument.load(await file.arrayBuffer());
        const pages = await merged.copyPages(source, source.getPageIndices());
        pages.forEach(page => merged.addPage(page));
      }
      const bytes = await merged.save();
      setResult({ url: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), size: bytes.length });
    } catch (err) { setError(err.message || 'Could not combine these PDFs. Encrypted files may not be supported.'); }
    setBusy(false);
  };
  return <><FileDrop accept="application/pdf" multiple onFiles={next => { setFiles(current => [...current, ...next]); setResult(null); setError(''); }} title="Choose PDF files" hint="Select at least two files; they stay on your device"/>{files.length > 0 && <FileList files={files} onRemove={index => setFiles(files.filter((_, i) => i !== index))} onMove={move}/>}<button className="button primary pdf-action" onClick={combine} disabled={files.length < 2 || busy}>{busy ? 'Combining PDFs…' : files.length < 2 ? 'Add at least two PDFs' : `Combine ${files.length} PDFs`}</button>{error && <p className="pdf-error">{error}</p>}{result && <div className="pdf-result"><div><strong>Combined PDF ready</strong><span>{files.length} files · {formatBytes(result.size)}</span></div><a className="button primary compact" href={result.url} download="surrendasoft-combined.pdf">Download PDF</a></div>}</>;
}
