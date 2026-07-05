import { useEffect, useState } from 'react';

const AI_PROMPTS = {
  email: 'You are an expert email scam and phishing detector. Analyse the provided email for fraud or social engineering. Reply in this exact format only:\nVERDICT: SCAM or SUSPICIOUS or SAFE\nCONFIDENCE: HIGH or MEDIUM or LOW\nSUMMARY: 1-2 sentence plain English explanation.\nRED FLAGS: comma-separated list of specific red flags found, or None detected',
  link: 'You are an expert phishing and malicious link detector. Analyse the provided URL for fraud, typosquatting, or social engineering. Reply in this exact format only:\nVERDICT: SCAM or SUSPICIOUS or SAFE\nCONFIDENCE: HIGH or MEDIUM or LOW\nSUMMARY: 1-2 sentence plain English explanation.\nRED FLAGS: comma-separated list of specific red flags found, or None detected',
  qr: 'You are an expert QR code scam detector. Analyse the decoded QR payload for fraud — dodgy links, Wi-Fi hotspot scams, premium numbers, impersonation, or social engineering. Reply in this exact format only:\nVERDICT: SCAM or SUSPICIOUS or SAFE\nCONFIDENCE: HIGH or MEDIUM or LOW\nSUMMARY: 1-2 sentence plain English explanation.\nRED FLAGS: comma-separated list of specific red flags found, or None detected',
};

const AI_VERDICT_UI = {
  SCAM: { label: 'Likely a scam', col: '#b53e3e', bg: '#fff0f0', bd: '#f5b8b8' },
  SUSPICIOUS: { label: 'Suspicious', col: '#a05c00', bg: '#fff8ec', bd: '#f5d896' },
  SAFE: { label: 'Looks safe', col: '#08785f', bg: '#eaf9f4', bd: '#c6ebdf' },
};

function parseAiResponse(raw) {
  const get = key => (raw.match(new RegExp(key + ':\\s*(.+?)(?=\\n[A-Z ]+:|$)', 'si')) || [])[1]?.trim() || '';
  return {
    verdict: get('VERDICT').toUpperCase(),
    confidence: get('CONFIDENCE').toUpperCase(),
    summary: get('SUMMARY'),
    flags: get('RED FLAGS'),
  };
}

export default function ScamAiPanel({ kind = 'email', promptText = '', disabled = false }) {
  const [aiStatus, setAiStatus] = useState('checking');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [flagCopied, setFlagCopied] = useState(false);
  const isChrome = /Chrome\//.test(navigator.userAgent) && !/Edg\/|OPR\//.test(navigator.userAgent);

  useEffect(() => {
    const check = async () => {
      try {
        const api = window.LanguageModel ?? window.ai?.languageModel;
        if (!api) { setAiStatus('unavailable'); return; }
        if (window.LanguageModel) {
          const avail = await window.LanguageModel.availability();
          setAiStatus(['available', 'downloadable'].includes(avail) ? 'ready' : 'unavailable');
        } else {
          const caps = await window.ai.languageModel.capabilities();
          setAiStatus(caps.available !== 'no' ? 'ready' : 'unavailable');
        }
      } catch {
        setAiStatus('unavailable');
      }
    };
    check();
  }, []);

  useEffect(() => {
    setAiResult(null);
  }, [promptText]);

  const runAiCheck = async () => {
    if (!promptText.trim() || disabled) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const api = window.LanguageModel ?? window.ai?.languageModel;
      const session = await api.create({ systemPrompt: AI_PROMPTS[kind] });
      const raw = await session.prompt(promptText.slice(0, 2000));
      session.destroy?.();
      setAiResult(parseAiResponse(raw));
    } catch (err) {
      setAiResult({ error: err.message || 'AI analysis failed. Please try again.' });
    }
    setAiLoading(false);
  };

  const blocked = disabled || !promptText.trim();

  return (
    <div className="scam-ai-panel">
      <div className="scam-ai-panel-header">
        <span className="scam-ai-panel-title">✨ AI Analysis <span className="scam-ai-panel-badge">Chrome only</span></span>
        <span className="scam-ai-panel-sub">On-device · private · no API key</span>
      </div>
      {aiStatus === 'ready' && (
        <button type="button" className="scam-ai-btn" onClick={runAiCheck} disabled={blocked || aiLoading}>
          {aiLoading ? <><span className="scam-ai-spin" /> Analysing…</> : <>Run AI check</>}
        </button>
      )}
      {aiStatus === 'unavailable' && (
        isChrome ? (
          <div className="scam-ai-enable">
            <button type="button" className="scam-ai-enable-btn" onClick={() => {
              navigator.clipboard.writeText('chrome://flags/#prompt-api-for-gemini-nano');
              setFlagCopied(true);
              setTimeout(() => setFlagCopied(false), 3000);
            }}>
              {flagCopied ? '✓ Copied! Paste in your address bar' : '🛠️ Enable Chrome AI'}
            </button>
            {flagCopied && <p className="scam-ai-enable-hint">Set the flag to <strong>Enabled</strong>, relaunch Chrome, then refresh this page.</p>}
          </div>
        ) : (
          <p className="scam-ai-unavail">AI analysis requires Chrome with Gemini Nano enabled.</p>
        )
      )}
      {aiResult && !aiResult.error && (() => {
        const verdict = AI_VERDICT_UI[aiResult.verdict] || AI_VERDICT_UI.SUSPICIOUS;
        return (
          <div className="scam-ai-result" style={{ background: verdict.bg, borderColor: verdict.bd }}>
            <div className="scam-ai-header">
              <strong style={{ color: verdict.col }}>{verdict.label}</strong>
              {aiResult.confidence && <span className="scam-ai-conf">{aiResult.confidence} confidence</span>}
            </div>
            {aiResult.summary && <p className="scam-ai-summary">{aiResult.summary}</p>}
            {aiResult.flags && !/^none/i.test(aiResult.flags) && (
              <p className="scam-ai-flags"><span className="scam-ai-flabel">Red flags:</span> {aiResult.flags}</p>
            )}
          </div>
        );
      })()}
      {aiResult?.error && <div className="scam-ai-error">{aiResult.error}</div>}
    </div>
  );
}
