import { formatBytes } from '../utils/format.js';

export function FileDrop({ accept, multiple = false, onFiles, title, hint }) {
  return <label className="pdf-drop"><input type="file" accept={accept} multiple={multiple} onChange={event => { onFiles(Array.from(event.target.files || [])); event.target.value = ''; }}/><span>＋</span><strong>{title}</strong><small>{hint}</small></label>;
}

export function FileList({ files, onRemove, onMove }) {
  return <div className="pdf-file-list">{files.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`}><span className="file-badge">{file.type.includes('pdf') ? 'PDF' : 'IMG'}</span><p><strong>{file.name}</strong><small>{formatBytes(file.size)}</small></p>{onMove && <div className="file-order"><button disabled={index === 0} onClick={() => onMove(index, -1)} aria-label={`Move ${file.name} up`}>↑</button><button disabled={index === files.length - 1} onClick={() => onMove(index, 1)} aria-label={`Move ${file.name} down`}>↓</button></div>}<button className="file-remove" onClick={() => onRemove(index)} aria-label={`Remove ${file.name}`}>×</button></div>)}</div>;
}
