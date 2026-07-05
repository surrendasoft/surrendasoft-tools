import { useCallback, useEffect, useRef, useState } from 'react';
import ToolGlyph from '../components/ToolGlyph.jsx';
import ToolSharePanel, { ToolShareBanner } from '../components/ToolSharePanel.jsx';
import { useToolShare } from '../hooks/useToolShare.js';
import './WorkflowDiagramTool.css';

const STORAGE_KEY = 'surrendasoft-workflow-diagram';
const HISTORY_LIMIT = 50;
const CANVAS_W = 1680;
const CANVAS_H = 560;
const BOX_W = 170, BOX_H = 70;
const DIAMOND_W = 180, DIAMOND_H = 110;
const PADDING = 40;

let idSeed = 0;
const makeId = prefix => `${prefix}-${Date.now().toString(36)}-${(idSeed++).toString(36)}`;

function buildTemplate(shapeDefs, arrowDefs) {
  const ids = shapeDefs.map(() => makeId('shape'));
  const shapes = shapeDefs.map((s, i) => ({
    id: ids[i], type: s.type, x: s.x, y: s.y, text: s.text,
    w: s.type === 'diamond' ? DIAMOND_W : BOX_W, h: s.type === 'diamond' ? DIAMOND_H : BOX_H,
  }));
  const arrows = arrowDefs.map(a => ({ id: makeId('arrow'), from: ids[a.from], to: ids[a.to], label: a.label || '' }));
  return { shapes, arrows };
}

const TEMPLATES = [
  {
    id: 'onboarding', name: 'Client onboarding', desc: 'Sign-up through kickoff call',
    build: () => buildTemplate(
      [
        { type: 'box', x: 60, y: 60, text: 'New client signs up' },
        { type: 'box', x: 280, y: 60, text: 'Send welcome email + intake form' },
        { type: 'diamond', x: 500, y: 40, text: 'Client completes intake form?' },
        { type: 'box', x: 740, y: 60, text: 'Schedule kickoff call' },
        { type: 'box', x: 960, y: 60, text: 'Set up project in tools' },
        { type: 'box', x: 1180, y: 60, text: 'Onboarding complete' },
        { type: 'box', x: 500, y: 260, text: 'Send reminder' },
      ],
      [
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3, label: 'Yes' },
        { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 2, to: 6, label: 'No' }, { from: 6, to: 2 },
      ],
    ),
  },
  {
    id: 'approval', name: 'Approval process', desc: 'Submit, review, approve or reject',
    build: () => buildTemplate(
      [
        { type: 'box', x: 60, y: 60, text: 'Request submitted' },
        { type: 'box', x: 280, y: 60, text: 'Manager reviews request' },
        { type: 'diamond', x: 500, y: 40, text: 'Approved?' },
        { type: 'box', x: 740, y: 60, text: 'Process request' },
        { type: 'box', x: 960, y: 60, text: 'Notify requester: approved' },
        { type: 'box', x: 500, y: 260, text: 'Notify requester: rejected' },
        { type: 'box', x: 740, y: 260, text: 'Request closed' },
      ],
      [
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3, label: 'Yes' },
        { from: 3, to: 4 }, { from: 2, to: 5, label: 'No' }, { from: 5, to: 6 },
      ],
    ),
  },
  {
    id: 'website', name: 'Website / project', desc: 'Discovery through launch',
    build: () => buildTemplate(
      [
        { type: 'box', x: 60, y: 60, text: 'Discovery call' },
        { type: 'box', x: 280, y: 60, text: 'Draft proposal & scope' },
        { type: 'diamond', x: 500, y: 40, text: 'Client approves scope?' },
        { type: 'box', x: 740, y: 60, text: 'Design phase' },
        { type: 'box', x: 960, y: 60, text: 'Development phase' },
        { type: 'box', x: 1180, y: 60, text: 'Testing & QA' },
        { type: 'box', x: 1400, y: 60, text: 'Launch' },
        { type: 'box', x: 500, y: 260, text: 'Revise proposal' },
      ],
      [
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3, label: 'Yes' },
        { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 6 }, { from: 2, to: 7, label: 'No' }, { from: 7, to: 2 },
      ],
    ),
  },
];

function shapeCenter(s) { return { x: s.x + s.w / 2, y: s.y + s.h / 2 }; }

// Distance from a shape's center to its boundary along direction (dx, dy) — rectangle-edge
// intersection for boxes, and an equivalent |x|/hw + |y|/hh = 1 formula for diamonds.
function edgeOffset(shape, dx, dy) {
  const hw = shape.w / 2, hh = shape.h / 2;
  if (dx === 0 && dy === 0) return { x: 0, y: 0 };
  const denom = shape.type === 'diamond'
    ? Math.abs(dx) / hw + Math.abs(dy) / hh
    : Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
  const s = denom === 0 ? 0 : 1 / denom;
  return { x: dx * s, y: dy * s };
}

function arrowGeometry(source, target) {
  const a = shapeCenter(source), b = shapeCenter(target);
  const dx = b.x - a.x, dy = b.y - a.y;
  const startOff = edgeOffset(source, dx, dy);
  const endOff = edgeOffset(target, -dx, -dy);
  return { start: { x: a.x + startOff.x, y: a.y + startOff.y }, end: { x: b.x + endOff.x, y: b.y + endOff.y } };
}

function sanitizeDiagram(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.shapes) || !Array.isArray(data.arrows)) return null;
  const shapeIds = new Set();
  const shapes = [];
  for (const s of data.shapes) {
    if (!s || typeof s !== 'object') continue;
    const { id, type, x, y, w, h } = s;
    if (typeof id !== 'string' || !id || shapeIds.has(id)) continue;
    if (type !== 'box' && type !== 'diamond') continue;
    if (![x, y, w, h].every(n => typeof n === 'number' && Number.isFinite(n))) continue;
    shapeIds.add(id);
    shapes.push({ id, type, x, y, w, h, text: typeof s.text === 'string' ? s.text : '' });
  }
  const arrowIds = new Set();
  const arrows = [];
  for (const a of data.arrows) {
    if (!a || typeof a !== 'object') continue;
    const { id, from, to } = a;
    if (typeof id !== 'string' || !id || arrowIds.has(id)) continue;
    if (!shapeIds.has(from) || !shapeIds.has(to)) continue;
    arrowIds.add(id);
    arrows.push({ id, from, to, label: typeof a.label === 'string' ? a.label : '' });
  }
  return { shapes, arrows };
}

function wrapSvgText(text, maxWidth) {
  const words = (text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const maxChars = Math.max(4, Math.floor(maxWidth / 7));
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = (text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let line = words[0];
  for (let i = 1; i < words.length; i++) {
    const candidate = `${line} ${words[i]}`;
    if (ctx.measureText(candidate).width > maxWidth && line) { lines.push(line); line = words[i]; }
    else line = candidate;
  }
  lines.push(line);
  return lines;
}

function drawDiagramToCanvas(shapes, arrows) {
  const minX = Math.min(...shapes.map(s => s.x));
  const minY = Math.min(...shapes.map(s => s.y));
  const maxX = Math.max(...shapes.map(s => s.x + s.w));
  const maxY = Math.max(...shapes.map(s => s.y + s.h));
  const width = Math.ceil(maxX - minX) + PADDING * 2;
  const height = Math.ceil(maxY - minY) + PADDING * 2;
  const ox = PADDING - minX, oy = PADDING - minY;

  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const byId = Object.fromEntries(shapes.map(s => [s.id, s]));

  arrows.forEach(arrow => {
    const source = byId[arrow.from], target = byId[arrow.to];
    if (!source || !target) return;
    const { start, end } = arrowGeometry(source, target);
    const sx = start.x + ox, sy = start.y + oy, ex = end.x + ox, ey = end.y + oy;
    ctx.strokeStyle = '#5a6a8a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();

    const angle = Math.atan2(ey - sy, ex - sx), headLen = 11;
    ctx.fillStyle = '#5a6a8a';
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath(); ctx.fill();

    if (arrow.label) {
      const mx = (sx + ex) / 2, my = (sy + ey) / 2 - 8;
      ctx.font = 'bold 12px Manrope, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff';
      ctx.strokeText(arrow.label, mx, my);
      ctx.fillStyle = '#10183e';
      ctx.fillText(arrow.label, mx, my);
    }
  });

  shapes.forEach(shape => {
    const x = shape.x + ox, y = shape.y + oy, { w, h } = shape;
    ctx.lineWidth = 2;
    ctx.fillStyle = shape.type === 'diamond' ? '#fff7e6' : '#eef2ff';
    ctx.strokeStyle = shape.type === 'diamond' ? '#b5790a' : '#2c5cc5';
    ctx.beginPath();
    if (shape.type === 'diamond') {
      const cx = x + w / 2, cy = y + h / 2;
      ctx.moveTo(cx, y); ctx.lineTo(x + w, cy); ctx.lineTo(cx, y + h); ctx.lineTo(x, cy);
    } else {
      const r = 10;
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#10183e';
    ctx.font = '600 13px Manrope, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxTextWidth = shape.type === 'diamond' ? w * 0.55 : w - 20;
    const lines = wrapCanvasText(ctx, shape.text || '', maxTextWidth);
    const lineHeight = 16;
    const startY = y + h / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => ctx.fillText(line, x + w / 2, startY + i * lineHeight));
  });

  return canvas;
}

function ShapeNode({ shape, selected, connectSource, onPointerDown, onDoubleClick }) {
  const { x, y, w, h, type, text } = shape;
  const cx = x + w / 2, cy = y + h / 2;
  const lines = wrapSvgText(text, type === 'diamond' ? w * 0.55 : w - 24);
  const className = `wf-shape wf-shape-${type}${selected ? ' selected' : ''}${connectSource ? ' connect-source' : ''}`;
  return (
    <g className={className} onPointerDown={onPointerDown} onDoubleClick={onDoubleClick} aria-label={text || 'Untitled shape'}>
      {type === 'diamond'
        ? <polygon points={`${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`} />
        : <rect x={x} y={y} width={w} height={h} rx={10} ry={10} />}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
        {lines.map((line, i) => <tspan key={i} x={cx} dy={i === 0 ? `${-(lines.length - 1) * 0.6}em` : '1.2em'}>{line}</tspan>)}
      </text>
    </g>
  );
}

function ArrowShape({ arrow, shapes, selected, onSelect }) {
  const source = shapes.find(s => s.id === arrow.from);
  const target = shapes.find(s => s.id === arrow.to);
  if (!source || !target) return null;
  const { start, end } = arrowGeometry(source, target);
  const angle = Math.atan2(end.y - start.y, end.x - start.x), headLen = 11;
  const p1 = { x: end.x - headLen * Math.cos(angle - Math.PI / 6), y: end.y - headLen * Math.sin(angle - Math.PI / 6) };
  const p2 = { x: end.x - headLen * Math.cos(angle + Math.PI / 6), y: end.y - headLen * Math.sin(angle + Math.PI / 6) };
  const midX = (start.x + end.x) / 2, midY = (start.y + end.y) / 2;
  return (
    <g className={`wf-arrow${selected ? ' selected' : ''}`} onClick={onSelect} aria-label={arrow.label ? `Arrow: ${arrow.label}` : 'Arrow'}>
      <line className="wf-arrow-hit" x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
      <line className="wf-arrow-line" x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
      <polygon className="wf-arrow-head" points={`${end.x},${end.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`} />
      {arrow.label && <text className="wf-arrow-label" x={midX} y={midY - 7} textAnchor="middle">{arrow.label}</text>}
    </g>
  );
}

export default function WorkflowDiagramTool() {
  const [shapes, setShapes] = useState([]);
  const [arrows, setArrows] = useState([]);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [connectFrom, setConnectFrom] = useState(null);
  const [importError, setImportError] = useState('');
  const [exportError, setExportError] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const restored = useRef(false);
  const dragRef = useRef(null);

  const loadSharedDiagram = useCallback(shared => {
    const clean = sanitizeDiagram(shared);
    if (!clean) return;
    setShapes(clean.shapes);
    setArrows(clean.arrows);
    setSelected(null);
    setEditing(null);
    setHistory([]);
    setFuture([]);
  }, []);

  const { loadedFromShare, shareChecked, dismissLoadedBanner, sharePanelProps } = useToolShare({
    toolId: 'workflow',
    getPayload: () => ({ shapes, arrows }),
    onLoad: loadSharedDiagram,
    canShare: shapes.length > 0 || arrows.length > 0,
    confirmOnReplace: () => shapes.length > 0 || arrows.length > 0,
    invalidateDeps: [shapes, arrows],
  });

  useEffect(() => {
    if (!shareChecked || loadedFromShare) {
      if (shareChecked) restored.current = true;
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const clean = sanitizeDiagram(JSON.parse(raw));
        if (clean) { setShapes(clean.shapes); setArrows(clean.arrows); }
      }
    } catch { /* ignore unreadable local storage */ }
    restored.current = true;
  }, [shareChecked, loadedFromShare]);

  useEffect(() => {
    if (!restored.current) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ shapes, arrows })); } catch { /* storage unavailable */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [shapes, arrows]);

  // Any new action invalidates whatever could have been redone.
  const pushHistory = () => { setHistory(h => [...h.slice(-(HISTORY_LIMIT - 1)), { shapes, arrows }]); setFuture([]); };

  const undo = () => {
    if (!history.length) return;
    const last = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setFuture(f => [...f.slice(-(HISTORY_LIMIT - 1)), { shapes, arrows }]);
    setShapes(last.shapes);
    setArrows(last.arrows);
    setSelected(null);
    setEditing(null);
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[future.length - 1];
    setFuture(f => f.slice(0, -1));
    setHistory(h => [...h.slice(-(HISTORY_LIMIT - 1)), { shapes, arrows }]);
    setShapes(next.shapes);
    setArrows(next.arrows);
    setSelected(null);
    setEditing(null);
  };

  useEffect(() => {
    const onKeyDown = e => {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      if (typing) return;
      if (e.key === 'Escape') {
        if (connecting) { setConnecting(false); setConnectFrom(null); return; }
        if (editing) { setEditing(null); return; }
        setSelected(null);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault();
        deleteSelected();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, shapes, arrows, history, future, connecting, editing]);

  const nextShapePosition = () => {
    const last = shapes[shapes.length - 1];
    if (!last) return { x: 60, y: 60 };
    let x = last.x + 40, y = last.y + 40;
    if (x > CANVAS_W - 220 || y > CANVAS_H - 150) { x = 60; y = 60 + (shapes.length % 5) * 24; }
    return { x, y };
  };

  const addShape = type => {
    pushHistory();
    const { x, y } = nextShapePosition();
    const shape = {
      id: makeId('shape'), type, x, y,
      w: type === 'diamond' ? DIAMOND_W : BOX_W, h: type === 'diamond' ? DIAMOND_H : BOX_H,
      text: type === 'diamond' ? 'Decision?' : 'New step',
    };
    setShapes(prev => [...prev, shape]);
    setSelected({ type: 'shape', id: shape.id });
  };

  const deleteSelected = () => {
    if (!selected) return;
    pushHistory();
    if (selected.type === 'shape') {
      setShapes(prev => prev.filter(s => s.id !== selected.id));
      setArrows(prev => prev.filter(a => a.from !== selected.id && a.to !== selected.id));
    } else {
      setArrows(prev => prev.filter(a => a.id !== selected.id));
    }
    setSelected(null);
  };

  const toggleConnect = () => {
    setConnecting(v => !v);
    setConnectFrom(null);
  };

  const handleConnectClick = shape => {
    if (!connectFrom) { setConnectFrom(shape.id); return; }
    if (connectFrom === shape.id) return;
    pushHistory();
    const arrow = { id: makeId('arrow'), from: connectFrom, to: shape.id, label: '' };
    setArrows(prev => [...prev, arrow]);
    setConnecting(false);
    setConnectFrom(null);
    setSelected({ type: 'arrow', id: arrow.id });
  };

  const startEdit = shape => {
    if (connecting) return;
    setSelected({ type: 'shape', id: shape.id });
    setEditing({ id: shape.id, text: shape.text });
  };

  const commitEdit = () => {
    if (!editing) return;
    const current = editing;
    const prev = shapes.find(s => s.id === current.id);
    setEditing(null);
    if (!prev || prev.text === current.text) return;
    pushHistory();
    setShapes(prevShapes => prevShapes.map(s => (s.id === current.id ? { ...s, text: current.text } : s)));
  };

  const handleDragMove = useCallback(e => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startClientX, dy = e.clientY - drag.startClientY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.moved = true;
    setShapes(prev => prev.map(s => (s.id === drag.id ? { ...s, x: drag.orig.x + dx, y: drag.orig.y + dy } : s)));
  }, []);

  const handleDragEnd = useCallback(() => {
    window.removeEventListener('pointermove', handleDragMove);
    window.removeEventListener('pointerup', handleDragEnd);
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.moved) { setHistory(h => [...h.slice(-(HISTORY_LIMIT - 1)), drag.origDiagram]); setFuture([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleDragMove]);

  const beginShapeDrag = shape => e => {
    if (editing) return;
    e.stopPropagation();
    if (connecting) { handleConnectClick(shape); return; }
    setSelected({ type: 'shape', id: shape.id });
    dragRef.current = {
      id: shape.id, startClientX: e.clientX, startClientY: e.clientY,
      orig: { x: shape.x, y: shape.y }, origDiagram: { shapes, arrows }, moved: false,
    };
    window.addEventListener('pointermove', handleDragMove);
    window.addEventListener('pointerup', handleDragEnd);
  };

  const selectArrow = arrow => e => {
    e.stopPropagation();
    if (connecting) return;
    setSelected({ type: 'arrow', id: arrow.id });
  };

  const handleBackgroundClick = () => setSelected(null);

  const newDiagram = () => {
    if (!shapes.length && !arrows.length) return;
    if (!window.confirm('Start a new diagram? This clears the current canvas.')) return;
    pushHistory();
    setShapes([]); setArrows([]); setSelected(null); setEditing(null); setConnecting(false); setConnectFrom(null);
  };

  const loadTemplate = id => {
    const tpl = TEMPLATES.find(t => t.id === id);
    if (!tpl) return;
    if ((shapes.length || arrows.length) && !window.confirm(`Load "${tpl.name}"? This will replace your current diagram.`)) return;
    pushHistory();
    const built = tpl.build();
    setShapes(built.shapes); setArrows(built.arrows); setSelected(null); setEditing(null); setConnecting(false); setConnectFrom(null);
  };

  const exportPng = () => {
    if (!shapes.length) return;
    const canvas = drawDiagramToCanvas(shapes, arrows);
    const a = Object.assign(document.createElement('a'), { href: canvas.toDataURL('image/png'), download: 'workflow-diagram.png' });
    a.click();
  };

  const exportPdf = async () => {
    if (!shapes.length || exportingPdf) return;
    setExportingPdf(true); setExportError('');
    try {
      const canvas = drawDiagramToCanvas(shapes, arrows);
      const { PDFDocument } = await import('pdf-lib');
      const pdf = await PDFDocument.create();
      const pngBytes = await fetch(canvas.toDataURL('image/png')).then(response => response.arrayBuffer());
      const png = await pdf.embedPng(pngBytes);
      const page = pdf.addPage([canvas.width, canvas.height]);
      page.drawImage(png, { x: 0, y: 0, width: canvas.width, height: canvas.height });
      const bytes = await pdf.save();
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), download: 'workflow-diagram.pdf' });
      a.click(); URL.revokeObjectURL(a.href);
    } catch (err) { setExportError(err.message || 'Could not export this diagram as a PDF.'); }
    setExportingPdf(false);
  };

  const exportJson = () => {
    if (!shapes.length && !arrows.length) return;
    const data = JSON.stringify({ shapes, arrows }, null, 2);
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([data], { type: 'application/json' })), download: 'workflow-diagram.json' });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const handleImportFile = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const clean = sanitizeDiagram(JSON.parse(await file.text()));
      if (!clean) { setImportError('That file is not a valid workflow diagram export.'); return; }
      pushHistory();
      setShapes(clean.shapes); setArrows(clean.arrows); setSelected(null); setEditing(null);
      setImportError('');
    } catch { setImportError('Could not read that file as JSON.'); }
  };

  const editingShape = editing ? shapes.find(s => s.id === editing.id) : null;

  const selectionLabel = (() => {
    if (!selected) return '';
    if (selected.type === 'arrow') {
      const arrow = arrows.find(a => a.id === selected.id);
      return arrow?.label ? `Arrow: ${arrow.label}` : 'Arrow selected';
    }
    const shape = shapes.find(s => s.id === selected.id);
    if (!shape) return '';
    const kind = shape.type === 'diamond' ? 'Decision' : 'Step';
    return `${kind}: ${shape.text || 'Untitled'}`;
  })();

  // Positions a small delete button right on the current selection, so removing
  // something is a single click at the point of selection rather than a toolbar hunt.
  const deleteBadgePos = (() => {
    if (!selected || editing) return null;
    if (selected.type === 'shape') {
      const shape = shapes.find(s => s.id === selected.id);
      return shape ? { left: shape.x + shape.w - 14, top: shape.y - 14 } : null;
    }
    const arrow = arrows.find(a => a.id === selected.id);
    if (!arrow) return null;
    const source = shapes.find(s => s.id === arrow.from);
    const target = shapes.find(s => s.id === arrow.to);
    if (!source || !target) return null;
    const { start, end } = arrowGeometry(source, target);
    return { left: (start.x + end.x) / 2 - 14, top: (start.y + end.y) / 2 + 10 };
  })();

  return (
    <div className="wf-root">
      <div className="wf-intro">
        <ToolGlyph name="workflow" size={22}/>
        <div>
          <strong>Map a process, export it, share it</strong>
          <span>Boxes for steps, diamonds for decisions, arrows for flow. Everything stays in your browser.</span>
        </div>
      </div>

      <ToolShareBanner show={loadedFromShare} onDismiss={dismissLoadedBanner} message="Loaded a diagram from a shared link."/>

      <section className="wf-templates" aria-label="Starter templates">
        <div className="wf-templates-head">
          <strong>Start from a template</strong>
          <span>Or build your own below</span>
        </div>
        <div className="wf-template-grid">
          {TEMPLATES.map(t => (
            <button key={t.id} type="button" className="wf-template-card" onClick={() => loadTemplate(t.id)}>
              {t.name}
              <small>{t.desc}</small>
            </button>
          ))}
          <button type="button" className="wf-template-card wf-template-blank" onClick={newDiagram} disabled={!shapes.length && !arrows.length}>
            <ToolGlyph name="refresh" size={15}/> Blank canvas
            <small>Clear and start from scratch</small>
          </button>
        </div>
      </section>

      <section className="wf-build" aria-label="Diagram tools">
        <div className="wf-build-actions">
          <button className="button secondary compact wf-btn-primary" onClick={() => addShape('box')}><ToolGlyph name="square" size={14}/> Box</button>
          <button className="button secondary compact" onClick={() => addShape('diamond')}><ToolGlyph name="diamond" size={14}/> Decision</button>
          <button className={`button secondary compact${connecting ? ' active' : ''}`} onClick={toggleConnect}><ToolGlyph name="arrowRight" size={14}/> {connecting ? 'Cancel arrow' : 'Arrow'}</button>
        </div>
        <div className="wf-build-actions">
          <button className="button secondary compact" onClick={undo} disabled={!history.length} title="Undo (Ctrl/Cmd+Z)"><ToolGlyph name="undo" size={14}/> Undo</button>
          <button className="button secondary compact" onClick={redo} disabled={!future.length} title="Redo (Ctrl/Cmd+Shift+Z)"><ToolGlyph name="redo" size={14}/> Redo</button>
          <span className="wf-build-meta"><strong>{shapes.length}</strong> shape{shapes.length !== 1 ? 's' : ''} · <strong>{arrows.length}</strong> arrow{arrows.length !== 1 ? 's' : ''}</span>
        </div>
      </section>

      {importError && <p className="pdf-error">{importError}</p>}
      {exportError && <p className="pdf-error">{exportError}</p>}

      <div className="wf-workspace">
        <div className="wf-workspace-head">
          <span className="wf-workspace-title">Diagram canvas</span>
          <div className="wf-workspace-stats">
            <span className="wf-stat"><em>{shapes.filter(s => s.type === 'box').length}</em> steps</span>
            <span className="wf-stat"><em>{shapes.filter(s => s.type === 'diamond').length}</em> decisions</span>
            <span className="wf-stat"><em>{arrows.length}</em> arrows</span>
          </div>
        </div>

        {connecting && (
          <div className="wf-connect-banner" role="status">
            <ToolGlyph name="link" size={16}/>
            {connectFrom ? 'Click the destination shape.' : 'Click the starting shape, then the destination.'}
          </div>
        )}

        <div className="wf-canvas-scroll">
          <div className="wf-canvas-stage" style={{ width: CANVAS_W, height: CANVAS_H }}>
            <svg width={CANVAS_W} height={CANVAS_H} className="wf-svg">
              <defs>
                <pattern id="wf-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="#d8dee8"/>
                </pattern>
              </defs>
              <rect x="0" y="0" width={CANVAS_W} height={CANVAS_H} className="wf-bg" onClick={handleBackgroundClick}/>
              {arrows.map(arrow => (
                <ArrowShape key={arrow.id} arrow={arrow} shapes={shapes} selected={selected?.type === 'arrow' && selected.id === arrow.id} onSelect={selectArrow(arrow)}/>
              ))}
              {shapes.map(shape => (
                <ShapeNode key={shape.id} shape={shape} selected={selected?.type === 'shape' && selected.id === shape.id} connectSource={connectFrom === shape.id}
                  onPointerDown={beginShapeDrag(shape)} onDoubleClick={() => startEdit(shape)}/>
              ))}
            </svg>

            {editingShape && (
              <textarea
                className="wf-edit-input"
                style={{ left: editingShape.x, top: editingShape.y, width: editingShape.w, height: editingShape.h }}
                autoFocus
                value={editing.text}
                onChange={e => setEditing(prev => ({ ...prev, text: e.target.value }))}
                onBlur={commitEdit}
                onKeyDown={e => {
                  if (e.key === 'Escape') { e.stopPropagation(); setEditing(null); }
                  else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); commitEdit(); }
                }}
              />
            )}

            {deleteBadgePos && (
              <button
                type="button"
                className="wf-delete-badge"
                style={{ left: deleteBadgePos.left, top: deleteBadgePos.top }}
                onClick={deleteSelected}
                title="Delete"
                aria-label="Delete selected item"
              >
                <ToolGlyph name="trash" size={13}/>
              </button>
            )}

            {shapes.length === 0 && (
              <div className="wf-empty-state">
                <ToolGlyph name="workflow" size={40}/>
                <strong>Your diagram goes here</strong>
                <p>Pick a template above, or use + Box / + Decision to add your first shape. Double-click any shape to rename it.</p>
              </div>
            )}
          </div>
        </div>

        <div className="wf-workspace-foot">
          <p className="wf-tip">Double-click to edit · drag to move · select then click the trash icon (or press Delete) to remove · Esc to deselect</p>
          {selectionLabel && <span className="wf-selection">{selectionLabel}</span>}
        </div>
      </div>

      <ToolSharePanel
        {...sharePanelProps}
        footnote="The link contains the whole diagram — opening it loads an editable copy. Nothing is stored on a server."
        qrHint="Scan to open this diagram on another device"
      />

      <section className="wf-files" aria-label="Save, load, and export">
        <span className="wf-section-label">Files</span>
        <div className="wf-files-actions">
          <label className="button secondary compact wf-file-btn"><ToolGlyph name="folder" size={14}/> Load JSON<input type="file" accept="application/json" onChange={handleImportFile} /></label>
          <span className="wf-section-divider" aria-hidden="true"/>
          <button className="button secondary compact" onClick={exportPng} disabled={!shapes.length}>Download PNG</button>
          <button className="button secondary compact" onClick={exportPdf} disabled={!shapes.length || exportingPdf}>{exportingPdf ? 'Exporting…' : 'Download PDF'}</button>
          <button className="button secondary compact" onClick={exportJson} disabled={!shapes.length && !arrows.length}>Save JSON</button>
        </div>
      </section>

      <p className="tool-footnote">Diagrams save automatically in this browser only. Nothing is uploaded.</p>
    </div>
  );
}
