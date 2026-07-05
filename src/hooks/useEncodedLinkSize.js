import { useEffect, useRef, useState } from 'react';
import { QR_URL_SAFE_LIMIT } from '../utils/binaryTransfer.js';

// Debounced, live estimate of how long the eventual share link will be — so a tool can
// warn users about the QR-code ceiling *while they're building*, not just after they
// click "generate link" and find out the hard way.
export function useEncodedLinkSize(buildUrl, deps, { enabled = true, delay = 250 } = {}) {
  const [length, setLength] = useState(0);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!enabled) { setLength(0); setBusy(false); return undefined; }
    const id = ++requestId.current;
    setBusy(true);
    const timer = window.setTimeout(() => {
      buildUrl().then(url => {
        if (requestId.current === id) { setLength(url.length); setBusy(false); }
      }).catch(() => {
        if (requestId.current === id) { setLength(0); setBusy(false); }
      });
    }, delay);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { length, busy, qrEligible: length > 0 && length <= QR_URL_SAFE_LIMIT };
}
