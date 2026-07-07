import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import ToolGlyph from '../components/ToolGlyph.jsx';
import { FileDrop } from '../components/FileInputs.jsx';
import { formatBytes } from '../utils/format.js';
import {
  MAX_VIDEO_TRIM_BYTES, buildKeepRegions, exportTrimmedVideo, formatVideoTime, keptDuration, trimmedFileName,
} from '../utils/videoTrim.js';
import './VideoTrimTool.css';

const ACCEPT = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.mkv';

function Timeline({ duration, regions, middleCut, cutStart, cutEnd, playhead }) {
  if (!duration) return null;
  const pct = value => `${(value / duration) * 100}%`;
  const width = (start, end) => `${Math.max(0, ((end - start) / duration) * 100)}%`;

  return <div className="vtrim-timeline" aria-hidden="true">
    <div className="vtrim-track">
      {regions.map((region, index) => (
        <span
          key={`${region.start}-${region.end}-${index}`}
          className="vtrim-track-keep"
          style={{ left: pct(region.start), width: width(region.start, region.end) }}
        />
      ))}
      {middleCut && cutEnd > cutStart && (
        <span className="vtrim-track-cut" style={{ left: pct(cutStart), width: width(cutStart, cutEnd) }}/>
      )}
      <span className="vtrim-track-playhead" style={{ left: pct(playhead) }}/>
    </div>
  </div>;
}

function RangeRow({ label, value, max, onChange, onUsePlayhead, timeLabel }) {
  return <div className="vtrim-slider-row">
    <label>
      {label}
      <span><strong>{timeLabel}</strong><span>{formatVideoTime(value)}</span></span>
      <input type="range" min={0} max={max} step={0.05} value={value} onChange={event => onChange(Number(event.target.value))}/>
    </label>
    <button type="button" className="vtrim-set-btn" onClick={onUsePlayhead}>Use playhead</button>
  </div>;
}

export default function VideoTrimTool() {
  const videoRef = useRef(null);
  const previewUrlRef = useRef('');
  const [file, setFile] = useState(null);
  const [duration, setDuration] = useState(0);
  const [playhead, setPlayhead] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [middleCut, setMiddleCut] = useState(false);
  const [cutStart, setCutStart] = useState(0);
  const [cutEnd, setCutEnd] = useState(0);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    if (result?.url) URL.revokeObjectURL(result.url);
  }, [result?.url]);

  const regions = useMemo(
    () => buildKeepRegions({ duration, trimStart, trimEnd, middleCut, cutStart, cutEnd }),
    [duration, trimStart, trimEnd, middleCut, cutStart, cutEnd],
  );
  const kept = keptDuration(regions);

  const resetEditor = nextDuration => {
    setDuration(nextDuration);
    setPlayhead(0);
    setTrimStart(0);
    setTrimEnd(nextDuration);
    setMiddleCut(false);
    const middle = nextDuration / 2;
    setCutStart(Math.max(0, middle - 1));
    setCutEnd(Math.min(nextDuration, middle + 1));
  };

  const loadFile = nextFile => {
    setError('');
    setStatus('');
    setProgress(0);
    setResult(current => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
    if (!nextFile.type.startsWith('video/') && !/\.(mp4|webm|mov|mkv)$/i.test(nextFile.name)) {
      setError('Choose a video file such as MP4, WebM, or MOV.');
      return;
    }
    if (nextFile.size > MAX_VIDEO_TRIM_BYTES) {
      setError(`This file is too large for in-browser trimming (${formatBytes(nextFile.size)}). Try a clip under ${formatBytes(MAX_VIDEO_TRIM_BYTES)}.`);
      return;
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(nextFile);
    previewUrlRef.current = url;
    setFile(nextFile);
  };

  const onLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    resetEditor(video.duration);
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (video) setPlayhead(video.currentTime || 0);
  };

  const seekTo = time => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setPlayhead(time);
  };

  const usePlayheadFor = setter => {
    const time = videoRef.current?.currentTime ?? playhead;
    setter(Number(time.toFixed(2)));
  };

  const updateTrimStart = value => {
    const next = Math.min(value, trimEnd - 0.05);
    setTrimStart(next);
    if (cutStart < next) setCutStart(next);
    if (cutEnd <= next) setCutEnd(Math.min(trimEnd, next + 0.1));
  };

  const updateTrimEnd = value => {
    const next = Math.max(value, trimStart + 0.05);
    setTrimEnd(next);
    if (cutEnd > next) setCutEnd(next);
    if (cutStart >= next) setCutStart(Math.max(trimStart, next - 0.1));
  };

  const updateCutStart = value => {
    const next = Math.min(Math.max(value, trimStart), cutEnd - 0.05);
    setCutStart(next);
  };

  const updateCutEnd = value => {
    const next = Math.max(Math.min(value, trimEnd), cutStart + 0.05);
    setCutEnd(next);
  };

  const exportVideo = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError('');
    setStatus('Starting…');
    setProgress(0);
    setResult(current => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
    try {
      const blob = await exportTrimmedVideo({
        file,
        regions,
        onProgress: setProgress,
        onStatus: setStatus,
      });
      const url = URL.createObjectURL(blob);
      setResult({ url, size: blob.size, name: trimmedFileName(file.name) });
      setStatus('Trimmed video ready.');
    } catch (err) {
      setError(err.message || 'Could not trim this video. Try a shorter clip or a different format.');
      setStatus('');
    }
    setBusy(false);
  };

  const clearFile = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = '';
    setFile(null);
    setDuration(0);
    setError('');
    setStatus('');
    setProgress(0);
    setResult(current => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const download = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.url;
    link.download = result.name;
    link.click();
  };

  return <div className="vtrim-root">
    {!file ? <>
      <FileDrop
        accept={ACCEPT}
        onFiles={files => files[0] && loadFile(files[0])}
        title="Drop a video to trim"
        hint="MP4, WebM, or MOV · up to 120 MB · processed locally in your browser"
      />
      {error && <p className="pdf-error">{error}</p>}
    </> : (
      <div className="vtrim-editor">
        <div className="vtrim-meta">
          <div><strong>{file.name}</strong><span>{formatBytes(file.size)} · {formatVideoTime(duration)} total</span></div>
          <button type="button" className="button secondary compact" onClick={clearFile}>Choose another video</button>
        </div>

        <div className="vtrim-player-wrap">
          <video
            ref={videoRef}
            className="vtrim-player"
            src={previewUrlRef.current}
            controls
            playsInline
            onLoadedMetadata={onLoadedMetadata}
            onTimeUpdate={onTimeUpdate}
          />
        </div>

        {duration > 0 && <>
          <Timeline
            duration={duration}
            regions={regions}
            middleCut={middleCut}
            cutStart={cutStart}
            cutEnd={cutEnd}
            playhead={playhead}
          />

          <div className="vtrim-sliders">
            <RangeRow label="Start keep" value={trimStart} max={duration} onChange={updateTrimStart} onUsePlayhead={() => usePlayheadFor(updateTrimStart)} timeLabel="Keep from"/>
            <RangeRow label="End keep" value={trimEnd} max={duration} onChange={updateTrimEnd} onUsePlayhead={() => usePlayheadFor(updateTrimEnd)} timeLabel="Keep until"/>

            <label className="vtrim-middle-toggle">
              <input type="checkbox" checked={middleCut} onChange={event => setMiddleCut(event.target.checked)}/>
              Remove a middle section
            </label>

            {middleCut && <>
              <RangeRow label="Cut from" value={cutStart} max={duration} onChange={updateCutStart} onUsePlayhead={() => usePlayheadFor(updateCutStart)} timeLabel="Remove starts"/>
              <RangeRow label="Cut to" value={cutEnd} max={duration} onChange={updateCutEnd} onUsePlayhead={() => usePlayheadFor(updateCutEnd)} timeLabel="Remove until"/>
            </>}
          </div>

          <p className="vtrim-summary">
            Keeping <strong>{formatVideoTime(kept)}</strong>
            {regions.length > 1 ? ` in ${regions.length} parts` : ''}
            {middleCut ? ' · middle section removed' : ''}
            {' · '}playhead at <strong>{formatVideoTime(playhead)}</strong>
            {regions.length === 1 && <>{' '}<button type="button" className="vtrim-set-btn" style={{ marginLeft: 6 }} onClick={() => seekTo(trimStart)}>Jump to start</button></>}
          </p>
        </>}

        {error && <p className="pdf-error">{error}</p>}
        {status && !error && <p className="vtrim-summary">{status}</p>}

        <div className="vtrim-actions">
          {busy && <div className="vtrim-progress" aria-hidden="true"><span style={{ width: `${progress}%` }}/></div>}
          <button type="button" className="button primary" onClick={exportVideo} disabled={!duration || busy || kept < 0.1}>
            <ToolGlyph name="scissors" size={17}/>
            {busy ? `Trimming… ${progress}%` : 'Export trimmed video'}
          </button>
          {result && <button type="button" className="button secondary" onClick={download}>
            <Icon name="arrow" size={16}/>
            Download {result.name} ({formatBytes(result.size)})
          </button>}
        </div>
      </div>
    )}

    <p className="tool-footnote">
      Trimming runs locally with ffmpeg.wasm. The video engine downloads from a public CDN the first time you export — your file never leaves this device.
    </p>
  </div>;
}
