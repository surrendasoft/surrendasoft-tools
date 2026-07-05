import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QR_URL_SAFE_LIMIT } from '../utils/binaryTransfer.js';

// Builds a copyable link + optional QR for any async URL factory — no hash loading.
export function useShareUrl({ getUrl, canShare = true, invalidateDeps = [] }) {
  const [shareUrl, setShareUrl] = useState('');
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const shareCanvasRef = useRef(null);

  useEffect(() => {
    setShareUrl('');
    setShareCopied(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, invalidateDeps);

  const createShareLink = async () => {
    if (!canShare) return;
    setShareBusy(true);
    setShareError('');
    try {
      setShareUrl(await getUrl());
    } catch {
      setShareError('Could not build a share link.');
    }
    setShareBusy(false);
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard?.writeText(shareUrl);
    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 1600);
  };

  const clearShareLink = () => {
    setShareUrl('');
    setShareError('');
    setShareCopied(false);
  };

  const qrEligible = shareUrl.length > 0 && shareUrl.length <= QR_URL_SAFE_LIMIT;

  useEffect(() => {
    if (!qrEligible || !shareCanvasRef.current) return;
    QRCode.toCanvas(shareCanvasRef.current, shareUrl, {
      width: 200, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#10183e', light: '#ffffff' },
    }, err => {
      if (err) setShareError('This did not fit into a reliable QR code — use Copy link instead.');
    });
  }, [qrEligible, shareUrl]);

  return {
    shareUrl,
    shareBusy,
    shareError,
    shareCopied,
    shareCanvasRef,
    qrEligible,
    createShareLink,
    copyShareLink,
    clearShareLink,
  };
}
