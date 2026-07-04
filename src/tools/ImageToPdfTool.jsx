import { useEffect, useState } from 'react';
import { formatBytes } from '../utils/format.js';
import { FileDrop, FileList } from '../components/FileInputs.jsx';

export default function ImageToPdfTool() {
  const [files, setFiles] = useState([]), [pageStyle, setPageStyle] = useState('a4'), [busy, setBusy] = useState(false), [error, setError] = useState(''), [result, setResult] = useState(null);
  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result?.url]);
  const addFiles = next => { setFiles(current => [...current, ...next]); setResult(null); setError(''); };
  const createPdf = async () => {
    if (!files.length) return;
    setBusy(true); setError('');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdf = await PDFDocument.create();
      for (const file of files) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const image = file.type === 'image/png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const naturalWidth = image.width * .75, naturalHeight = image.height * .75;
        const pageWidth = pageStyle === 'fit' ? naturalWidth : 595.28, pageHeight = pageStyle === 'fit' ? naturalHeight : 841.89;
        const margin = pageStyle === 'fit' ? 0 : 36;
        const scale = Math.min((pageWidth - margin * 2) / naturalWidth, (pageHeight - margin * 2) / naturalHeight, 1);
        const width = naturalWidth * scale, height = naturalHeight * scale;
        const page = pdf.addPage([pageWidth, pageHeight]);
        page.drawImage(image, { x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height });
      }
      const bytes = await pdf.save();
      setResult({ url: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), size: bytes.length, name: 'surrendasoft-images.pdf' });
    } catch (err) { setError(err.message || 'Could not create the PDF.'); }
    setBusy(false);
  };
  return <><FileDrop accept="image/jpeg,image/png" multiple onFiles={addFiles} title="Choose JPG or PNG images" hint="Select several images to create a multi-page PDF"/>{files.length > 0 && <><FileList files={files} onRemove={index => setFiles(files.filter((_, i) => i !== index))}/><div className="pdf-options"><label>Page size<select value={pageStyle} onChange={event => setPageStyle(event.target.value)}><option value="a4">A4 portrait</option><option value="fit">Fit each image</option></select></label><span>{files.length} {files.length === 1 ? 'page' : 'pages'}</span></div><button className="button primary pdf-action" onClick={createPdf} disabled={busy}>{busy ? 'Creating PDF…' : 'Create PDF'}</button></>}{error && <p className="pdf-error">{error}</p>}{result && <div className="pdf-result"><div><strong>PDF ready</strong><span>{files.length} pages · {formatBytes(result.size)}</span></div><a className="button primary compact" href={result.url} download={result.name}>Download PDF</a></div>}</>;
}
