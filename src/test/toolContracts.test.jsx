import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../App.jsx';
import { tools } from '../data/tools.js';

const workspaceSelectors = {
  emoji: '.search-box input',
  dates: 'input[type="date"]',
  schedule: '.schedule-generate',
  gst: '[aria-label="GST calculation mode"]',
  cleaner: '.segmented',
  oneline: '.one-line-actions',
  invoice: '.field-row',
  case: '.case-actions',
  counter: '.counter-grid',
  shrinker: '.shrink-button',
  html: 'iframe[title="Sandboxed HTML preview"]',
  json: '.json-editor',
  imagepdf: '.pdf-drop',
  pdfimage: '.pdf-drop',
  combinepdf: '.pdf-action',
  webstatus: '.status-button',
  speed: '.speed-panel',
  hourly: '.calculator-results',
  margin: '.margin-results',
  signpdf: '.pdf-drop',
  tts: '.tts-actions',
  recorder: '.recorder-stage',
  location: '.status-button',
  sysinfo: '.sysinfo-grid',
  camera: '.camera-controls',
  percent: '.pct-tabs',
  units: '.unit-row',
  scam: '.scam-form',
  linkscam: '.linkscam-root',
  qrscam: '.qrscam-root',
  seo: '.status-input-row',
  calc: '.calc-wrap',
  utc: '.utc-grid',
  tz: '.tz-controls',
  qr: '.qr-layout',
  textqr: '.qrt-root',
  localtransfer: '.ldt-root',
  bgremove: '.bgr-upload-zone',
  fileconv: '.bgr-upload-zone',
  fileview: '.bgr-upload-zone',
  suggest: '.suggest-form',
  colour: '.colour-root',
  pomodoro: '.pom-root',
  diff: '.diff-root',
  regex: '.rx-root',
  urlcode: '.urlcode-root',
  exif: '.exif-root',
  canvas: '.cfp-root',
  timer: '.tmr-root',
  stopwatch: '.sw-root',
  multipage: '.mpv-setup',
  viewtest: '.wvt-row',
  urlparams: '.upb-input-row',
  workflow: '.wf-workspace',
  quickform: '.qf-root',
  wordpdf: '.wpc-root',
  maproute: '.msm-root',
  payrequest: '.prg-root',
  invoicepdf: '.sip-root',
  quotepdf: '.sip-root',
  receiptpdf: '.sip-root',
  pdfpages: '.ppt-root',
  pdfform: '.pdfform-root',
  checklist: '.qcs-root',
  textextract: '.txtx-root',
  videotrim: '.vtrim-root',
};

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('AC-SHARED direct tool contracts', () => {
  it('defines one workspace assertion for every registered tool', () => {
    expect(Object.keys(workspaceSelectors).sort()).toEqual(tools.map(tool => tool.id).sort());
  });

  it.each(tools)('loads $name at #$id with its primary workspace', async tool => {
    window.history.replaceState(null, '', `/#${tool.id}`);
    const { container } = render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: tool.name })).toBeInTheDocument();
    await waitFor(() => {
      expect(container.querySelector('.tool-loading')).not.toBeInTheDocument();
      expect(container.querySelector(`.workspace ${workspaceSelectors[tool.id]}`)).toBeInTheDocument();
    });
  });
});
