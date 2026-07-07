import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { FileDrop } from '../components/FileInputs.jsx';
import { formatBytes } from '../utils/format.js';
import { createOcrWorker, createImageThumbnailUrl, createPdfThumbnailUrl, detectFileKind, extractDocxText, extractImageText, extractPdfText, extractPlainText } from '../utils/textExtract.js';
import './TextExtractorTool.css';

const ACCEPT = [
  'image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/gif',
  'application/pdf', '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx',
  'text/plain', '.txt', '.md', '.markdown', '.csv', '.tsv', 'application/json', '.json',
  '.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.htm', '.xml', '.yml', '.yaml', '.log',
].join(',');

const KIND_LABEL = { image: 'Image · OCR', pdf: 'PDF', docx: 'Word doc', text: 'Text file' };
const STATUS_LABEL = { queued: 'Queued', working: 'Extracting', done: 'Done', error: 'Failed' };
const THUMB_FALLBACK = { image: 'IMG', pdf: 'PDF', docx: 'DOC', text: 'TXT', unsupported: '?' };

function revokeThumbnail(item) {
  if (item?.thumbnailRevoke && item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
}

function FileThumbnail({ item, large = false }) {
  const className = `txtx-file-thumb${large ? ' txtx-file-thumb-large' : ''}${item.thumbnailUrl ? '' : ' txtx-file-thumb-fallback'}`;
  if (item.thumbnailUrl) {
    return <img src={item.thumbnailUrl} alt="" className={className}/>;
  }
  return <span className={className} aria-hidden="true">{THUMB_FALLBACK[item.kind] || '?'}</span>;
}

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

function wordCount(text) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export default function TextExtractorTool() {
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const ocrWorkerRef = useRef(null);
  const progressHandlerRef = useRef(null);
  const processingRef = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => () => {
    ocrWorkerRef.current?.then(worker => worker.terminate()).catch(() => {});
    itemsRef.current.forEach(revokeThumbnail);
  }, []);

  useEffect(() => {
    let cancelled = false;
    items
      .filter(item => item.kind === 'pdf' && !item.thumbnailUrl)
      .forEach(item => {
        (async () => {
          try {
            const url = await createPdfThumbnailUrl(await item.file.arrayBuffer());
            if (!cancelled) updateItem(item.id, { thumbnailUrl: url, thumbnailRevoke: false });
          } catch { /* thumbnail preview is best-effort */ }
        })();
      });
    return () => { cancelled = true; };
  }, [items]);

  useEffect(() => {
    if (!items.length) {
      setActiveId('');
      return;
    }
    if (!activeId || !items.some(item => item.id === activeId)) {
      setActiveId(items[items.length - 1].id);
    }
  }, [items, activeId]);

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
    const additions = files.map(file => {
      const kind = detectFileKind(file);
      return {
        id: `f${nextItemId++}`,
        file,
        kind,
        status: 'queued',
        progress: 0,
        text: '',
        pages: [],
        error: '',
        thumbnailUrl: kind === 'image' ? createImageThumbnailUrl(file) : '',
        thumbnailRevoke: kind === 'image',
      };
    });
    if (additions.length) {
      setItems(current => [...current, ...additions]);
      setActiveId(additions[additions.length - 1].id);
    }
  };

  const removeItem = id => {
    setItems(current => {
      const item = current.find(entry => entry.id === id);
      if (item) revokeThumbnail(item);
      return current.filter(entry => entry.id !== id || entry.status === 'working');
    });
  };

  const clearFinished = () => {
    setItems(current => {
      current.filter(item => item.status !== 'working' && item.status !== 'queued').forEach(revokeThumbnail);
      return current.filter(item => item.status === 'working' || item.status === 'queued');
    });
  };

  useEffect(() => {
    if (processingRef.current) return;
    const next = items.find(item => item.status === 'queued');
    if (!next) return;
    processingRef.current = true;
    setActiveId(next.id);

    (async () => {
      updateItem(next.id, { status: 'working', progress: 0 });
      try {
        if (next.kind === 'unsupported') {
          throw new Error("This file type isn't supported. Try an image, PDF, .docx, or a plain text file.");
        } else if (next.kind === 'text') {
          const text = await extractPlainText(next.file);
          processingRef.current = false;
          updateItem(next.id, { status: 'done', text, progress: 100 });
        } else if (next.kind === 'docx') {
          const text = await extractDocxText(await next.file.arrayBuffer());
          processingRef.current = false;
          updateItem(next.id, { status: 'done', text, progress: 100 });
          if (!text) updateItem(next.id, { error: 'No readable text was found in this document.' });
        } else if (next.kind === 'image') {
          const worker = await ensureOcrWorker();
          progressHandlerRef.current = progress => updateItem(next.id, { progress: Math.round(progress * 100) });
          const text = await extractImageText(next.file, worker);
          progressHandlerRef.current = null;
          processingRef.current = false;
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
          processingRef.current = false;
          updateItem(next.id, { status: 'done', text, pages, progress: 100 });
        }
      } catch (err) {
        processingRef.current = false;
        updateItem(next.id, { status: 'error', error: err.message || 'Could not extract text from this file.' });
      }
    })();
  }, [items]);

  const copyText = async (id, text) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(current => (current === id ? '' : current)), 1800);
  };

  const activeItem = items.find(item => item.id === activeId);
  const doneItems = items.filter(item => item.status === 'done');
  const outputText = activeItem?.status === 'done' ? (activeItem.text || '') : '';
  const outputPlaceholder = !activeItem
    ? 'Extracted text will appear here…'
    : activeItem.status === 'queued'
      ? 'Waiting in queue…'
      : activeItem.status === 'working'
        ? `Extracting text… ${activeItem.progress}%`
        : activeItem.status === 'error'
          ? activeItem.error
          : '(no text found)';

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
        <div className="txtx-workspace">
          <div className="txtx-files" role="tablist" aria-label="Uploaded files">
            {items.map(item => (
              <div key={item.id} className={`txtx-file-chip txtx-${item.status}${activeId === item.id ? ' active' : ''}`}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeId === item.id}
                  className="txtx-file-chip-main"
                  onClick={() => setActiveId(item.id)}
                >
                  <FileThumbnail item={item}/>
                  <span className="txtx-file-name">{item.file.name}</span>
                  <span className="txtx-file-kind">{KIND_LABEL[item.kind] || 'Unsupported'} · {STATUS_LABEL[item.status]}</span>
                </button>
                {item.status !== 'working' && (
                  <button type="button" className="txtx-file-remove" aria-label={`Remove ${item.file.name}`} onClick={() => removeItem(item.id)}>×</button>
                )}
              </div>
            ))}
          </div>

          <section className="txtx-output" aria-live="polite">
            <div className="txtx-output-head">
              {activeItem && <FileThumbnail item={activeItem} large/>}
              <div className="txtx-output-head-copy">
                <label className="txtx-output-label" htmlFor="txtx-output-field">
                  Extracted text
                  {activeItem && <span>{activeItem.file.name} · {formatBytes(activeItem.file.size)}</span>}
                </label>
                {activeItem?.status === 'working' && (
                  <span className="txtx-output-progress-label">{activeItem.progress}%</span>
                )}
              </div>
            </div>

            {activeItem?.status === 'working' && (
              <div className="txtx-progress" aria-hidden="true"><span style={{ width: `${activeItem.progress}%` }}/></div>
            )}

            {activeItem?.status === 'error' && <p className="pdf-error txtx-output-error">{activeItem.error}</p>}
            {activeItem?.status === 'done' && activeItem.error && <p className="txtx-warning">{activeItem.error}</p>}

            <textarea
              id="txtx-output-field"
              className="txtx-text"
              readOnly
              value={outputText}
              placeholder={activeItem?.status === 'error' ? '' : outputPlaceholder}
              rows={12}
            />

            <div className="txtx-output-actions">
              <span className="txtx-output-stats">
                {activeItem?.status === 'done'
                  ? `${wordCount(outputText)} words · ${outputText.length} characters`
                  : activeItem?.status === 'working'
                    ? 'Processing in your browser…'
                    : '\u00a0'}
              </span>
              <div className="txtx-output-buttons">
                <button
                  type="button"
                  className="button secondary compact"
                  onClick={() => copyText(activeItem.id, outputText)}
                  disabled={activeItem?.status !== 'done' || !outputText}
                >
                  <Icon name={copiedId === activeItem?.id ? 'check' : 'copy'} size={16}/>
                  {copiedId === activeItem?.id ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  className="button primary compact"
                  onClick={() => downloadText(textFileName(activeItem.file.name), outputText)}
                  disabled={activeItem?.status !== 'done' || !outputText}
                >
                  Download .txt
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {doneItems.length > 1 && (
        <div className="txtx-batch-actions">
          <button type="button" className="button secondary compact" onClick={copyAll}>
            <Icon name={copiedId === 'all' ? 'check' : 'copy'} size={16}/>
            {copiedId === 'all' ? 'Copied all' : 'Copy all text'}
          </button>
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
