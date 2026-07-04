import { useEffect, useMemo, useState } from 'react';

export default function SystemInfoTool() {
  const [ip, setIp] = useState('Loading\u2026');
  const [privateIp, setPrivateIp] = useState('Detecting\u2026');

  useEffect(() => {
    let active = true;

    // Public IP
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(d => { if (active) setIp(d.ip); })
      .catch(() => { if (active) setIp('Unavailable'); });

    // Private IP via WebRTC ICE candidate leak
    let pc = null;
    try {
      pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.createOffer().then(o => pc.setLocalDescription(o)).catch(() => {});
      const found = new Set();
      pc.onicecandidate = e => {
        if (!active) return;
        if (e.candidate) {
          const m = /\b(\d{1,3}(?:\.\d{1,3}){3})\b/.exec(e.candidate.candidate);
          if (m && m[1] !== '0.0.0.0') { found.add(m[1]); setPrivateIp([...found].join(', ')); }
        } else {
          if (active && found.size === 0) setPrivateIp('Not available');
        }
      };
    } catch { setPrivateIp('Not available'); }

    return () => { active = false; pc?.close(); };
  }, []);

  const info = useMemo(() => {
    const nav = typeof navigator !== 'undefined' ? navigator : {};
    const agent = nav.userAgent || '';

    // Browser + version
    const edgeM = agent.match(/Edg\/(\d+)/), oprM = agent.match(/OPR\/(\d+)/),
          ffM = agent.match(/Firefox\/(\d+)/), chrM = agent.match(/Chrome\/(\d+)/),
          safM = agent.match(/Version\/(\d+).*Safari/);
    const browser = edgeM ? `Microsoft Edge ${edgeM[1]}` : oprM ? `Opera ${oprM[1]}`
      : ffM ? `Firefox ${ffM[1]}` : chrM ? `Chrome ${chrM[1]}`
      : safM ? `Safari ${safM[1]}` : 'Unknown';

    // OS
    const os = /Windows NT 10/.test(agent) ? 'Windows 10/11'
      : /Windows NT 6\.1/.test(agent) ? 'Windows 7'
      : /Windows/.test(agent) ? 'Windows'
      : /Mac OS X/.test(agent) ? 'macOS'
      : /Android/.test(agent) ? 'Android'
      : /(iPhone|iPad|iPod)/.test(agent) ? 'iOS'
      : /Linux/.test(agent) ? 'Linux' : 'Unknown';

    // GPU via WebGL
    let gpu = 'Unknown';
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) { const ext = gl.getExtension('WEBGL_debug_renderer_info'); if (ext) gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL); }
    } catch {}

    // Connection
    const conn = nav.connection;
    const connection = conn
      ? [conn.effectiveType?.toUpperCase(), conn.downlink ? `${conn.downlink} Mbps` : null].filter(Boolean).join(' \u00b7 ')
      : (nav.onLine === false ? 'Offline' : 'Online');

    return {
      browser, os, gpu,
      ram: nav.deviceMemory ? `\u2265\u2009${nav.deviceMemory} GB` : 'Unknown',
      cores: nav.hardwareConcurrency ? `${nav.hardwareConcurrency} logical cores` : 'Unknown',
      language: nav.language || 'Unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
      screen: typeof window !== 'undefined' ? `${window.screen.width} \u00d7 ${window.screen.height}` : 'Unknown',
      viewport: typeof window !== 'undefined' ? `${window.innerWidth} \u00d7 ${window.innerHeight}` : 'Unknown',
      dpr: typeof window !== 'undefined' ? `${window.devicePixelRatio}x${window.devicePixelRatio > 1 ? ' \u2014 HiDPI' : ''}` : 'Unknown',
      colorScheme: typeof window !== 'undefined' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light') : 'Unknown',
      touch: nav.maxTouchPoints > 0 ? `Yes \u2014 ${nav.maxTouchPoints} point${nav.maxTouchPoints > 1 ? 's' : ''}` : 'No',
      cookies: nav.cookieEnabled ? 'Enabled' : 'Disabled',
      connection,
    };
  }, []);

  const rows = [
    ['Public IP', ip],
    ['Private IP \u2014 WebRTC', privateIp],
    ['Browser', info.browser],
    ['Operating system', info.os],
    ['GPU', info.gpu],
    ['RAM', info.ram],
    ['CPU', info.cores],
    ['Screen', info.screen],
    ['Viewport', info.viewport],
    ['Pixel ratio', info.dpr],
    ['Colour scheme', info.colorScheme],
    ['Touch screen', info.touch],
    ['Language', info.language],
    ['Time zone', info.timezone],
    ['Network', info.connection],
    ['Cookies', info.cookies],
  ];

  return <>
    <div className="sysinfo-grid">{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <p className="tool-footnote">Public IP via ipify.org \u00b7 Private IP detected client-side via WebRTC (no data sent anywhere) \u00b7 Everything else is read directly from your browser. Nothing is stored or sent to SurrendaSoft.</p>
  </>;
}
