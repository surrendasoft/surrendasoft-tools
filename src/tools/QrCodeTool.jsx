import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export default function QrCodeTool() {
  const [text, setText] = useState('https://surrendasoft.com');
  const [size, setSize] = useState(300);
  const [margin, setMargin] = useState(2);
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !text.trim()) return;
    QRCode.toCanvas(canvasRef.current, text.trim(), { width: size, margin }, err => { if (err) console.error(err); });
  }, [text, size, margin]);
  const download = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };
  return <>
    <div className="qr-layout">
      <div className="qr-controls">
        <label className="textarea-label">Content (URL, text, phone, email…)<textarea value={text} onChange={e => setText(e.target.value)} rows="5" placeholder="https://example.com"/></label>
        <div className="qr-options">
          <label>Size<select value={size} onChange={e => setSize(Number(e.target.value))}><option value={200}>Small (200px)</option><option value={300}>Medium (300px)</option><option value={400}>Large (400px)</option><option value={600}>XL (600px)</option></select></label>
          <label>Quiet zone<select value={margin} onChange={e => setMargin(Number(e.target.value))}><option value={1}>Minimal</option><option value={2}>Normal</option><option value={4}>Wide</option></select></label>
        </div>
        <button className="button primary" onClick={download} disabled={!text.trim()}>Download PNG</button>
      </div>
      <div className="qr-preview">
        {text.trim() ? <canvas ref={canvasRef}/> : <div className="qr-empty">Enter content to generate</div>}
      </div>
    </div>
    <p className="tool-footnote">QR codes are generated entirely in your browser. Nothing is sent to any server.</p></>;
}
