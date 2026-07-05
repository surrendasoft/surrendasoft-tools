import Icon from './Icon.jsx';
import ToolGlyph from './ToolGlyph.jsx';
import './ToolSharePanel.css';

export function ToolShareBanner({ show, onDismiss, message = 'Loaded from a shared link.' }) {
  if (!show) return null;
  return (
    <div className="tool-share-banner" role="status">
      <Icon name="check" size={16}/> {message}
      <button type="button" onClick={onDismiss} aria-label="Dismiss">×</button>
    </div>
  );
}

export default function ToolSharePanel({
  canShare = true,
  shareUrl = '',
  shareBusy = false,
  shareError = '',
  shareCopied = false,
  shareCanvasRef,
  qrEligible = false,
  createShareLink,
  copyShareLink,
  createLabel = 'Create share link',
  copyLabel = 'Copy link',
  copiedLabel = 'Copied',
  footnote = 'The link contains your data — opening it loads an editable copy. Nothing is stored on a server.',
  qrHint = 'Scan to open on another device',
}) {
  return (
    <section className="tool-share" aria-label="Share">
      <span className="tool-share-label">Share</span>
      <div className="tool-share-body">
        {!shareUrl ? (
          <button className="button secondary compact" onClick={createShareLink} disabled={!canShare || shareBusy}>
            <ToolGlyph name="link" size={14}/> {shareBusy ? 'Building link…' : createLabel}
          </button>
        ) : (
          <div className="tool-share-result">
            <div className="tool-share-link-row">
              <input className="tool-share-link" readOnly value={shareUrl} onFocus={e => e.target.select()} aria-label="Share link"/>
              <button className="button primary compact" onClick={copyShareLink}>
                <Icon name={shareCopied ? 'check' : 'copy'} size={15}/>{shareCopied ? copiedLabel : copyLabel}
              </button>
            </div>
            {qrEligible ? (
              <div className="tool-share-qr">
                <canvas ref={shareCanvasRef}/>
                <span>{qrHint}</span>
              </div>
            ) : (
              <p className="tool-share-note">Too large for a reliable QR code — use Copy link instead.</p>
            )}
          </div>
        )}
        {shareError && <p className="pdf-error">{shareError}</p>}
        <p className="tool-share-note">{footnote}</p>
      </div>
    </section>
  );
}
