import { describe, expect, it } from 'vitest';
import { detectFileKind, extractPlainText } from './textExtract.js';

function makeFile(name, type, content = '') {
  return new File([content], name, { type });
}

describe('detectFileKind', () => {
  it('identifies PDFs by MIME type and extension', () => {
    expect(detectFileKind(makeFile('report.pdf', 'application/pdf'))).toBe('pdf');
    expect(detectFileKind(makeFile('report.PDF', ''))).toBe('pdf');
  });

  it('identifies Word documents by MIME type and extension', () => {
    expect(detectFileKind(makeFile('letter.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))).toBe('docx');
    expect(detectFileKind(makeFile('letter.docx', ''))).toBe('docx');
  });

  it('identifies raster images but not SVG', () => {
    expect(detectFileKind(makeFile('photo.jpg', 'image/jpeg'))).toBe('image');
    expect(detectFileKind(makeFile('photo.png', 'image/png'))).toBe('image');
    expect(detectFileKind(makeFile('scan.bmp', ''))).toBe('image');
    expect(detectFileKind(makeFile('icon.svg', 'image/svg+xml'))).toBe('unsupported');
  });

  it('identifies plain-text-ish files by MIME type or extension', () => {
    expect(detectFileKind(makeFile('notes.txt', 'text/plain'))).toBe('text');
    expect(detectFileKind(makeFile('data.json', 'application/json'))).toBe('text');
    expect(detectFileKind(makeFile('readme.md', ''))).toBe('text');
    expect(detectFileKind(makeFile('config.yaml', ''))).toBe('text');
  });

  it('falls back to unsupported for unknown files', () => {
    expect(detectFileKind(makeFile('archive.zip', 'application/zip'))).toBe('unsupported');
    expect(detectFileKind(makeFile('song.mp3', 'audio/mpeg'))).toBe('unsupported');
  });
});

describe('extractPlainText', () => {
  it('reads the full contents of a text file', async () => {
    const file = makeFile('notes.txt', 'text/plain', 'Hello there\nSecond line');
    await expect(extractPlainText(file)).resolves.toBe('Hello there\nSecond line');
  });

  it('normalises Windows line endings', async () => {
    const file = makeFile('notes.txt', 'text/plain', 'Line one\r\nLine two\r\n');
    await expect(extractPlainText(file)).resolves.toBe('Line one\nLine two\n');
  });

  it('returns an empty string for an empty file', async () => {
    const file = makeFile('empty.txt', 'text/plain', '');
    await expect(extractPlainText(file)).resolves.toBe('');
  });
});
