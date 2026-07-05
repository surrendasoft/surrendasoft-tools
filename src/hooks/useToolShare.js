import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QR_URL_SAFE_LIMIT } from '../utils/binaryTransfer.js';
import { buildToolShareUrl, readToolShareFromHash, resetToolHash } from '../utils/toolShare.js';

export function useToolShare({
  toolId,
  getPayload,
  onLoad,
  canShare = true,
  confirmOnReplace = false,
  invalidateDeps = [],
}) {
  const [loadedFromShare, setLoadedFromShare] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const shareCanvasRef = useRef(null);
  const mounted = useRef(false);
  const [shareChecked, setShareChecked] = useState(false);

  const consumeShareHash = useCallback(async (hash, { confirmReplace = false } = {}) => {
    const shared = await readToolShareFromHash(toolId, hash);
    if (!shared) return false;
    if (confirmReplace) {
      const needsConfirm = typeof confirmOnReplace === 'function' ? confirmOnReplace() : confirmOnReplace;
      if (needsConfirm && !window.confirm('Load the data from this link? This will replace what you have here.')) {
        resetToolHash(toolId);
        return false;
      }
    }
    onLoad(shared);
    setLoadedFromShare(true);
    resetToolHash(toolId);
    return true;
  }, [toolId, onLoad, confirmOnReplace]);

  useEffect(() => {
    (async () => {
      await consumeShareHash(window.location.hash);
      mounted.current = true;
      setShareChecked(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onHash = () => { if (mounted.current) consumeShareHash(window.location.hash, { confirmReplace: true }); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [consumeShareHash]);

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
      setShareUrl(await buildToolShareUrl(toolId, getPayload()));
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
    loadedFromShare,
    shareChecked,
    dismissLoadedBanner: () => setLoadedFromShare(false),
    sharePanelProps: {
      canShare,
      shareUrl,
      shareBusy,
      shareError,
      shareCopied,
      shareCanvasRef,
      qrEligible,
      createShareLink,
      copyShareLink,
    },
  };
}
