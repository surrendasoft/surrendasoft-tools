import { useEffect, useRef, useState } from 'react';
import { FileDrop } from '../components/FileInputs.jsx';
import { formatBytes } from '../utils/format.js';
import { createOcrWorker, detectFileKind, extractDocxText, extractImageText, extractPdfText, extractPlainText } from '../utils/textExtract.js';
import './TextExtractorTool.css';

const ACCEPT = [
  'image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/gif',
  'application/pdf', '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx',
  'text/plain', '.txt', '.md', '.markdown', '.csv', '.tsv', 'application/json', '.json',
  '.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.htm', '.xml', '.yml', '.yaml', '.log',
].join(',');

const KIND_LABEL = { image: 'Image · OCR', pdf: 'PDF', docx: 'Word doc', text: 'Text file' };
const STATUS_LABEL = { queued: 'Queued', working: 'Extracting…', done: 'Done', error: 'Failed' };

let nextItemId = 0;

function downloadText(filename, text) {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([text], { type: 'text/plain' })),
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

function textFileName(name) {
  return `${name.replace(/\.[^./]+$/, '') || name}.txt`;
}

export default function TextExtractorTool() {
  const [items, setItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState('');
  const ocrWorkerRef = useRef(null);
  const progressHandlerRef = useRef(null);
  const processingRef = useRef(false);

  useEffect(() => () => {
    ocrWorkerRef.current?.then(worker => worker.terminate()).catch(() => {});
  }, []);

  const updateItem = (id, patch) => {
    setItems(current => current.map(item => (item.id === id ? { ...item, ...patch } : item)));
  };

  const ensureOcrWorker = () => {
    if (!ocrWorkerRef.current) {
      ocrWorkerRef.current = createOcrWorker(message => {
        if (message.status === 'recognizing text' && typeof message.progress === 'number') {
          progressHandlerRef.current?.(message.progress);
        }
      });
    }
    return ocrWorkerRef.current;
  };

  const addFiles = files => {
    const additions = files.map(file => ({
      id: `f${nextItemId++}`,
      file,
      kind: detectFileKind(file),
      status: 'queued',
      progress: 0,
      text: '',
      pages: [],
      error: '',
    }));
    if (additions.length) setItems(current => [...current, ...additions]);
  };

  const removeItem = id => {
    setItems(current => current.filter(item => item.id !== id || item.status === 'working'));
    if (expandedId === id) setExpandedId(null);
  };

  const clearFinished = () => {
    setItems(current => current.filter(item => item.status === 'working' || item.status === 'queued'));
  };

  useEffect(() => {
    if (processingRef.current) return;
    const next = items.find(item => item.status === 'queued');
    if (!next) return;
    processingRef.current = true;

    (async () => {
      updateItem(next.id, { status: 'working', progress: 0 });
      try {
        if (next.kind === 'unsupported') {
          throw new Error("This file type isn't supported. Try an image, PDF, .docx, or a plain text file.");
        } else if (next.kind === 'text') {
          const text = await extractPlainText(next.file);
          updateItem(next.id, { status: 'done', text, progress: 100 });
        } else if (next.kind === 'docx') {
          const text = await extractDocxText(await next.file.arrayBuffer());
          updateItem(next.id, { status: 'done', text, progress: 100 });
          if (!text) updateItem(next.id, { error: 'No readable text was found in this document.' });
        } else if (next.kind === 'image') {
          const worker = await ensureOcrWorker();
          progressHandlerRef.current = progress => updateItem(next.id, { progress: Math.round(progress * 100) });
          const text = await extractImageText(next.file, worker);
          progressHandlerRef.current = null;
          updateItem(next.id, { status: 'done', text, progress: 100 });
        } else if (next.kind === 'pdf') {
          const worker = await ensureOcrWorker();
          const pages = await extractPdfText(await next.file.arrayBuffer(), {
            ocrWorker: worker,
            onProgress: ({ page, total }) => updateItem(next.id, { progress: Math.round((page / total) * 100) }),
          });
          const text = pages
            .map(page => (pages.length > 1 ? `--- Page ${page.number} ---\n${page.text || '(no text found on this page)'}` : page.text))
            .join('\n\n');
          updateItem(next.id, { status: 'done', text, pages, progress: 100 });
        }
      } catch (err) {
        updateItem(next.id, { status: 'error', error: err.message || 'Could not extract text from this file.' });
      }
      processingRef.current = false;
    })();
  }, [items]);

  const copyText = async (id, text) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(current => (current === id ? '' : current)), 1800);
  };

  const doneItems = items.filter(item => item.status === 'done');

  const copyAll = () => copyText('all', doneItems.map(item => `# ${item.file.name}\n\n${item.text || '(no text found)'}`).join('\n\n---\n\n'));
  const downloadAll = () => downloadText('extracted-text.txt', doneItems.map(item => `# ${item.file.name}\n\n${item.text || '(no text found)'}`).join('\n\n---\n\n'));

  return (
    <div className="txtx-root">
      <FileDrop
        accept={ACCEPT}
        multiple
        onFiles={addFiles}
        title="Drop images, PDFs, Word docs, or text files"
        hint="Add as many as you like — files are processed one at a time"
      />

      {items.length > 0 && (
        <div className="txtx-queue">
          {items.map(item => (
            <div key={item.id} className={`txtx-item txtx-${item.status}`}>
              <div className="txtx-item-head" onClick={() => item.status === 'done' && setExpandedId(current => (current === item.id ? null : item.id))}>
                <div className="txtx-item-meta">
                  <strong>{item.file.name}</strong>
                  <span>{formatBytes(item.file.size)} · {KIND_LABEL[item.kind] || 'Unsupported'}</span>
                </div>
                <span className={`txtx-status txtx-status-${item.status}`}>{STATUS_LABEL[item.status]}</span>
                {item.status !== 'working' && (
                  <button type="button" className="txtx-remove" aria-label={`Remove ${item.file.name}`} onClick={event => { event.stopPropagation(); removeItem(item.id); }}>×</button>
                )}
              </div>

              {item.status === 'working' && (
                <div className="txtx-progress"><span style={{ width: `${item.progress}%` }}/></div>
              )}

              {item.status === 'error' && <p className="pdf-error">{item.error}</p>}

              {item.status === 'done' && (
                <>
                  {item.error && <p className="txtx-warning">{item.error}</p>}
                  {expandedId === item.id && (
                    <textarea className="txtx-text" readOnly value={item.text || '(no text found)'}/>
                  )}
                  <div className="txtx-item-actions">
                    <button type="button" className="button secondary compact" onClick={() => setExpandedId(current => (current === item.id ? null : item.id))}>
                      {expandedId === item.id ? 'Hide text' : 'View text'}
                    </button>
                    <button type="button" className="button secondary compact" onClick={() => copyText(item.id, item.text || '')} disabled={!item.text}>
                      {copiedId === item.id ? 'Copied!' : 'Copy'}
                    </button>
                    <button type="button" className="button primary compact" onClick={() => downloadText(textFileName(item.file.name), item.text || '')} disabled={!item.text}>
                      Download .txt
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {doneItems.length > 1 && (
        <div className="txtx-batch-actions">
          <button type="button" className="button secondary compact" onClick={copyAll}>{copiedId === 'all' ? 'Copied!' : 'Copy all text'}</button>
          <button type="button" className="button primary compact" onClick={downloadAll}>Download combined .txt</button>
          <button type="button" className="button secondary compact" onClick={clearFinished}>Clear finished</button>
        </div>
      )}

      <p className="tool-footnote">
        Extraction runs in your browser. Image and scanned-PDF recognition uses tesseract.js, which downloads its OCR engine and English language data from a public CDN the first time you use it — your files and photos are never uploaded, only recognised locally.
      </p>
    </div>
  );
}
