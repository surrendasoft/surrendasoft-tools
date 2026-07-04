import { useState } from 'react';

function safeEncode(text, full) {
  try { return full ? encodeURI(text) : encodeURIComponent(text); }
  catch { return '⚠ Cannot encode this input'; }
}
function safeDecode(text) {
  try { return decodeURIComponent(text.replace(/\+/g, ' ')); }
  catch {
    try { return decodeURI(text); }
    catch { return '⚠ Cannot decode — invalid encoding'; }
  }
}

export default function UrlCoderTool() {
  const [input, setInput] = useState('https://example.com/search?q=hello world&lang=en&special=<>&"quotes"');
  const [mode, setMode] = useState('component'); // 'component' | 'full'
  const [copied, setCopied] = useState('');

  const encoded = safeEncode(input, mode === 'full');
  const decoded = safeDecode(input);

  const copy = async (text, key) => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(key);
    setTimeout(() => setCopied(k => k === key ? '' : k), 1500);
  };

  return (
    <div className="urlcode-root">
      <div className="urlcode-tabs">
        <button
          className={mode === 'component' ? 'active' : ''}
          onClick={() => setMode('component')}
          title="Encodes everything including : / ? & # — use for query values"
        >encodeURIComponent</button>
        <button
          className={mode === 'full' ? 'active' : ''}
          onClick={() => setMode('full')}
          title="Preserves : / ? & # — use for full URLs"
        >encodeURI</button>
      </div>
      <p className="urlcode-hint">
        {mode === 'component'
          ? <>Encodes <strong>everything</strong> including <code>: / ? & #</code> — use for query-string values.</>
          : <>Preserves <code>: / ? & #</code> — use when encoding a complete URL.</>}
      </p>

      <label className="urlcode-label">
        Input
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={3}
          spellCheck={false}
          className="urlcode-textarea"
          aria-label="Input text"
        />
      </label>

      <div className="urlcode-outputs">
        <div className="urlcode-block">
          <div className="urlcode-block-head">
            <span>Encoded</span>
            <button onClick={() => copy(encoded, 'enc')} className="urlcode-copy">
              {copied === 'enc' ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
          <code className="urlcode-value">{encoded}</code>
        </div>
        <div className="urlcode-block">
          <div className="urlcode-block-head">
            <span>Decoded</span>
            <button onClick={() => copy(decoded, 'dec')} className="urlcode-copy">
              {copied === 'dec' ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
          <code className="urlcode-value">{decoded}</code>
        </div>
      </div>
    </div>
  );
}
