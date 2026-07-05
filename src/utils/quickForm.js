export const QUICKFORM_TOOL_ID = 'quickform';
export const MAX_FORM_FIELDS = 10;
export const MAX_LABEL_LEN = 80;
export const MAX_TITLE_LEN = 120;
export const MAX_DESC_LEN = 400;
export const MAX_OPTION_LEN = 60;
export const MAX_OPTIONS = 12;
export const MAX_VALUE_LEN = 500;
export const MAX_ENCODED_SOFT = 2500;

export const FIELD_TYPES = [
  { id: 'text', label: 'Short text', input: 'text', icon: 'type', tint: 'blue' },
  { id: 'textarea', label: 'Long text', input: 'textarea', icon: 'alignLeft', tint: 'blue' },
  { id: 'email', label: 'Email', input: 'email', icon: 'mail', tint: 'mint' },
  { id: 'tel', label: 'Phone', input: 'tel', icon: 'phone', tint: 'mint' },
  { id: 'number', label: 'Number', input: 'number', icon: 'hash', tint: 'amber' },
  { id: 'date', label: 'Date', input: 'date', icon: 'calendarPlus', tint: 'purple' },
  { id: 'time', label: 'Time', input: 'time', icon: 'clock', tint: 'purple' },
  { id: 'select', label: 'Dropdown', input: 'select', icon: 'listChecks', tint: 'pink' },
  { id: 'checkbox', label: 'Checkbox', input: 'checkbox', icon: 'checkSquare', tint: 'pink' },
  { id: 'rating', label: 'Star rating', input: 'rating', icon: 'star', tint: 'amber' },
  { id: 'range', label: 'Slider', input: 'range', icon: 'gauge', tint: 'blue' },
];

export const RATING_STAR_OPTIONS = [3, 4, 5, 7, 10];
export const RANGE_MIN_BOUND = -1000;
export const RANGE_MAX_BOUND = 1000;

const TYPE_IDS = new Set(FIELD_TYPES.map(t => t.id));
let idSeed = 0;
export const makeFieldId = () => `f-${Date.now().toString(36)}-${(idSeed++).toString(36)}`;

function clampInt(value, min, max, fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function blankField(type = 'text') {
  const base = { id: makeFieldId(), type, label: 'New field', placeholder: '', options: ['Option 1', 'Option 2'], required: false };
  if (type === 'rating') return { ...base, max: 5 };
  if (type === 'range') return { ...base, min: 0, max: 10, step: 1 };
  return base;
}

export function blankForm() {
  return { title: 'Untitled form', description: '', fields: [] };
}

export function clientIntakeTemplate() {
  return {
    title: 'Client intake',
    description: 'Quick details to get started.',
    fields: [
      { id: makeFieldId(), type: 'text', label: 'Name', placeholder: 'Full name', options: [], required: true },
      { id: makeFieldId(), type: 'tel', label: 'Phone number', placeholder: '', options: [], required: true },
      { id: makeFieldId(), type: 'email', label: 'Email', placeholder: '', options: [], required: false },
      { id: makeFieldId(), type: 'date', label: 'Preferred appointment date', placeholder: '', options: [], required: false },
      { id: makeFieldId(), type: 'time', label: 'Preferred time', placeholder: '', options: [], required: false },
      { id: makeFieldId(), type: 'textarea', label: 'Notes', placeholder: 'Anything we should know?', options: [], required: false },
    ],
  };
}

export function feedbackTemplate() {
  return {
    title: 'Feedback survey',
    description: 'A couple of quick questions — takes less than a minute.',
    fields: [
      { id: makeFieldId(), type: 'text', label: 'Name', placeholder: 'Optional', options: [], required: false },
      { id: makeFieldId(), type: 'rating', label: 'Overall, how happy are you with the service?', placeholder: '', options: [], required: true, max: 5 },
      { id: makeFieldId(), type: 'range', label: 'How likely are you to recommend us? (0 = not at all, 10 = extremely)', placeholder: '', options: [], required: false, min: 0, max: 10, step: 1 },
      { id: makeFieldId(), type: 'textarea', label: 'Anything we could do better?', placeholder: '', options: [], required: false },
    ],
  };
}

function cleanString(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function sanitizeField(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const type = TYPE_IDS.has(raw.type) ? raw.type : 'text';
  const id = typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 40) : makeFieldId();
  const label = cleanString(raw.label, MAX_LABEL_LEN) || 'Field';
  const placeholder = cleanString(raw.placeholder, MAX_LABEL_LEN);
  const options = Array.isArray(raw.options)
    ? raw.options.map(o => cleanString(String(o), MAX_OPTION_LEN)).filter(Boolean).slice(0, MAX_OPTIONS)
    : [];
  const field = { id, type, label, placeholder, options: type === 'select' ? (options.length ? options : ['Option 1']) : options, required: Boolean(raw.required) };
  if (type === 'rating') {
    field.max = clampInt(raw.max, 3, 10, 5);
  }
  if (type === 'range') {
    const min = clampInt(raw.min, RANGE_MIN_BOUND, RANGE_MAX_BOUND, 0);
    let max = clampInt(raw.max, RANGE_MIN_BOUND, RANGE_MAX_BOUND, 10);
    if (max <= min) max = min + 1;
    field.min = min;
    field.max = max;
    field.step = clampInt(raw.step, 1, 100, 1);
  }
  return field;
}

export function defaultAnswerValue(field) {
  if (field.type === 'checkbox') return false;
  if (field.type === 'rating') return 0;
  if (field.type === 'range') return Math.round(((field.min ?? 0) + (field.max ?? 10)) / 2);
  return '';
}

export function sanitizeForm(data) {
  if (!data || typeof data !== 'object') return null;
  const fields = Array.isArray(data.fields) ? data.fields.map(sanitizeField).filter(Boolean).slice(0, MAX_FORM_FIELDS) : [];
  if (!fields.length) return null;
  return {
    title: cleanString(data.title, MAX_TITLE_LEN) || 'Untitled form',
    description: cleanString(data.description, MAX_DESC_LEN),
    fields,
  };
}

export function sanitizeResponse(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.fields)) return null;
  const fields = data.fields.map(f => {
    if (!f || typeof f !== 'object') return null;
    return {
      id: cleanString(f.id, 40),
      label: cleanString(f.label, MAX_LABEL_LEN) || 'Field',
      type: TYPE_IDS.has(f.type) ? f.type : 'text',
      value: cleanString(String(f.value ?? ''), MAX_VALUE_LEN),
    };
  }).filter(Boolean);
  if (!fields.length) return null;
  return {
    formTitle: cleanString(data.formTitle, MAX_TITLE_LEN) || 'Completed form',
    submittedAt: typeof data.submittedAt === 'string' ? data.submittedAt : new Date().toISOString(),
    fields,
  };
}

export function formCanShare(form) {
  return Boolean(form?.fields?.length);
}

export function buildResponse(form, answers) {
  return {
    formTitle: form.title,
    submittedAt: new Date().toISOString(),
    fields: form.fields.map(field => ({
      id: field.id,
      label: field.label,
      type: field.type,
      value: field.type === 'checkbox'
        ? (answers[field.id] ? 'Yes' : 'No')
        : field.type === 'rating'
          ? (Number(answers[field.id]) > 0 ? `${Number(answers[field.id])}/${field.max || 5}` : '')
          : String(answers[field.id] ?? '').trim(),
    })),
  };
}

export function responseToText(response) {
  const lines = [response.formTitle, `Submitted: ${new Date(response.submittedAt).toLocaleString()}`, ''];
  response.fields.forEach(f => lines.push(`${f.label}: ${f.value || '—'}`));
  return lines.join('\n');
}

export function responseToCsv(response) {
  const rows = [['Label', 'Value'], ...response.fields.map(f => [f.label, f.value])];
  return rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function downloadText(filename, text, mime = 'text/plain') {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([text], { type: mime })),
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

export function downloadBytes(filename, bytes, mime = 'application/pdf') {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([bytes], { type: mime })),
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

export const PRIVACY_WARNING = 'This form lives entirely inside the link. Anyone with the link can read it. Do not use it for passwords, banking details, medical information, government ID, or other sensitive personal data.';
