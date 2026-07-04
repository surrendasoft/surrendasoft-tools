import { useRef, useState } from 'react';
import ToolGlyph from '../components/ToolGlyph.jsx';

export default function BgRemoverTool() {
  const [imgUrl, setImgUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [tolerance, setTolerance] = useState(35);
  const [busy, setBusy] = useState(false);
  const [pickMode, setPickMode] = useState(false);
  const [pickedColor, setPickedColor] = useState(null);
  const canvasRef = useRef(null);
  const imgObjRef = useRef(null);

  const loadFile = file => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgObjRef.current = img;
      if (!canvasRef.current) return;
      const MAX = 1200, scale = Math.min(1, MAX / Math.max(img.width, img.height));
      canvasRef.current.width = Math.round(img.width * scale);
      canvasRef.current.height = Math.round(img.height * scale);
      canvasRef.current.getContext('2d').drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
    };
    img.src = url;
    setImgUrl(url); setResultUrl(null); setPickedColor(null); setPickMode(false);
  };

  const colorDist = (a, b) => Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);

  const remove = () => {
    if (!canvasRef.current || !imgObjRef.current) return;
    setBusy(true);
    const canvas = canvasRef.current;
    canvas.getContext('2d').drawImage(imgObjRef.current, 0, 0, canvas.width, canvas.height);
    setTimeout(() => {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data, width, height } = imageData;
      const topLeft = [data[0], data[1], data[2]];
      const seed = pickedColor || topLeft;
      const visited = new Uint8Array(width * height);
      const queue = [];
      for (let x = 0; x < width; x++) { queue.push(x); queue.push((height-1)*width+x); }
      for (let y = 1; y < height-1; y++) { queue.push(y*width); queue.push(y*width+width-1); }
      while (queue.length) {
        const idx = queue.pop();
        if (visited[idx]) continue;
        visited[idx] = 1;
        const i = idx * 4;
        if (colorDist([data[i], data[i+1], data[i+2]], seed) > tolerance) continue;
        data[i+3] = 0;
        const x = idx % width, y = Math.floor(idx / width);
        if (x > 0) queue.push(idx-1);
        if (x < width-1) queue.push(idx+1);
        if (y > 0) queue.push(idx-width);
        if (y < height-1) queue.push(idx+width);
      }
      const out = document.createElement('canvas');
      out.width = width; out.height = height;
      out.getContext('2d').putImageData(imageData, 0, 0);
      setResultUrl(out.toDataURL('image/png'));
      ctx.drawImage(imgObjRef.current, 0, 0, canvas.width, canvas.height);
      setBusy(false);
    }, 20);
  };

  const handleCanvasClick = e => {
    if (!pickMode || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = canvasRef.current.width / rect.width, sy = canvasRef.current.height / rect.height;
    const x = Math.min(Math.round((e.clientX - rect.left) * sx), canvasRef.current.width - 1);
    const y = Math.min(Math.round((e.clientY - rect.top) * sy), canvasRef.current.height - 1);
    const p = canvasRef.current.getContext('2d').getImageData(x, y, 1, 1).data;
    setPickedColor([p[0], p[1], p[2]]); setPickMode(false);
  };

  const dl = () => { const a = document.createElement('a'); a.download = 'no-bg.png'; a.href = resultUrl; a.click(); };

  return <>
    {!imgUrl
      ? <label className="bgr-upload-zone"><input type="file" accept="image/*" style={{display:'none'}} onChange={e => e.target.files[0] && loadFile(e.target.files[0])}/><div className="bgr-drop" onDrop={e=>{e.preventDefault(); e.dataTransfer.files[0]&&loadFile(e.dataTransfer.files[0]);}} onDragOver={e=>e.preventDefault()}><ToolGlyph name="image" size={40}/><p>Drop an image or <u>browse</u></p><small>Works best on plain or solid-colour backgrounds</small></div></label>
      : <>
          <div className="bgr-layout">
            <div className="bgr-panel">
              <div className="bgr-panel-head"><strong>Original</strong>
                <span style={{display:'flex',alignItems:'center',gap:6}}>
                  {pickedColor && <span className="bgr-swatch" style={{background:`rgb(${pickedColor.join(',')})`}} title={`Picked: rgb(${pickedColor.join(',')})`}/>}
                  <button className={`button secondary${pickMode?' bgr-pick-on':''}`} onClick={()=>setPickMode(m=>!m)} style={{padding:'6px 10px',fontSize:12}}>{pickMode ? 'Click image…' : <><ToolGlyph name="crosshair" size={14}/> Pick colour</>}</button>
                </span>
              </div>
              <canvas ref={canvasRef} onClick={handleCanvasClick} className={`bgr-canvas${pickMode?' bgr-crosshair':''}`}/>
            </div>
            {resultUrl && <div className="bgr-panel">
              <div className="bgr-panel-head"><strong>Result</strong><button className="button primary" onClick={dl} style={{padding:'6px 12px',fontSize:12}}>Download PNG</button></div>
              <div className="bgr-result-wrap"><img src={resultUrl} alt="Background removed" className="bgr-canvas"/></div>
            </div>}
          </div>
          <div className="bgr-controls">
            <label className="bgr-tol">Tolerance <b>{tolerance}</b><input type="range" min="5" max="120" value={tolerance} onChange={e=>setTolerance(Number(e.target.value))}/></label>
            <button className="button primary" onClick={remove} disabled={busy}>{busy?'Removing…':'Remove background'}</button>
            <button className="button secondary" onClick={()=>{setImgUrl(null);setResultUrl(null);setPickedColor(null);}}>New image</button>
          </div>
        </>
    }
    <p className="tool-footnote">Edge flood-fill removal — no AI, no upload. Works best on plain backgrounds. Raise tolerance for gradients; lower it to keep fine edges. Download is a transparent PNG.</p></>;
}
