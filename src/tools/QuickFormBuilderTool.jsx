import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import ToolGlyph from '../components/ToolGlyph.jsx';
import ToolSharePanel from '../components/ToolSharePanel.jsx';
import { useShareUrl } from '../hooks/useShareUrl.js';
import { useEncodedLinkSize } from '../hooks/useEncodedLinkSize.js';
import { QR_URL_SAFE_LIMIT } from '../utils/binaryTransfer.js';
import {
  MAX_DESC_LEN,
  MAX_ENCODED_SOFT,
  MAX_FORM_FIELDS,
  MAX_LABEL_LEN,
  MAX_OPTIONS,
  MAX_OPTION_LEN,
  MAX_TITLE_LEN,
  MAX_VALUE_LEN,
  PRIVACY_WARNING,
  QUICKFORM_TOOL_ID,
  RATING_STAR_OPTIONS,
  blankField,
  blankForm,
  buildResponse,
  clientIntakeTemplate,
  defaultAnswerValue,
  downloadBytes,
  downloadText,
  feedbackTemplate,
  formCanShare,
  sanitizeForm,
  sanitizeResponse,
  responseToCsv,
  responseToText,
  FIELD_TYPES,
} from '../utils/quickForm.js';
import { buildFillablePdf, buildResponsePdf } from '../utils/quickFormPdf.js';
import { buildToolRouteUrl, buildToolShareUrl, readToolRouteFromHash, readToolShareFromHash, resetToolHash } from '../utils/toolShare.js';
import './QuickFormBuilderTool.css';

const typeMetaOf = type => FIELD_TYPES.find(t => t.id === type) || FIELD_TYPES[0];
const charCountClass = (len, max) => `qf-char-count${len >= max ? ' qf-char-max' : ''}`;

function LinkSizeGauge({ length, busy }) {
  if (!length) return busy ? <p className="qf-size-idle">Estimating link size…</p> : null;
  const pct = Math.min(100, Math.round((length / MAX_ENCODED_SOFT) * 100));
  const qrMarkerPct = Math.min(100, Math.round((QR_URL_SAFE_LIMIT / MAX_ENCODED_SOFT) * 100));
  const status = length <= QR_URL_SAFE_LIMIT ? 'ok' : length <= MAX_ENCODED_SOFT ? 'warn' : 'over';
  const statusText = {
    ok: 'Comfortably fits a QR code.',
    warn: 'Link will still work, but it’s too long for a reliable QR code — use Copy link instead.',
    over: 'This link is getting long. Consider trimming fields or text so it’s easy to share.',
  }[status];
  return (
    <div className={`qf-size-gauge qf-size-${status}`}>
      <div className="qf-size-head">
        <span><ToolGlyph name="qr" size={14}/> Estimated link size</span>
        <span>{length.toLocaleString()} chars</span>
      </div>
      <div className="qf-size-track">
        <div className="qf-size-fill" style={{ width: `${pct}%` }}/>
        <div className="qf-size-marker" style={{ left: `${qrMarkerPct}%` }} title={`QR code limit: ~${QR_URL_SAFE_LIMIT.toLocaleString()} characters`}/>
      </div>
      <p>{statusText}</p>
    </div>
  );
}

function StarRatingInput({ id, value, max = 5, onChange, required }) {
  const current = Number(value) || 0;
  return (
    <div className="qf-rating" id={id} role="radiogroup" aria-label="Rating">
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          className={`qf-star${n <= current ? ' filled' : ''}`}
          aria-pressed={n === current}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n === current && !required ? 0 : n)}
        >
          <ToolGlyph name="star" size={22} filled={n <= current}/>
        </button>
      ))}
      <span className="qf-rating-value">{current ? `${current}/${max}` : 'No rating yet'}</span>
    </div>
  );
}

function StaticStars({ value, max }) {
  return (
    <span className="qf-rating-static">
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <span key={n} className={n <= value ? 'qf-star-filled' : 'qf-star-empty'}>
          <ToolGlyph name="star" size={14} filled={n <= value}/>
        </span>
      ))}
    </span>
  );
}

function RangeSliderInput({ id, value, min, max, step, onChange }) {
  return (
    <div className="qf-range">
      <input type="range" id={id} min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}/>
      <div className="qf-range-scale"><span>{min}</span><strong>{value}</strong><span>{max}</span></div>
    </div>
  );
}

const MODE_META = {
  create: { label: 'Create mode', icon: 'clipboardList', tint: 'blue', heading: 'Simple forms, shared by link or QR', copy: 'Create a form, send the link, get answers back as another link. No login, no database.' },
  fill: { label: 'Fill-out mode', icon: 'signature', tint: 'purple', heading: "You've been sent a form", copy: 'Fill it out below, then share your answers back to the sender as a link or QR code.' },
  response: { label: 'Response received', icon: 'checkSquare', tint: 'mint', heading: 'Completed form', copy: "Here's what came back. Copy the answers or download them, or start your own form." },
};

function ModeBanner({ mode }) {
  const meta = MODE_META[mode] || MODE_META.create;
  return (
    <div className={`qf-intro qf-tint-${meta.tint}`}>
      <span className="qf-intro-icon"><ToolGlyph name={meta.icon} size={20}/></span>
      <div>
        <span className="qf-mode-badge">{meta.label}</span>
        <strong>{meta.heading}</strong>
        <span>{meta.copy}</span>
      </div>
    </div>
  );
}

function PrivacyNotice() {
  return <p className="qf-privacy"><ToolGlyph name="shieldAlert" size={16}/> {PRIVACY_WARNING}</p>;
}

function FieldEditor({ field, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const typeMeta = typeMetaOf(field.type);
  return (
    <div className={`qf-field-card qf-tint-${typeMeta.tint}`}>
      <div className="qf-field-head">
        <div className="qf-field-type">
          <span className="qf-type-badge"><ToolGlyph name={typeMeta.icon} size={15}/></span>
          <select value={field.type} onChange={e => onChange({ ...field, type: e.target.value })} aria-label="Field type">
            {FIELD_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div className="qf-field-move">
          <button type="button" disabled={isFirst} onClick={onMoveUp} aria-label="Move up"><ToolGlyph name="chevronUp" size={15}/></button>
          <button type="button" disabled={isLast} onClick={onMoveDown} aria-label="Move down"><ToolGlyph name="chevronDown" size={15}/></button>
          <button type="button" className="qf-field-remove" onClick={onRemove} aria-label="Remove field"><ToolGlyph name="close" size={15}/></button>
        </div>
      </div>
      <label>
        <span className="qf-label-row"><span>Label</span><span className={charCountClass(field.label.length, MAX_LABEL_LEN)}>{field.label.length}/{MAX_LABEL_LEN}</span></span>
        <input value={field.label} maxLength={MAX_LABEL_LEN} onChange={e => onChange({ ...field, label: e.target.value })}/>
      </label>
      {field.type !== 'checkbox' && field.type !== 'select' && field.type !== 'rating' && field.type !== 'range' && (
        <label>Placeholder<input value={field.placeholder} maxLength={MAX_LABEL_LEN} onChange={e => onChange({ ...field, placeholder: e.target.value })}/></label>
      )}
      {field.type === 'select' && (
        <label>Options <span className="qf-hint">one per line, up to {MAX_OPTIONS} · {MAX_OPTION_LEN} chars each</span>
          <textarea
            rows={3}
            value={field.options.join('\n')}
            onChange={e => onChange({ ...field, options: e.target.value.split('\n').slice(0, MAX_OPTIONS).map(o => o.slice(0, MAX_OPTION_LEN)) })}
            spellCheck={false}
          />
        </label>
      )}
      {field.type === 'rating' && (
        <label>Number of stars
          <select value={field.max ?? 5} onChange={e => onChange({ ...field, max: Number(e.target.value) })}>
            {RATING_STAR_OPTIONS.map(n => <option key={n} value={n}>{n} stars</option>)}
          </select>
        </label>
      )}
      {field.type === 'range' && (
        <div className="qf-range-config">
          <label>Min<input type="number" value={field.min ?? 0} onChange={e => onChange({ ...field, min: Number(e.target.value) })}/></label>
          <label>Max<input type="number" value={field.max ?? 10} onChange={e => onChange({ ...field, max: Number(e.target.value) })}/></label>
          <label>Step<input type="number" min="1" value={field.step ?? 1} onChange={e => onChange({ ...field, step: Number(e.target.value) })}/></label>
        </div>
      )}
      <label className="qf-required"><input type="checkbox" checked={field.required} onChange={e => onChange({ ...field, required: e.target.checked })}/> Required</label>
    </div>
  );
}

function FormRenderer({ form, values, onChange, idPrefix = 'qf' }) {
  return (
    <div className="qf-form-fields">
      {form.fields.map(field => {
        const typeMeta = typeMetaOf(field.type);
        const inputId = `${idPrefix}-${field.id}`;
        const common = {
          id: inputId,
          required: field.required,
          value: field.type === 'checkbox' ? undefined : (values[field.id] ?? ''),
          onChange: e => onChange(field.id, field.type === 'checkbox' ? e.target.checked : e.target.value),
        };
        return (
          <label key={field.id} className={`qf-fill-field qf-tint-${typeMeta.tint}${field.type === 'checkbox' ? ' qf-fill-check' : ''}`}>
            {field.type === 'checkbox' ? (
              <>
                <input type="checkbox" id={inputId} checked={Boolean(values[field.id])} onChange={e => onChange(field.id, e.target.checked)}/>
                <span className="qf-fill-label"><ToolGlyph name={typeMeta.icon} size={14}/> {field.label}{field.required ? ' *' : ''}</span>
              </>
            ) : (
              <>
                <span className="qf-fill-label"><ToolGlyph name={typeMeta.icon} size={14}/> {field.label}{field.required ? ' *' : ''}</span>
                {field.type === 'textarea' ? (
                  <>
                    <textarea {...common} maxLength={MAX_VALUE_LEN} rows={4} placeholder={field.placeholder}/>
                    <span className={`${charCountClass((values[field.id] ?? '').length, MAX_VALUE_LEN)} qf-textarea-count`}>{(values[field.id] ?? '').length}/{MAX_VALUE_LEN}</span>
                  </>
                ) : field.type === 'select' ? (
                  <select {...common} value={values[field.id] ?? ''}>
                    <option value="">Choose…</option>
                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : field.type === 'rating' ? (
                  <StarRatingInput id={inputId} value={values[field.id]} max={field.max} required={field.required} onChange={v => onChange(field.id, v)}/>
                ) : field.type === 'range' ? (
                  <RangeSliderInput id={inputId} value={values[field.id] ?? field.min} min={field.min} max={field.max} step={field.step} onChange={v => onChange(field.id, v)}/>
                ) : (
                  <input type={typeMeta.input} {...common} maxLength={typeMeta.input === 'number' ? undefined : MAX_VALUE_LEN} placeholder={field.placeholder}/>
                )}
              </>
            )}
          </label>
        );
      })}
    </div>
  );
}

function ResponseView({ response }) {
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const text = useMemo(() => responseToText(response), [response]);

  const copyAll = async () => {
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const downloadPdf = async () => {
    setPdfBusy(true);
    setPdfError('');
    try {
      const bytes = await buildResponsePdf(response);
      downloadBytes('completed-form.pdf', bytes);
    } catch {
      setPdfError('Could not build a PDF for this response.');
    }
    setPdfBusy(false);
  };

  return (
    <div className="qf-response">
      <header className="qf-response-head">
        <h2>{response.formTitle}</h2>
        <p>Submitted {new Date(response.submittedAt).toLocaleString()}</p>
      </header>
      <dl className="qf-response-list">
        {response.fields.map(f => {
          const typeMeta = typeMetaOf(f.type);
          const ratingMatch = f.type === 'rating' && f.value ? f.value.match(/^(\d+)\/(\d+)$/) : null;
          return (
            <div key={f.id} className={`qf-response-row qf-tint-${typeMeta.tint}`}>
              <dt><ToolGlyph name={typeMeta.icon} size={13}/> {f.label}</dt>
              <dd>{ratingMatch ? <StaticStars value={Number(ratingMatch[1])} max={Number(ratingMatch[2])}/> : (f.value || '—')}</dd>
            </div>
          );
        })}
      </dl>
      <div className="qf-response-actions">
        <button className="button primary compact" onClick={copyAll}><Icon name={copied ? 'check' : 'copy'} size={15}/>{copied ? 'Copied' : 'Copy all'}</button>
        <button className="button secondary compact" onClick={downloadPdf} disabled={pdfBusy}><ToolGlyph name="download" size={14}/> {pdfBusy ? 'Preparing PDF…' : 'Download PDF'}</button>
        <button className="button secondary compact" onClick={() => downloadText('completed-form.txt', text)}><ToolGlyph name="fileText" size={14}/> Download TXT</button>
        <button className="button secondary compact" onClick={() => downloadText('completed-form.csv', responseToCsv(response), 'text/csv')}><ToolGlyph name="layoutGrid" size={14}/> Download CSV</button>
        <button className="button secondary compact" onClick={() => downloadText('completed-form.json', JSON.stringify(response, null, 2), 'application/json')}><ToolGlyph name="braces" size={14}/> Download JSON</button>
      </div>
      {pdfError && <p className="pdf-error">{pdfError}</p>}
    </div>
  );
}

function usePreviewAnswers(fields) {
  const idsKey = fields.map(f => f.id).join(',');
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(f => [f.id, defaultAnswerValue(f)])));
  useEffect(() => {
    setValues(prev => Object.fromEntries(fields.map(f => [f.id, prev[f.id] ?? defaultAnswerValue(f)])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);
  return [values, setValues];
}

function FormPreview({ form }) {
  const [values, setValues] = usePreviewAnswers(form.fields);
  const onChange = (id, value) => setValues(prev => ({ ...prev, [id]: value }));

  return (
    <div className="qf-preview">
      <div className="qf-preview-topbar">
        <span className="qf-preview-dots"><i/><i/><i/></span>
        <span className="qf-preview-chip"><ToolGlyph name="monitor" size={13}/> Recipient view</span>
      </div>
      <div className="qf-preview-frame">
        <header className="qf-fill-head">
          <h2>{form.title || 'Untitled form'}</h2>
          {form.description && <p>{form.description}</p>}
        </header>
        <PrivacyNotice/>
        {form.fields.length === 0 ? (
          <p className="qf-empty">Add a field on the Build tab to see how the form will look.</p>
        ) : (
          <FormRenderer form={form} values={values} onChange={onChange} idPrefix="qf-preview"/>
        )}
        <button type="button" className="button primary qf-submit" disabled title="Disabled in preview">
          <ToolGlyph name="link" size={15}/> Share completed form
        </button>
        <p className="qf-preview-note">This is exactly what the recipient sees and can try out. The submit button is disabled here — it works once the form is shared.</p>
      </div>
    </div>
  );
}

function FillablePdfPanel({ form }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      const bytes = await buildFillablePdf(form);
      const slug = (form.title || 'form').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'form';
      downloadBytes(`${slug}.pdf`, bytes);
    } catch {
      setError('Could not build a fillable PDF for this form.');
    }
    setBusy(false);
  };

  return (
    <section className="qf-pdf-panel">
      <div className="qf-pdf-panel-head">
        <span className="qf-pdf-panel-icon"><ToolGlyph name="fileText" size={16}/></span>
        <div>
          <strong>Prefer a file over a link?</strong>
          <span>Download this form as a fillable PDF — recipients can type straight into it in Acrobat Reader, Preview, or most browsers.</span>
        </div>
      </div>
      <button type="button" className="button secondary compact" disabled={busy || !formCanShare(form)} onClick={download}>
        <ToolGlyph name="download" size={14}/> {busy ? 'Building PDF…' : 'Download fillable PDF'}
      </button>
      {error && <p className="pdf-error">{error}</p>}
      <p className="qf-pdf-note">Good for printing, emailing, or recipients who don't want to open a link. Answers typed into the PDF stay in that file — they don't come back to you automatically like a shared link does, so ask them to email or message the saved PDF back.</p>
    </section>
  );
}

function CreateMode({ form, setForm }) {
  const [tab, setTab] = useState('build');
  const updateField = (index, next) => setForm(f => ({ ...f, fields: f.fields.map((field, i) => (i === index ? next : field)) }));
  const removeField = index => setForm(f => ({ ...f, fields: f.fields.filter((_, i) => i !== index) }));
  const moveField = (index, dir) => setForm(f => {
    const fields = [...f.fields];
    const target = index + dir;
    if (target < 0 || target >= fields.length) return f;
    [fields[index], fields[target]] = [fields[target], fields[index]];
    return { ...f, fields };
  });

  const formShare = useShareUrl({
    getUrl: () => buildToolShareUrl(QUICKFORM_TOOL_ID, form),
    canShare: formCanShare(form),
    invalidateDeps: [form],
  });

  const linkSize = useEncodedLinkSize(
    () => buildToolShareUrl(QUICKFORM_TOOL_ID, form),
    [form],
    { enabled: formCanShare(form) },
  );

  return (
    <>
      <label className="qf-label">
        <span className="qf-label-row"><span>Form title</span><span className={charCountClass(form.title.length, MAX_TITLE_LEN)}>{form.title.length}/{MAX_TITLE_LEN}</span></span>
        <input value={form.title} maxLength={MAX_TITLE_LEN} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}/>
      </label>
      <label className="qf-label">
        <span className="qf-label-row"><span>Description <span className="qf-hint">optional</span></span><span className={charCountClass(form.description.length, MAX_DESC_LEN)}>{form.description.length}/{MAX_DESC_LEN}</span></span>
        <textarea rows={2} maxLength={MAX_DESC_LEN} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}/>
      </label>

      <div className="qf-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'build'} className={`qf-tab${tab === 'build' ? ' active' : ''}`} onClick={() => setTab('build')}>
          <ToolGlyph name="wrench" size={14}/> Build
        </button>
        <button type="button" role="tab" aria-selected={tab === 'preview'} className={`qf-tab${tab === 'preview' ? ' active' : ''}`} onClick={() => setTab('preview')}>
          <ToolGlyph name="monitor" size={14}/> Preview
        </button>
      </div>

      {tab === 'build' ? (
        <>
          <div className="qf-templates">
            <button type="button" className="button secondary compact" onClick={() => setForm(clientIntakeTemplate())}><ToolGlyph name="userRound" size={14}/> Client intake template</button>
            <button type="button" className="button secondary compact" onClick={() => setForm(feedbackTemplate())}><ToolGlyph name="star" size={14}/> Feedback survey template</button>
            <button type="button" className="button secondary compact" onClick={() => setForm(blankForm())}><ToolGlyph name="square" size={14}/> Blank form</button>
          </div>

          <div className="qf-fields-head">
            <strong>Fields</strong>
            <span className={form.fields.length >= MAX_FORM_FIELDS ? 'qf-count-max' : ''}>{form.fields.length}/{MAX_FORM_FIELDS}</span>
          </div>

          {form.fields.length === 0 && <p className="qf-empty">Add a field to get started, or load the client intake template.</p>}

          <div className="qf-field-list">
            {form.fields.map((field, index) => (
              <FieldEditor
                key={field.id}
                field={field}
                onChange={next => updateField(index, next)}
                onRemove={() => removeField(index)}
                onMoveUp={() => moveField(index, -1)}
                onMoveDown={() => moveField(index, 1)}
                isFirst={index === 0}
                isLast={index === form.fields.length - 1}
              />
            ))}
          </div>

          <button
            type="button"
            className="button secondary compact qf-add-field"
            disabled={form.fields.length >= MAX_FORM_FIELDS}
            onClick={() => setForm(f => ({ ...f, fields: [...f.fields, blankField()] }))}
          >
            <ToolGlyph name="plus" size={15}/> Add field
          </button>
        </>
      ) : (
        <FormPreview form={form}/>
      )}

      <LinkSizeGauge length={linkSize.length} busy={linkSize.busy}/>

      <ToolSharePanel
        {...formShare}
        createLabel="Generate form link"
        copyLabel="Copy form link"
        footnote="Share this link or QR so someone can fill the form in their browser. The form definition is stored inside the link — nothing is saved on a server."
        qrHint="Scan to open this form on another device"
      />

      <FillablePdfPanel form={form}/>
    </>
  );
}

function FillMode({ form, onStartNewForm }) {
  const [answers, setAnswers] = useState(() => Object.fromEntries(form.fields.map(f => [f.id, defaultAnswerValue(f)])));
  const [errors, setErrors] = useState('');
  const [completed, setCompleted] = useState(null);

  const onChange = (id, value) => setAnswers(prev => ({ ...prev, [id]: value }));

  const submit = () => {
    const missing = form.fields.filter(f => {
      if (!f.required || f.type === 'checkbox' || f.type === 'range') return false;
      if (f.type === 'rating') return !(Number(answers[f.id]) > 0);
      return !String(answers[f.id] ?? '').trim();
    });
    if (missing.length) { setErrors(`Please fill in: ${missing.map(f => f.label).join(', ')}`); return; }
    setErrors('');
    setCompleted(buildResponse(form, answers));
  };

  const responseShare = useShareUrl({
    getUrl: () => buildToolRouteUrl(QUICKFORM_TOOL_ID, 'response', completed),
    canShare: Boolean(completed),
    invalidateDeps: [completed],
  });

  const responseLinkSize = useEncodedLinkSize(
    () => buildToolRouteUrl(QUICKFORM_TOOL_ID, 'response', completed),
    [completed],
    { enabled: Boolean(completed) },
  );

  if (completed) {
    return (
      <>
        <div className="qf-fill-done">
          <span className="qf-fill-done-icon"><ToolGlyph name="check" size={22}/></span>
          <div>
            <strong>Form completed</strong>
            <p>Share this link or QR back to the person who sent you the form.</p>
          </div>
        </div>
        <ResponseView response={completed}/>
        <LinkSizeGauge length={responseLinkSize.length} busy={responseLinkSize.busy}/>
        {responseLinkSize.length > 0 && !responseLinkSize.qrEligible && (
          <p className="qf-pdf-suggest">
            <ToolGlyph name="download" size={14}/> This response is too big to share reliably as a link or QR code — use <strong>Download PDF</strong> above instead and send that file.
          </p>
        )}
        <ToolSharePanel
          {...responseShare}
          createLabel="Generate response link"
          copyLabel="Copy response link"
          footnote="This link contains your answers. Send it back to the form creator — nothing is stored on a server."
          qrHint="Scan to open this completed response"
        />
        <div className="qf-mode-actions">
          <button className="button secondary compact" onClick={onStartNewForm}><ToolGlyph name="clipboardList" size={14}/> Create your own form</button>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="qf-fill-head">
        <h2>{form.title}</h2>
        {form.description && <p>{form.description}</p>}
      </header>
      <PrivacyNotice/>
      <FormRenderer form={form} values={answers} onChange={onChange}/>
      {errors && <p className="pdf-error">{errors}</p>}
      <button className="button primary qf-submit" onClick={submit}><ToolGlyph name="link" size={15}/> Share completed form</button>
      <div className="qf-mode-actions">
        <button className="button secondary compact" onClick={onStartNewForm}><ToolGlyph name="clipboardList" size={14}/> Create your own form</button>
      </div>
    </>
  );
}

export default function QuickFormBuilderTool() {
  const [mode, setMode] = useState('create');
  const [form, setForm] = useState(blankForm);
  const [response, setResponse] = useState(null);
  const [routeReady, setRouteReady] = useState(false);

  const loadFromHash = useCallback(async (hash, { confirm = false } = {}) => {
    const sharedResponse = await readToolRouteFromHash(QUICKFORM_TOOL_ID, 'response', hash, sanitizeResponse);
    if (sharedResponse) {
      setResponse(sharedResponse);
      setMode('response');
      resetToolHash(QUICKFORM_TOOL_ID);
      return;
    }
    const sharedForm = await readToolShareFromHash(QUICKFORM_TOOL_ID, hash, sanitizeForm);
    if (!sharedForm) return;
    if (confirm && mode === 'create' && form.fields.length && !window.confirm('Open this form? Your current draft will be replaced.')) {
      resetToolHash(QUICKFORM_TOOL_ID);
      return;
    }
    setForm(sharedForm);
    setResponse(null);
    setMode('fill');
    resetToolHash(QUICKFORM_TOOL_ID);
  }, [form.fields.length, mode]);

  useEffect(() => {
    (async () => {
      await loadFromHash(window.location.hash);
      setRouteReady(true);
    })();
  }, [loadFromHash]);

  useEffect(() => {
    const onHash = () => { if (routeReady) loadFromHash(window.location.hash, { confirm: true }); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [loadFromHash, routeReady]);

  const startNewForm = useCallback(() => {
    setMode('create');
    setForm(blankForm());
    setResponse(null);
    resetToolHash(QUICKFORM_TOOL_ID);
  }, []);

  if (!routeReady) return <p className="qf-loading" role="status">Loading…</p>;

  return (
    <div className="qf-root">
      <ModeBanner mode={mode}/>

      {mode === 'create' && (
        <>
          <PrivacyNotice/>
          <CreateMode form={form} setForm={setForm}/>
        </>
      )}

      {mode === 'fill' && <FillMode form={form} onStartNewForm={startNewForm}/>}

      {mode === 'response' && response && (
        <>
          <ResponseView response={response}/>
          <div className="qf-mode-actions">
            <button className="button secondary compact" onClick={startNewForm}><ToolGlyph name="clipboardList" size={14}/> Create your own form</button>
          </div>
        </>
      )}

      {mode !== 'create' && (
        <p className="tool-footnote">Nothing is uploaded. Form definitions and responses travel inside the link only.</p>
      )}
    </div>
  );
}
