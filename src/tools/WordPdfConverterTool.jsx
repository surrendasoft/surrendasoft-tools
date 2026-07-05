import { useEffect, useState } from 'react';
import { formatBytes } from '../utils/format.js';
import { FileDrop, FileList } from '../components/FileInputs.jsx';
import { blocksToPdf, docxToBlocks, downloadFile, linesToDocx, pdfToLines } from '../utils/wordPdfConvert.js';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export default function WordPdfConverterTool() {
  const [mode, setMode] = useState('toPdf'); // 'toPdf' = Word → PDF, 'toWord' = PDF → Word
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result?.url]);

  const switchMode = next => { setMode(next); setFile(null); setResult(null); setError(''); };
  const choose = next => { setFile(next[0] || null); setResult(null); setError(''); };

  const convert = async () => {
    if (!file) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const title = file.name.replace(/\.[^.]+$/, '');
      if (mode === 'toPdf') {
        const blocks = await docxToBlocks(await file.arrayBuffer());
        if (!blocks.length) throw new Error('No readable text was found in this document.');
        const bytes = await blocksToPdf(blocks, title);
        setResult({ blob: new Blob([bytes], { type: 'application/pdf' }), name: `${title}.pdf`, size: bytes.length });
      } else {
        const { pages } = await pdfToLines(await file.arrayBuffer());
        if (!pages.some(page => page.lines.length)) throw new Error('No readable text was found in this PDF. Scanned/image-only PDFs are not supported.');
        const blob = await linesToDocx(pages, title);
        setResult({ blob, name: `${title}.docx`, size: blob.size });
      }
    } catch (err) {
      setError(err.message || 'Could not convert this file.');
    }
    setBusy(false);
  };

  const download = () => {
    if (!result) return;
    downloadFile(result.name, result.blob);
  };

  return <div className="wpc-root">
    <div className="segmented">
      <button className={mode === 'toPdf' ? 'active' : ''} onClick={() => switchMode('toPdf')}>Word → PDF</button>
      <button className={mode === 'toWord' ? 'active' : ''} onClick={() => switchMode('toWord')}>PDF → Word</button>
    </div>

    {!file
      ? <FileDrop
          accept={mode === 'toPdf' ? `${DOCX_MIME},.docx` : 'application/pdf'}
          onFiles={choose}
          title={mode === 'toPdf' ? 'Choose a Word document (.docx)' : 'Choose a PDF'}
          hint={mode === 'toPdf' ? 'Text, headings, bold/italic, and lists convert to PDF' : 'Text is extracted into an editable Word document'}
        />
      : <FileList files={[file]} onRemove={() => choose([])}/>}

    {file && <button className="button primary pdf-action" onClick={convert} disabled={busy}>
      {busy ? 'Converting…' : mode === 'toPdf' ? 'Convert to PDF' : 'Convert to Word'}
    </button>}

    {error && <p className="pdf-error">{error}</p>}

    {result && <div className="pdf-result">
      <div><strong>{mode === 'toPdf' ? 'PDF ready' : 'Word document ready'}</strong><span>{formatBytes(result.size)}</span></div>
      <button className="button primary compact" onClick={download}>Download {mode === 'toPdf' ? 'PDF' : 'Word file'}</button>
    </div>}

    <p className="tool-footnote">Basic, text-level conversion — paragraphs, headings, bold/italic, and lists carry over. Images, tables, columns, and exact page layout are not preserved, since everything runs in your browser with no Office engine or server involved.</p>
  </div>;
}
