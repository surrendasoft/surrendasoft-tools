import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import ToolGlyph from '../components/ToolGlyph.jsx';
import { FileDrop } from '../components/FileInputs.jsx';
import { formatBytes } from '../utils/format.js';
import {
  MAX_PDF_FORM_BYTES, fillPdfForm, readPdfFormFields, valuesFromFields,
} from '../utils/pdfForm.js';
import './PdfFormTool.css';

function FieldEditor({ field, onChange }) {
  const disabled = field.readOnly;

  if (field.type === 'checkbox') {
    return <label className="pdfform-check">
      <input type="checkbox" checked={!!field.value} disabled={disabled} onChange={event => onChange(event.target.checked)}/>
      {field.label}
    </label>;
  }

  if (field.type === 'dropdown') {
    return <>
      <label>{field.label}<small>{field.name}</small></label>
      <select value={field.value || ''} disabled={disabled} onChange={event => onChange(event.target.value)}>
        <option value="">Select…</option>
        {field.options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </>;
  }

  if (field.type === 'radio') {
    return <>
      <label>{field.label}<small>{field.name}</small></label>
      <div className="pdfform-radio-group" role="radiogroup" aria-label={field.label}>
        {field.options.map(option => <label key={option} className="pdfform-radio-option">
          <input
            type="radio"
            name={field.name}
            value={option}
            checked={field.value === option}
            disabled={disabled}
            onChange={() => onChange(option)}
          />
          {option}
        </label>)}
      </div>
    </>;
  }

  if (field.type === 'optionlist') {
    const selected = new Set(Array.isArray(field.value) ? field.value : []);
    return <>
      <label>{field.label}<small>{field.name}</small></label>
      <div className="pdfform-option-list">
        {field.options.map(option => <label key={option} className="pdfform-check">
          <input
            type="checkbox"
            checked={selected.has(option)}
            disabled={disabled}
            onChange={event => {
              const next = new Set(selected);
              if (event.target.checked) next.add(option);
              else next.delete(option);
              onChange([...next]);
            }}
          />
          {option}
        </label>)}
      </div>
    </>;
  }

  if (field.type === 'signature') {
    return <>
      <label>{field.label}<small>{field.name}</small></label>
      <p className="pdfform-signature-note">Signature fields must be signed in a PDF reader. This tool cannot edit them.</p>
    </>;
  }

  if (field.type === 'unknown') {
    return <>
      <label>{field.label}<small>{field.name}</small></label>
      <p className="pdfform-signature-note">This field type is not editable here.</p>
    </>;
  }

  return <>
    <label>{field.label}<small>{field.name}</small></label>
    {field.multiline ? (
      <textarea value={field.value || ''} disabled={disabled} onChange={event => onChange(event.target.value)}/>
    ) : (
      <input type="text" value={field.value || ''} disabled={disabled} onChange={event => onChange(event.target.value)}/>
    )}
  </>;
}

export default function PdfFormTool() {
  const [file, setFile] = useState(null);
  const [sourceBytes, setSourceBytes] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fields, setFields] = useState([]);
  const [initialValues, setInitialValues] = useState({});
  const [hasXFA, setHasXFA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const previewUrlRef = useRef('');

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    if (result?.url) URL.revokeObjectURL(result.url);
  }, [result?.url]);

  const editableCount = useMemo(
    () => fields.filter(field => !field.readOnly && field.type !== 'signature' && field.type !== 'unknown').length,
    [fields],
  );

  const resetAll = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = '';
    setFile(null);
    setSourceBytes(null);
    setPreviewUrl('');
    setFields([]);
    setInitialValues({});
    setHasXFA(false);
    setError('');
    setResult(current => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const loadPdf = async sourceFile => {
    setLoading(true);
    setError('');
    setResult(current => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });

    try {
      if (!sourceFile.type.includes('pdf') && !sourceFile.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('Choose a PDF file.');
      }
      if (sourceFile.size > MAX_PDF_FORM_BYTES) {
        throw new Error(`This PDF is too large (${formatBytes(sourceFile.size)}). Try a file under ${formatBytes(MAX_PDF_FORM_BYTES)}.`);
      }

      const bytes = new Uint8Array(await sourceFile.arrayBuffer());
      const formInfo = await readPdfFormFields(bytes);
      if (!formInfo.fields.length) {
        throw new Error('No editable form fields were found in this PDF. It may be a flat PDF, or use XFA forms that are not supported here.');
      }

      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      previewUrlRef.current = url;

      setFile(sourceFile);
      setSourceBytes(bytes);
      setPreviewUrl(url);
      setFields(formInfo.fields);
      setInitialValues(valuesFromFields(formInfo.fields));
      setHasXFA(formInfo.hasXFA);
    } catch (loadError) {
      const message = loadError.message || 'Could not read this PDF.';
      resetAll();
      setError(message);
    }
    setLoading(false);
  };

  const updateField = (name, value) => {
    setFields(current => current.map(field => (field.name === name ? { ...field, value } : field)));
    setResult(current => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const restoreOriginal = () => {
    setFields(current => current.map(field => ({ ...field, value: initialValues[field.name] })));
    setResult(current => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const exportPdf = async () => {
    if (!sourceBytes || busy) return;
    setBusy(true);
    setError('');
    try {
      const bytes = await fillPdfForm(sourceBytes, valuesFromFields(fields));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      setResult({
        url,
        size: bytes.length,
        name: `${file.name.replace(/\.pdf$/i, '')}-filled.pdf`,
      });
    } catch (exportError) {
      setError(exportError.message || 'Could not save the filled PDF.');
    }
    setBusy(false);
  };

  const download = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.url;
    link.download = result.name;
    link.click();
  };

  return <div className="pdfform-root">
    {!file ? (
      <>
        <FileDrop
          accept="application/pdf,.pdf"
          onFiles={files => files[0] && loadPdf(files[0])}
          title="Drop a PDF with fillable form fields"
          hint="AcroForm PDFs only · up to 25 MB · nothing is uploaded"
        />
        {loading && <p className="pdfform-warning">Reading form fields…</p>}
        {error && <p className="pdf-error">{error}</p>}
      </>
    ) : (
      <div className="pdfform-workspace">
        <section className="pdfform-preview">
          <div className="pdfform-preview-head">
            <div><strong>{file.name}</strong><span>{formatBytes(file.size)} · {fields.length} field{fields.length === 1 ? '' : 's'}</span></div>
            <button type="button" className="button secondary compact" onClick={resetAll}>Choose another PDF</button>
          </div>
          <div className="pdfform-preview-frame">
            <iframe src={previewUrl} title="PDF preview"/>
          </div>
        </section>

        <section className="pdfform-fields-panel">
          <div className="pdfform-fields-head">
            <div><strong>Form fields</strong><span>{editableCount} editable · fill in the values below</span></div>
          </div>

          {hasXFA && <p className="pdfform-warning">This PDF also contains XFA form data. Those fields are ignored here — only standard AcroForm fields are shown.</p>}
          {error && <p className="pdf-error">{error}</p>}

          <div className="pdfform-fields">
            {fields.map(field => (
              <div key={field.id} className={`pdfform-field${field.readOnly ? ' pdfform-field-readonly' : ''}`}>
                <FieldEditor field={field} onChange={value => updateField(field.name, value)}/>
              </div>
            ))}
          </div>
        </section>

        <div className="pdfform-actions">
          <button type="button" className="button primary" onClick={exportPdf} disabled={busy || editableCount === 0}>
            <ToolGlyph name="download" size={17}/>
            {busy ? 'Saving PDF…' : 'Download filled PDF'}
          </button>
          <button type="button" className="button secondary" onClick={restoreOriginal} disabled={busy}>Reset fields</button>
          {result && <button type="button" className="button secondary" onClick={download}>
            <Icon name="arrow" size={16}/>
            Download {result.name}
          </button>}
        </div>
      </div>
    )}

    <p className="tool-footnote">
      Form filling runs entirely in your browser with pdf-lib. Your PDF is not uploaded. Signature fields and some advanced field types may still need a desktop PDF reader.
    </p>
  </div>;
}
