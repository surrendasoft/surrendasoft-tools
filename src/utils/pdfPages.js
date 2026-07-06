export function createPageState(count) {
  return Array.from({ length: count }, (_, index) => ({ id: `${index}-${Date.now()}`, sourceIndex: index, rotation: 0 }));
}

export function rotatePageState(pages, id, direction = 1) {
  return pages.map(page => page.id === id ? { ...page, rotation: (page.rotation + direction * 90 + 360) % 360 } : page);
}

export function deletePageState(pages, id) {
  const next = pages.filter(page => page.id !== id);
  if (!next.length) throw new Error('Keep at least one page in the PDF.');
  return next;
}

export function movePageState(pages, id, direction) {
  const index = pages.findIndex(page => page.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= pages.length) return pages;
  const next = [...pages];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export async function buildPdfFromPages(sourceBytes, pages) {
  if (!pages.length) throw new Error('Add at least one page before downloading.');
  const { PDFDocument, degrees } = await import('pdf-lib');
  const source = await PDFDocument.load(sourceBytes);
  const output = await PDFDocument.create();
  for (const page of pages) {
    const [copied] = await output.copyPages(source, [page.sourceIndex]);
    if (page.rotation) copied.setRotation(degrees(page.rotation));
    output.addPage(copied);
  }
  return output.save();
}

export async function extractPdfPages(sourceBytes, pages, selectedIds) {
  const selected = pages.filter(page => selectedIds.has(page.id));
  if (!selected.length) throw new Error('Select at least one page to extract.');
  return buildPdfFromPages(sourceBytes, selected);
}
