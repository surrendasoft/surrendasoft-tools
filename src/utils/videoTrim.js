export const MAX_VIDEO_TRIM_BYTES = 120 * 1024 * 1024;

export function formatVideoTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  const tenth = Math.floor((seconds - whole) * 10);
  const base = `${mins}:${String(secs).padStart(2, '0')}`;
  return tenth ? `${base}.${tenth}` : base;
}

export function clampTime(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function buildKeepRegions({ duration, trimStart, trimEnd, middleCut, cutStart, cutEnd }) {
  const start = clampTime(trimStart, 0, duration);
  const end = clampTime(trimEnd, start, duration);
  if (!middleCut) return [{ start, end }];

  const removeStart = clampTime(cutStart, start, end);
  const removeEnd = clampTime(cutEnd, removeStart, end);
  if (removeEnd - removeStart < 0.05) return [{ start, end }];

  const regions = [];
  if (removeStart - start >= 0.05) regions.push({ start, end: removeStart });
  if (end - removeEnd >= 0.05) regions.push({ start: removeEnd, end });
  return regions.length ? regions : [{ start, end }];
}

export function keptDuration(regions) {
  return regions.reduce((total, region) => total + Math.max(0, region.end - region.start), 0);
}

function inputNameForFile(file) {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.webm')) return 'input.webm';
  if (lower.endsWith('.mov')) return 'input.mov';
  if (lower.endsWith('.mkv')) return 'input.mkv';
  return 'input.mp4';
}

function outputNameForFile(file) {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.webm')) return 'output.webm';
  return 'output.mp4';
}

let ffmpegInstance = null;
let ffmpegLoading = null;

async function getFfmpeg({ onProgress, onStatus }) {
  if (ffmpegInstance) return ffmpegInstance;
  if (!ffmpegLoading) {
    ffmpegLoading = (async () => {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { toBlobURL } = await import('@ffmpeg/util');
      const ffmpeg = new FFmpeg();
      ffmpeg.on('progress', ({ progress }) => onProgress?.(Math.min(99, Math.round((progress || 0) * 100))));
      ffmpeg.on('log', ({ message }) => {
        if (message) onStatus?.(message);
      });
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();
  }
  return ffmpegLoading;
}

export async function exportTrimmedVideo({ file, regions, onProgress, onStatus }) {
  if (!regions.length) throw new Error('Choose a section of video to keep.');
  const kept = keptDuration(regions);
  if (kept < 0.1) throw new Error('The kept section is too short. Leave at least 0.1 seconds.');

  onStatus?.('Loading video engine…');
  const { fetchFile } = await import('@ffmpeg/util');
  const ffmpeg = await getFfmpeg({ onProgress, onStatus });
  const inputName = inputNameForFile(file);
  const outputName = outputNameForFile(file);

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  if (regions.length === 1) {
    onStatus?.('Trimming video…');
    const { start, end } = regions[0];
    await ffmpeg.exec(['-ss', String(start), '-to', String(end), '-i', inputName, '-c', 'copy', outputName]);
  } else {
    const partNames = [];
    for (let index = 0; index < regions.length; index += 1) {
      onStatus?.(`Extracting part ${index + 1} of ${regions.length}…`);
      const partName = `part-${index}.mp4`;
      await ffmpeg.exec([
        '-ss', String(regions[index].start),
        '-to', String(regions[index].end),
        '-i', inputName,
        '-c', 'copy',
        partName,
      ]);
      partNames.push(partName);
    }
    onStatus?.('Joining kept sections…');
    const list = partNames.map(name => `file '${name}'`).join('\n');
    await ffmpeg.writeFile('list.txt', list);
    await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', outputName]);
  }

  onProgress?.(100);
  onStatus?.('Preparing download…');
  const data = await ffmpeg.readFile(outputName);
  const mime = outputName.endsWith('.webm') ? 'video/webm' : 'video/mp4';
  return new Blob([data.buffer], { type: mime });
}

export function trimmedFileName(originalName) {
  const base = originalName.replace(/\.[^./]+$/, '') || 'video';
  const lower = originalName.toLowerCase();
  const ext = lower.endsWith('.webm') ? '.webm' : '.mp4';
  return `${base}-trimmed${ext}`;
}
