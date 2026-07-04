import { useMemo, useState } from 'react';

const FLAG_LIST = ['g', 'i', 'm', 's', 'u'];

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function RegexTesterTool() {
  const [pattern, setPattern] = useState('\\b\\w{4}\\b');
  const [flags, setFlags] = useState('g');
  const [input, setInput] = useState('The quick brown fox jumps over the lazy dogs tonight');

  const toggleFlag = f => setFlags(fl => fl.includes(f) ? fl.replace(f, '') : fl + f);

  const result = useMemo(() => {
    if (!pattern) return { matches: [], error: '', html: escapeHtml(input) };
    try {
      const effectiveFlags = flags.includes('g') ? flags : flags + 'g';
      const re = new RegExp(pattern, effectiveFlags);
      const allMatches = [...input.matchAll(re)];

      // Build highlighted HTML
      let html = '', last = 0;
      for (const m of allMatches) {
        if (m.index < last) continue; // skip zero-width overlaps
        html += escapeHtml(input.slice(last, m.index));
        html += `<mark class="rx-match">${escapeHtml(m[0] || '\u200b')}</mark>`;
        last = m.index + (m[0].length || 1);
      }
      html += escapeHtml(input.slice(last));

      return { matches: allMatches, error: '', html };
    } catch (e) {
      return { matches: [], error: e.message, html: escapeHtml(input) };
    }
  }, [pattern, flags, input]);

  return (
    <div className="rx-root">
      <div className="rx-pattern-bar">
        <span className="rx-slash">/</span>
        <input
          className="rx-input"
          value={pattern}
          onChange={e => setPattern(e.target.value)}
          placeholder="pattern"
          spellCheck={false}
          aria-label="Regex pattern"
        />
        <span className="rx-slash">/</span>
        <div className="rx-flags">
          {FLAG_LIST.map(f => (
            <button
              key={f}
              className={`rx-flag${flags.includes(f) ? ' active' : ''}`}
              onClick={() => toggleFlag(f)}
              title={`Flag: ${f}`}
            >{f}</button>
          ))}
        </div>
      </div>

      {result.error && <p className="rx-error">{result.error}</p>}

      <label className="rx-label">
        Test string
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={5}
          spellCheck={false}
          className="rx-textarea"
          aria-label="Test string"
        />
      </label>

      <div className="rx-highlighted-wrap">
        <p className="rx-section-label">Matches highlighted</p>
        <div
          className="rx-highlighted"
          dangerouslySetInnerHTML={{ __html: result.html }}
          aria-live="polite"
        />
      </div>

      <div className="rx-summary">
        <strong>{result.matches.length} match{result.matches.length !== 1 ? 'es' : ''}</strong>
        {result.matches.length > 0 && (
          <ol className="rx-match-list">
            {result.matches.map((m, i) => (
              <li key={i}>
                <code>"{m[0]}"</code> at index <code>{m.index}</code>
                {m.length > 1 && m.slice(1).some(g => g !== undefined) && (
                  <span className="rx-groups"> · groups: {m.slice(1).map((g, j) => (
                    <code key={j}>{g ?? 'undefined'}</code>
                  ))}</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
