import { useState } from 'react';
import { formatBytes } from '../utils/format.js';
import ToolGlyph from '../components/ToolGlyph.jsx';

export default function FileConverterTool() {
  const FMTS = [
    { label: 'JPEG', mime: 'image/jpeg', ext: 'jpg' },
    { label: 'PNG',  mime: 'image/png',  ext: 'png' },
    { label: 'WebP', mime: 'image/webp', ext: 'webp' },
  ];
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [outFmt, setOutFmt] = useState('image/jpeg');
  const [quality, setQuality] = useState(88);
  const [result, setResult] = useState(null);

  const load = f => {
    if (!f || !f.type.startsWith('image/')) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f); setResult(null);
    setPreview(URL.createObjectURL(f));
    setOutFmt(f.type === 'image/jpeg' ? 'image/png' : 'image/jpeg');
  };

  const convert = () => {
    if (!preview || !file) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (outFmt === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(img, 0, 0);
      const q = outFmt === 'image/png' ? undefined : quality / 100;
      const dataUrl = canvas.toDataURL(outFmt, q);
      const fmt = FMTS.find(f => f.mime === outFmt);
      setResult({ dataUrl, name: `${file.name.replace(/\.[^.]+$/, '')}.${fmt.ext}`, approxBytes: Math.round(dataUrl.length * 0.75) });
    };
    img.src = preview;
  };

  const fmt = FMTS.find(f => f.mime === outFmt);

  return <>
    {!file
      ? <label className="bgr-upload-zone"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp" style={{display:'none'}} onChange={e => e.target.files[0] && load(e.target.files[0])}/><div className="bgr-drop" onDrop={e=>{e.preventDefault();e.dataTransfer.files[0]&&load(e.dataTransfer.files[0]);}} onDragOver={e=>e.preventDefault()}><ToolGlyph name="image" size={40}/><p>Drop an image or <u>browse</u></p><small>Supports JPG, PNG, WebP, GIF, BMP</small></div></label>
      : <>
          <div className="bgr-panel-head" style={{marginBottom:12}}>
            <strong style={{font:'700 14px Manrope',color:'#10183e'}}>{file.name}</strong>
            <span className="conv-badge">{file.type.split('/')[1].toUpperCase()} · {formatBytes(file.size)}</span>
          </div>
          <img src={preview} alt="Original" className="bgr-canvas" style={{maxHeight:260,objectFit:'contain',marginBottom:16}}/>
          <div className="conv-options">
            <div>
              <p style={{font:'700 12px Manrope',color:'#68748a',marginBottom:8,textTransform:'uppercase',letterSpacing:.5}}>Convert to</p>
              <div className="conv-formats">{FMTS.map(f => <button key={f.mime} className={`conv-fmt${outFmt===f.mime?' active':''}`} onClick={()=>setOutFmt(f.mime)}>{f.label}</button>)}</div>
            </div>
            {outFmt !== 'image/png' && <label className="bgr-tol">Quality <b>{quality}%</b><input type="range" min="10" max="100" value={quality} onChange={e=>setQuality(Number(e.target.value))}/></label>}
          </div>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <button className="button primary" onClick={convert}>Convert to {fmt?.label}</button>
            <button className="button secondary" onClick={()=>{setFile(null);setPreview(null);setResult(null);}}>New file</button>
          </div>
          {result && <div className="conv-result">
            <div className="conv-result-head"><span><strong>{result.name}</strong> · ~{formatBytes(result.approxBytes)}</span><button className="button primary" onClick={()=>{const a=document.createElement('a');a.download=result.name;a.href=result.dataUrl;a.click();}}>Download</button></div>
            <div className="conv-result-wrap"><img src={result.dataUrl} alt="Converted"/></div>
          </div>}
        </>
    }
    <p className="tool-footnote">Conversion uses the browser’s built-in canvas. PNG is lossless. Transparent images converted to JPEG get a white background. WebP may not be supported in older Safari versions.</p></>;
}
