import QRCode from 'qrcode';

// A QR rendered into a fixed pixel box gets denser (smaller modules) the more data it
// carries — fine for a short code, but a real WebRTC offer with several ICE candidates
// can end up with modules too small for a phone or webcam to resolve. Instead we size
// the canvas to the actual module count so each module stays a comfortable physical
// size on screen, regardless of payload length.
export const QR_TARGET_PX_PER_MODULE = 9;
export const QR_MIN_CANVAS_PX = 260;
// The real on-screen size is still governed by the container via CSS (max-width:100%),
// which tops out around ~750px in this app's widest layout — set the ceiling comfortably
// above that so CSS, not this cap, is what actually governs realistic dense payloads.
export const QR_MAX_CANVAS_PX = 900;
// Animated/chunked pairing QRs always carry a short payload — keep them a comfortable
// on-screen size on phones and laptops instead of growing with dynamic sizing.
export const QR_CHUNK_DISPLAY_PX = 280;
const QR_MARGIN_MODULES = 2;

export function computeQrCanvasSize(text, errorCorrectionLevel) {
  try {
    const qr = QRCode.create(String(text || ''), { errorCorrectionLevel });
    const totalModules = qr.modules.size + QR_MARGIN_MODULES * 2;
    const ideal = totalModules * QR_TARGET_PX_PER_MODULE;
    return Math.min(QR_MAX_CANVAS_PX, Math.max(QR_MIN_CANVAS_PX, ideal));
  } catch {
    return QR_MIN_CANVAS_PX;
  }
}
