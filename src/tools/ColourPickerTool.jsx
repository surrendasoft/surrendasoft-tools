import { useState } from 'react';

// ── colour math ──────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
function hslToRgb(h, s, l) {
  s /= 100; l /= 100; h /= 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return { r: Math.round(hue(p, q, h + 1 / 3) * 255), g: Math.round(hue(p, q, h) * 255), b: Math.round(hue(p, q, h - 1 / 3) * 255) };
}
function relativeLuminance(r, g, b) {
  const sRGB = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * sRGB(r) + 0.7152 * sRGB(g) + 0.0722 * sRGB(b);
}
function contrastRatio(hex, bg = '#ffffff') {
  const c = hexToRgb(hex), b = hexToRgb(bg);
  const L1 = relativeLuminance(c.r, c.g, c.b), L2 = relativeLuminance(b.r, b.g, b.b);
  const [bright, dark] = L1 > L2 ? [L1, L2] : [L2, L1];
  return ((bright + 0.05) / (dark + 0.05)).toFixed(2);
}

export default function ColourPickerTool() {
  const [hex, setHex] = useState('#2c5cc5');
  const [copied, setCopied] = useState('');

  const safeHex = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#2c5cc5';
  const rgb = hexToRgb(safeHex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const updateRgb = (ch, val) => {
    const v = { r: rgb.r, g: rgb.g, b: rgb.b };
    v[ch] = Math.min(255, Math.max(0, Number(val) || 0));
    setHex(rgbToHex(v.r, v.g, v.b));
  };
  const updateHsl = (ch, val) => {
    const v = { h: hsl.h, s: hsl.s, l: hsl.l };
    v[ch] = Number(val) || 0;
    const rgb2 = hslToRgb(v.h, v.s, v.l);
    setHex(rgbToHex(rgb2.r, rgb2.g, rgb2.b));
  };

  const copy = async text => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(text);
    setTimeout(() => setCopied(c => c === text ? '' : c), 1500);
  };

  const onWhite = contrastRatio(safeHex, '#ffffff');
  const onBlack = contrastRatio(safeHex, '#000000');
  const wcagLabel = r => +r >= 7 ? 'AAA ✓' : +r >= 4.5 ? 'AA ✓' : +r >= 3 ? 'AA Large' : 'Fail ✗';

  const formats = [
    { label: 'HEX', value: safeHex.toUpperCase() },
    { label: 'RGB', value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
    { label: 'HSL', value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
    { label: 'CSS HWB', value: `hwb(${hsl.h} ${Math.round((1 - hsl.s / 100) * hsl.l)}% ${Math.round((1 - hsl.s / 100) * (100 - hsl.l))}%)` },
  ];

  return (
    <div className="colour-root">
      <div className="colour-top">
        <div className="colour-swatch-col">
          <div className="colour-swatch" style={{ background: safeHex }} />
          <label className="colour-picker-btn">
            <input type="color" value={safeHex} onChange={e => setHex(e.target.value)} />
            Open picker
          </label>
          <div className="colour-contrast-block">
            <div className="colour-contrast-row">
              <span className="colour-contrast-bg colour-contrast-white" style={{ color: safeHex }}>Aa</span>
              <div>
                <small>On white</small>
                <b>{onWhite}:1 <span className={+onWhite >= 4.5 ? 'wcag-pass' : 'wcag-fail'}>{wcagLabel(onWhite)}</span></b>
              </div>
            </div>
            <div className="colour-contrast-row">
              <span className="colour-contrast-bg colour-contrast-black" style={{ color: safeHex }}>Aa</span>
              <div>
                <small>On black</small>
                <b>{onBlack}:1 <span className={+onBlack >= 4.5 ? 'wcag-pass' : 'wcag-fail'}>{wcagLabel(onBlack)}</span></b>
              </div>
            </div>
          </div>
        </div>
        <div className="colour-controls">
          <div className="colour-group">
            <span className="colour-group-label">HEX</span>
            <input
              className="colour-hex-input"
              value={hex}
              onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setHex(e.target.value); }}
              maxLength={7}
              spellCheck={false}
            />
          </div>
          <div className="colour-group">
            <span className="colour-group-label">RGB</span>
            <div className="colour-row3">
              {['r', 'g', 'b'].map(ch => (
                <label key={ch}>
                  <span>{ch.toUpperCase()}</span>
                  <input type="number" min="0" max="255" value={rgb[ch]} onChange={e => updateRgb(ch, e.target.value)} />
                </label>
              ))}
            </div>
          </div>
          <div className="colour-group">
            <span className="colour-group-label">HSL</span>
            <div className="colour-row3">
              <label><span>H°</span><input type="number" min="0" max="360" value={hsl.h} onChange={e => updateHsl('h', e.target.value)} /></label>
              <label><span>S%</span><input type="number" min="0" max="100" value={hsl.s} onChange={e => updateHsl('s', e.target.value)} /></label>
              <label><span>L%</span><input type="number" min="0" max="100" value={hsl.l} onChange={e => updateHsl('l', e.target.value)} /></label>
            </div>
          </div>
        </div>
      </div>
      <div className="colour-formats">
        {formats.map(({ label, value }) => (
          <div key={label} className="colour-fmt-row">
            <span className="colour-fmt-label">{label}</span>
            <code className="colour-fmt-val">{value}</code>
            <button className="colour-copy-btn" onClick={() => copy(value)}>
              {copied === value ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
