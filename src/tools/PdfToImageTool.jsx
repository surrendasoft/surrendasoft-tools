import { useEffect, useState } from 'react';
import { formatBytes } from '../utils/format.js';
import { FileDrop, FileList } from '../components/FileInputs.jsx';

export default function PdfToImageTool() {
  const [file, setFile] = useState(null), [busy, setBusy] = useState(false), [outputs, setOutputs] = useState([]), [error, setError] = useState('');
  useEffect(() => () => outputs.forEach(output => URL.revokeObjectURL(output.url)), [outputs]);
  const choose = next => { setFile(next[0] || null); setOutputs([]); setError(''); };
  const convert = async () => {
    if (!file) return;
    setBusy(true); setError(''); setOutputs([]);
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const pages = [];
      for (let number = 1; number <= document.numPages; number++) {
        const page = await document.getPage(number), viewport = page.getViewport({ scale: 1.6 });
        const canvas = window.document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (blob) pages.push({ url: URL.createObjectURL(blob), size: blob.size, name: `page-${number}.png`, number });
      }
      setOutputs(pages);
    } catch (err) { setError(err.message || 'Could not read this PDF.'); }
    setBusy(false);
  };
  return <>{!file ? <FileDrop accept="application/pdf" onFiles={choose} title="Choose a PDF" hint="Every page will be converted locally to PNG"/> : <FileList files={[file]} onRemove={() => choose([])}/>} {file && <button className="button primary pdf-action" onClick={convert} disabled={busy}>{busy ? 'Rendering pages…' : 'Convert to images'}</button>}{error && <p className="pdf-error">{error}</p>}{outputs.length > 0 && <div className="page-outputs"><div className="output-heading"><strong>{outputs.length} images ready</strong><span>PNG · 1.6× quality</span></div>{outputs.map(output => <div key={output.name}><img src={output.url} alt={`PDF page ${output.number}`}/><p><strong>Page {output.number}</strong><small>{formatBytes(output.size)}</small></p><a href={output.url} download={output.name}>Download PNG</a></div>)}</div>}</>;
}
