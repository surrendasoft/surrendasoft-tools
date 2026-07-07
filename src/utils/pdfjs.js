export async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const isTestEnv = typeof process !== 'undefined' && !!process.env.VITEST;
  pdfjs.GlobalWorkerOptions.workerSrc = isTestEnv
    ? 'pdfjs-dist/legacy/build/pdf.worker.min.mjs'
    : (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
  return pdfjs;
}

export async function openPdfDocument(data) {
  const pdfjs = await loadPdfJs();
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  return { pdfjs, doc };
}
