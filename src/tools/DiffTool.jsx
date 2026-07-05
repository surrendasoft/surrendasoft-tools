import { useCallback, useMemo, useState } from 'react';
import ToolSharePanel, { ToolShareBanner } from '../components/ToolSharePanel.jsx';
import { useToolShare } from '../hooks/useToolShare.js';

function diffLines(aText, bText) {
  const a = aText.split('\n');
  const b = bText.split('\n');
  const m = a.length, n = b.length;

  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: 'same', text: a[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'add', text: b[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'del', text: a[i - 1] });
      i--;
    }
  }
  return result;
}

const SAMPLE_A = `The quick brown fox
jumps over the lazy dog
This line is unchanged
Another identical line
Final line here`;

const SAMPLE_B = `The quick brown fox
jumped over the lazy cat
This line is unchanged
A different line here
Final line here
Brand new line added`;

export default function DiffTool() {
  const [left, setLeft] = useState(SAMPLE_A);
  const [right, setRight] = useState(SAMPLE_B);

  const loadShared = useCallback(data => {
    if (typeof data?.left === 'string') setLeft(data.left);
    if (typeof data?.right === 'string') setRight(data.right);
  }, []);

  const { loadedFromShare, dismissLoadedBanner, sharePanelProps } = useToolShare({
    toolId: 'diff',
    getPayload: () => ({ left, right }),
    onLoad: loadShared,
    canShare: Boolean(left.trim() || right.trim()),
    confirmOnReplace: () => left !== SAMPLE_A || right !== SAMPLE_B,
    invalidateDeps: [left, right],
  });

  const diff = useMemo(() => diffLines(left, right), [left, right]);
  const adds = diff.filter(l => l.type === 'add').length;
  const dels = diff.filter(l => l.type === 'del').length;

  return (
    <div className="diff-root">
      <ToolShareBanner show={loadedFromShare} onDismiss={dismissLoadedBanner}/>

      <div className="diff-editors">
        <label>
          <span>Original</span>
          <textarea value={left} onChange={e => setLeft(e.target.value)} spellCheck={false} rows={8} />
        </label>
        <label>
          <span>Modified</span>
          <textarea value={right} onChange={e => setRight(e.target.value)} spellCheck={false} rows={8} />
        </label>
      </div>

      <div className="diff-stats">
        <span className="diff-stat diff-stat-add">+{adds} added</span>
        <span className="diff-stat diff-stat-del">−{dels} removed</span>
        <span className="diff-stat diff-stat-same">{diff.filter(l => l.type === 'same').length} unchanged</span>
      </div>

      <div className="diff-output" aria-label="Diff result">
        {diff.length === 0 && <p className="diff-empty">No differences.</p>}
        {diff.map((line, i) => (
          <div key={i} className={`diff-line diff-line-${line.type}`}>
            <span className="diff-gutter">{line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' '}</span>
            <span className="diff-text">{line.text || '\u00a0'}</span>
          </div>
        ))}
      </div>

      <ToolSharePanel {...sharePanelProps} qrHint="Scan to open this diff on another device"/>
    </div>
  );
}
