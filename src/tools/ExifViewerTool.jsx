import { useState } from 'react';
import * as ExifReader from 'exifr';

const FIELD_LABELS = {
  Make: 'Camera make', Model: 'Camera model', LensModel: 'Lens',
  DateTimeOriginal: 'Date taken', CreateDate: 'Create date',
  ExposureTime: 'Exposure time', FNumber: 'Aperture',
  ISO: 'ISO', FocalLength: 'Focal length',
  FocalLengthIn35mmFormat: '35mm equiv.',
  Flash: 'Flash', WhiteBalance: 'White balance',
  ExposureProgram: 'Exposure program', MeteringMode: 'Metering',
  ExposureCompensation: 'Exposure comp.',
  ImageWidth: 'Image width', ImageHeight: 'Image height',
  Orientation: 'Orientation', Software: 'Software',
  GPSLatitude: 'GPS latitude', GPSLongitude: 'GPS longitude',
  GPSAltitude: 'GPS altitude', GPSLatitudeRef: 'Latitude ref',
  GPSLongitudeRef: 'Longitude ref',
};

function formatValue(key, val) {
  if (val === undefined || val === null) return '–';
  if (key === 'ExposureTime') {
    if (val < 1) return `1/${Math.round(1 / val)}s`;
    return `${val}s`;
  }
  if (key === 'FNumber') return `ƒ/${val}`;
  if (key === 'FocalLength' || key === 'FocalLengthIn35mmFormat') return `${val}mm`;
  if (key === 'GPSAltitude') return `${val.toFixed(1)}m`;
  if (key === 'GPSLatitude' || key === 'GPSLongitude') return typeof val === 'number' ? val.toFixed(6) + '°' : String(val);
  if (key === 'ExposureCompensation') return val >= 0 ? `+${val} EV` : `${val} EV`;
  if (val instanceof Date) return val.toLocaleString();
  if (typeof val === 'number') return String(val);
  return String(val);
}

export default function ExifViewerTool() {
  const [data, setData] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);

  const processFile = async file => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please drop an image file (JPEG, TIFF, HEIC, etc.).');
      return;
    }
    setLoading(true);
    setError('');
    setData(null);
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
    try {
      const exif = await ExifReader.parse(file, { tiff: true, exif: true, gps: true, iptc: false, xmp: false });
      if (!exif || Object.keys(exif).length === 0) {
        setError('No EXIF data found in this image. Many screenshots and web images have EXIF stripped.');
        setLoading(false);
        return;
      }
      // Filter to known fields only + preserve order
      const rows = Object.keys(FIELD_LABELS)
        .filter(k => exif[k] !== undefined)
        .map(k => ({ key: k, label: FIELD_LABELS[k], raw: exif[k] }));
      // Also include any GPS-related keys not in our known list
      const gpsKeys = Object.keys(exif).filter(k => k.startsWith('GPS') && !FIELD_LABELS[k]);
      gpsKeys.forEach(k => rows.push({ key: k, label: k, raw: exif[k] }));

      setData({ rows, hasGps: exif.GPSLatitude !== undefined });
    } catch (e) {
      setError(`Could not read EXIF: ${e.message}`);
    }
    setLoading(false);
  };

  const onDrop = e => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };
  const onPick = e => processFile(e.target.files[0]);

  const mapsUrl = data?.hasGps
    ? `https://www.google.com/maps/search/?api=1&query=${data.rows.find(r => r.key === 'GPSLatitude')?.raw},${data.rows.find(r => r.key === 'GPSLongitude')?.raw}`
    : null;

  return (
    <div className="exif-root">
      {!data && !loading && (
        <div
          className={`exif-drop${dragging ? ' dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <div className="exif-drop-icon">📷</div>
          <p>Drop a photo here to read its EXIF metadata</p>
          <small>Works with JPEG, TIFF, HEIC and other formats. Your photo never leaves your device.</small>
          <label className="button primary exif-pick-btn">
            Choose photo
            <input type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      {loading && <p className="exif-loading">Reading EXIF data…</p>}
      {error && <p className="pdf-error">{error}</p>}

      {(data || preview) && (
        <div className="exif-result">
          <div className="exif-result-head">
            {preview && <img src={preview} alt="Preview" className="exif-thumb" />}
            <div className="exif-result-meta">
              <strong className="exif-filename">{fileName}</strong>
              {data && <span className="exif-count">{data.rows.length} field{data.rows.length !== 1 ? 's' : ''} found</span>}
              {data?.hasGps && mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="exif-maps-link">
                  📍 View on Google Maps
                </a>
              )}
            </div>
            <label className="button secondary exif-change-btn">
              Change photo
              <input type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
            </label>
          </div>

          {data && data.rows.length > 0 && (
            <table className="exif-table">
              <tbody>
                {data.rows.map(({ key, label, raw }) => (
                  <tr key={key}>
                    <td className="exif-td-label">{label}</td>
                    <td className="exif-td-value">{formatValue(key, raw)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && data && data.rows.length === 0 && (
            <p className="exif-empty">No readable EXIF fields found in this image.</p>
          )}
        </div>
      )}

      {!data && !loading && !error && (
        <p className="exif-note">
          Photos taken on smartphones often embed GPS coordinates, camera model, and shooting settings — more data than you might expect.
        </p>
      )}
    </div>
  );
}
