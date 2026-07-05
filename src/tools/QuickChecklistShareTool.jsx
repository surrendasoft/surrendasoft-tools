import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import ToolGlyph from '../components/ToolGlyph.jsx';
import ToolSharePanel, { ToolShareBanner } from '../components/ToolSharePanel.jsx';
import { useEncodedLinkSize } from '../hooks/useEncodedLinkSize.js';
import { useShareUrl } from '../hooks/useShareUrl.js';
import { QR_URL_SAFE_LIMIT } from '../utils/binaryTransfer.js';
import {
  blankChecklist, CHECKLIST_LINK_HARD, CHECKLIST_LINK_WARNING, CHECKLIST_QR_HARD,
  checklistFilename, checklistItemsForShare, checklistToText, createChecklistSnapshot,
  getChecklistShareUrl, makeChecklistItem, MAX_CHECKLIST_ITEMS, MAX_CHECKLIST_TEXT,
  MAX_CHECKLIST_TITLE, QUICK_CHECKLIST_TOOL_ID, readChecklistShare,
} from '../utils/quickChecklist.js';
import { downloadText } from '../utils/quickForm.js';
import { resetToolHash, shareRoutePattern } from '../utils/toolShare.js';
import './QuickChecklistShareTool.css';

const STORAGE_KEY = 'surrendasoft-quick-checklist-draft-v1';

export default function QuickChecklistShareTool() {
  const [checklist, setChecklist] = useState(blankChecklist);
  const [routeReady, setRouteReady] = useState(false);
  const [loadedFromLink, setLoadedFromLink] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [actionError, setActionError] = useState('');
  const [copiedText, setCopiedText] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [editRevision, setEditRevision] = useState(0);
  const sharePayloadRef = useRef(null);
  const clearShareRef = useRef(() => {});

  const loadFromHash = useCallback(async hash => {
    const isChecklistLink = shareRoutePattern(QUICK_CHECKLIST_TOOL_ID).test(hash);
    if (!isChecklistLink) return false;
    const shared = await readChecklistShare(hash);
    if (!shared) {
      setRouteError('This checklist link could not be read. You can start a new checklist below.');
      resetToolHash(QUICK_CHECKLIST_TOOL_ID);
      return false;
    }
    sharePayloadRef.current = null;
    clearShareRef.current();
    setChecklist(shared);
    setEditRevision(value => value + 1);
    setLoadedFromLink(true);
    setRouteError('');
    resetToolHash(QUICK_CHECKLIST_TOOL_ID);
    return true;
  }, []);

  useEffect(() => {
    (async () => { await loadFromHash(window.location.hash); setRouteReady(true); })();
  }, [loadFromHash]);

  useEffect(() => {
    const onHash = () => { if (routeReady) loadFromHash(window.location.hash); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [loadFromHash, routeReady]);

  const nonEmptyItems = useMemo(() => checklistItemsForShare(checklist.items), [checklist.items]);
  const completed = nonEmptyItems.filter(item => item.done).length;
  const prospectivePayload = useMemo(() => ({ ...checklist, type: 'checklist', v: 1, updatedAt: checklist.updatedAt || new Date().toISOString(), version: Math.max(1, checklist.version + 1), items: nonEmptyItems }), [checklist, nonEmptyItems]);

  const share = useShareUrl({
    getUrl: () => getChecklistShareUrl(sharePayloadRef.current || prospectivePayload),
    canShare: nonEmptyItems.length > 0,
    invalidateDeps: [editRevision],
  });
  clearShareRef.current = share.clearShareLink;
  const linkSize = useEncodedLinkSize(() => getChecklistShareUrl(prospectivePayload), [prospectivePayload], { enabled: nonEmptyItems.length > 0 });

  const edit = updater => {
    setChecklist(current => typeof updater === 'function' ? updater(current) : updater);
    setEditRevision(value => value + 1);
    setActionError('');
    setSavedMessage('');
  };
  const updateItem = (id, patch) => edit(current => ({ ...current, items: current.items.map(item => item.id === id ? { ...item, ...patch } : item) }));
  const moveItem = (index, direction) => edit(current => {
    const items = [...current.items], target = index + direction;
    if (target < 0 || target >= items.length) return current;
    [items[index], items[target]] = [items[target], items[index]];
    return { ...current, items };
  });

  const shareLatest = async () => {
    try {
      const snapshot = createChecklistSnapshot(checklist);
      const url = await getChecklistShareUrl(snapshot);
      if (url.length > CHECKLIST_LINK_HARD) throw new Error('This checklist is too large to share reliably. Shorten some items.');
      sharePayloadRef.current = snapshot;
      setChecklist(snapshot);
      setActionError('');
      await share.createShareLink();
    } catch (error) { setActionError(error.message); }
  };

  const copyPlainText = async () => {
    if (!nonEmptyItems.length) { setActionError('Add at least one checklist item.'); return; }
    await navigator.clipboard.writeText(checklistToText(checklist));
    setCopiedText(true); window.setTimeout(() => setCopiedText(false), 1500);
  };
  const downloadTxt = () => {
    if (!nonEmptyItems.length) { setActionError('Add at least one checklist item.'); return; }
    downloadText(checklistFilename(checklist.title), checklistToText(checklist));
  };
  const clear = () => { edit(blankChecklist()); setLoadedFromLink(false); setRouteError(''); resetToolHash(QUICK_CHECKLIST_TOOL_ID); };
  const saveDraft = () => { localStorage.setItem(STORAGE_KEY, JSON.stringify(checklist)); setSavedMessage('Draft saved on this device only.'); };
  const loadDraft = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const items = Array.isArray(raw?.items) ? raw.items.slice(0, MAX_CHECKLIST_ITEMS).map(item => ({ id: String(item.id || makeChecklistItem().id).slice(0, 40), text: String(item.text || '').slice(0, MAX_CHECKLIST_TEXT), done: Boolean(item.done) })) : [];
      if (!raw || !items.length) throw new Error();
      edit({ ...blankChecklist(), ...raw, title: String(raw.title || '').slice(0, MAX_CHECKLIST_TITLE), updatedBy: String(raw.updatedBy || '').slice(0, MAX_CHECKLIST_TITLE), items });
      setSavedMessage('Local draft loaded.');
    } catch { setSavedMessage('No saved checklist was found on this device.'); }
  };
  const clearDraft = () => { localStorage.removeItem(STORAGE_KEY); setSavedMessage('Saved local draft cleared.'); };

  if (!routeReady) return <p className="qcs-loading" role="status">Loading checklist…</p>;
  const updatedLabel = checklist.updatedAt ? new Date(checklist.updatedAt).toLocaleString('en-AU', { weekday: 'long', hour: 'numeric', minute: '2-digit' }) : 'Not shared yet';

  return <div className="qcs-root">
    <ToolShareBanner show={loadedFromLink} onDismiss={() => setLoadedFromLink(false)} message="Loaded a checklist snapshot from a shared link."/>
    {routeError && <div className="qcs-route-error" role="alert"><ToolGlyph name="warning" size={18}/><span>{routeError}</span></div>}
    <div className="qcs-expectation"><ToolGlyph name="link" size={21}/><div><strong>This is a link-based checklist. It is not live syncing.</strong><span>The latest version is the latest link someone sends you.</span></div></div>

    <section className="qcs-editor">
      <header><div><span className="qcs-step">1</span><div><h3>Build and update the checklist</h3><p>Edit items and tick off completed work.</p></div></div><span className="qcs-count">{checklist.items.length}/{MAX_CHECKLIST_ITEMS} items</span></header>
      <div className="qcs-top-fields"><label>Checklist title <span>Recommended</span><input maxLength={MAX_CHECKLIST_TITLE} value={checklist.title} onChange={event => edit(current => ({ ...current, title: event.target.value }))} placeholder="Event Setup Checklist"/><small>{checklist.title.length}/{MAX_CHECKLIST_TITLE}</small></label><label>Updated by / name <span>Optional</span><input maxLength={MAX_CHECKLIST_TITLE} value={checklist.updatedBy} onChange={event => edit(current => ({ ...current, updatedBy: event.target.value }))} placeholder="Laurence"/></label></div>
      <div className="qcs-items">{checklist.items.map((item, index) => <article className={`qcs-item${item.done ? ' done' : ''}`} key={item.id}><label className="qcs-check"><input type="checkbox" checked={item.done} onChange={event => updateItem(item.id, { done: event.target.checked })}/><span aria-hidden="true"><ToolGlyph name="check" size={15}/></span><span className="sr-only">Mark item {index + 1} complete</span></label><label className="qcs-item-text"><span className="sr-only">Checklist item {index + 1}</span><input aria-label={`Checklist item ${index + 1}`} maxLength={MAX_CHECKLIST_TEXT} value={item.text} onChange={event => updateItem(item.id, { text: event.target.value })} placeholder={`Checklist item ${index + 1}`}/><small>{item.text.length}/{MAX_CHECKLIST_TEXT}</small></label><div className="qcs-item-actions"><button disabled={index === 0} onClick={() => moveItem(index, -1)} aria-label={`Move item ${index + 1} up`}><ToolGlyph name="chevronUp" size={15}/></button><button disabled={index === checklist.items.length - 1} onClick={() => moveItem(index, 1)} aria-label={`Move item ${index + 1} down`}><ToolGlyph name="chevronDown" size={15}/></button><button className="remove" onClick={() => edit(current => ({ ...current, items: current.items.filter(row => row.id !== item.id) }))} aria-label={`Delete item ${index + 1}`}><ToolGlyph name="trash" size={15}/></button></div></article>)}</div>
      <div className="qcs-item-footer"><button className="button secondary compact" disabled={checklist.items.length >= MAX_CHECKLIST_ITEMS} onClick={() => edit(current => ({ ...current, items: [...current.items, makeChecklistItem()] }))}><ToolGlyph name="plus" size={15}/> Add item</button><button className="button secondary compact" disabled={!checklist.items.some(item => item.done)} onClick={() => edit(current => ({ ...current, items: current.items.filter(item => !item.done) }))}>Clear completed</button></div>
    </section>

    <section className="qcs-working" aria-label="Checklist working view">
      <header><div><span className="qcs-step">2</span><div><h3>{checklist.title.trim() || 'Untitled checklist'}</h3><p>{completed} of {nonEmptyItems.length} complete</p></div></div><div className="qcs-progress-ring" style={{ '--progress': nonEmptyItems.length ? `${Math.round(completed / nonEmptyItems.length * 100)}%` : '0%' }}><strong>{nonEmptyItems.length ? Math.round(completed / nonEmptyItems.length * 100) : 0}%</strong></div></header>
      <div className="qcs-progress"><span style={{ width: nonEmptyItems.length ? `${completed / nonEmptyItems.length * 100}%` : 0 }}/></div>
      {nonEmptyItems.length ? <ul>{nonEmptyItems.map((item, index) => <li className={item.done ? 'done' : ''} key={item.id}><button onClick={() => updateItem(item.id, { done: !item.done })} aria-label={`${item.done ? 'Untick' : 'Tick'} ${item.text}`}><ToolGlyph name={item.done ? 'checkSquare' : 'square'} size={19}/></button><span>{item.text}</span><small>{index + 1}</small></li>)}</ul> : <p className="qcs-empty">Add at least one checklist item to create a shareable snapshot.</p>}
      <dl className="qcs-meta"><div><dt>Last updated</dt><dd>{updatedLabel}</dd></div><div><dt>Version</dt><dd>{checklist.version || 0}</dd></div>{checklist.updatedBy && <div><dt>Updated by</dt><dd>{checklist.updatedBy}</dd></div>}</dl>
    </section>

    <section className="qcs-share-section">
      <div className="qcs-share-head"><span className="qcs-step">3</span><div><h3>Share this checklist snapshot</h3><p>Each shared link contains a snapshot of the checklist at that time.</p></div></div>
      <LinkSizeStatus length={linkSize.length} busy={linkSize.busy}/>
      {actionError && <p className="qcs-error" role="alert">{actionError}</p>}
      <ToolSharePanel {...share} createShareLink={shareLatest} canShare={nonEmptyItems.length > 0 && linkSize.length <= CHECKLIST_LINK_HARD} createLabel={checklist.version ? 'Share updated checklist' : 'Generate checklist link'} copyLabel="Copy latest link" footnote="Each link contains the title, items, ticked state, version, and update metadata. Nothing is stored on a server." qrHint="Scan to open this checklist snapshot"/>
      <div className="qcs-extra-actions"><button className="button secondary compact" onClick={copyPlainText}><Icon name={copiedText ? 'check' : 'copy'} size={15}/>{copiedText ? 'Copied checklist' : 'Copy as plain text'}</button><button className="button secondary compact" onClick={downloadTxt}><ToolGlyph name="download" size={15}/> Download TXT</button><button className="button secondary compact" onClick={clear}>Clear form</button></div>
    </section>

    <section className="qcs-local"><div><strong>Optional local draft</strong><span>Saved on this device only.</span></div><div><button className="button secondary compact" onClick={saveDraft}>Save draft</button><button className="button secondary compact" onClick={loadDraft}>Load recent</button><button className="button secondary compact" onClick={clearDraft}>Clear local</button></div>{savedMessage && <p role="status">{savedMessage}</p>}</section>
    <div className="qcs-notes"><p><Icon name="shield" size={17}/><span><strong>Privacy:</strong> Checklist data is stored inside the link and processed in your browser. Nothing is uploaded or stored by SurrendaSoft.</span></p><p><ToolGlyph name="warning" size={17}/><span><strong>Safety:</strong> Anyone with the link can view the checklist. Do not use this for passwords, banking details, private codes, medical information, or sensitive personal data.</span></p></div>
  </div>;
}

function LinkSizeStatus({ length, busy }) {
  if (busy && !length) return <p className="qcs-size neutral">Estimating share-link size…</p>;
  if (!length) return null;
  if (length > CHECKLIST_LINK_HARD) return <p className="qcs-size danger">This checklist is too large to share reliably. Shorten some items.</p>;
  if (length > CHECKLIST_QR_HARD) return <p className="qcs-size danger">This checklist is too large for reliable QR sharing. Shorten the list or copy the link instead.</p>;
  if (length > CHECKLIST_LINK_WARNING) return <p className="qcs-size warning">This checklist is getting large. Long links and QR codes may be harder to share reliably.</p>;
  if (length > QR_URL_SAFE_LIMIT) return <p className="qcs-size warning">This checklist link is ready, but the QR would be too dense. Use Copy latest link instead.</p>;
  return <p className="qcs-size good"><Icon name="check" size={15}/> Share size looks good · {length.toLocaleString()} characters</p>;
}
