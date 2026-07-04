import { useEffect, useState } from 'react';

export default function ImageShrinkerTool() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [quality, setQuality] = useState(75);
  const [maxWidth, setMaxWidth] = useState(1600);
  const [result, setResult] = useState(null);
  const [working, setWorking] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result?.url]);

  const chooseFile = event => {
    const next = event.target.files?.[0];
    if (!next) return;
    setFile(next); setResult(null); setPreview(URL.createObjectURL(next));
  };
  const shrink = () => {
    if (!file || !preview) return;
    setWorking(true);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxWidth / image.width);
      const width = Math.round(image.width * scale), height = Math.round(image.height * scale);
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(image, 0, 0, width, height);
      canvas.toBlob(blob => {
        if (!blob) { setWorking(false); return; }
        setResult({ url: URL.createObjectURL(blob), size: blob.size, width, height, name: `${file.name.replace(/\.[^.]+$/, '')}-shrunk.jpg` });
        setWorking(false);
      }, 'image/jpeg', quality / 100);
    };
    image.onerror = () => setWorking(false);
    image.src = preview;
  };
  const formatSize = bytes => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;

  return <><label className={`upload-zone ${preview ? 'has-image' : ''}`}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile}/>{preview ? <><img src={preview} alt="Selected preview"/><div><strong>{file.name}</strong><span>{formatSize(file.size)} · Tap to replace</span></div></> : <><span className="upload-icon">↑</span><strong>Choose an image</strong><small>JPEG, PNG or WebP · processed on your device</small></>}</label><div className="shrink-controls"><label>Maximum width<select value={maxWidth} onChange={e => setMaxWidth(Number(e.target.value))}><option value="800">800 px</option><option value="1200">1200 px</option><option value="1600">1600 px</option><option value="2400">2400 px</option></select></label><label>Image quality <strong>{quality}%</strong><input type="range" min="30" max="95" value={quality} onChange={e => setQuality(Number(e.target.value))}/></label></div><button className="button primary shrink-button" onClick={shrink} disabled={!file || working}>{working ? 'Shrinking…' : 'Shrink image'}</button>{result && <div className="image-result"><div><span>New file size</span><strong>{formatSize(result.size)}</strong><small>{result.width} × {result.height}px · {Math.max(0, Math.round((1 - result.size / file.size) * 100))}% smaller</small></div><a className="button primary compact" href={result.url} download={result.name}>Download image</a></div>}</>;
}
