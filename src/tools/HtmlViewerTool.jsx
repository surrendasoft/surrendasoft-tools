import { useMemo, useState } from 'react';

export default function HtmlViewerTool() {
  const [html, setHtml] = useState(`<section class="card">
  <h1>Hello, SurrendaSoft!</h1>
  <p>Edit the HTML to see your preview update.</p>
  <button>Example button</button>
</section>
<style>
  body { font-family: system-ui; padding: 28px; background: #f4f8ff; }
  .card { padding: 24px; border-radius: 16px; background: white; box-shadow: 0 8px 30px #19305b18; }
  h1 { color: #101b50; }
  button { padding: 10px 14px; border: 0; border-radius: 8px; color: white; background: #0c174d; }
</style>`);
  const safeHtml = useMemo(() => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,iframe,object,embed,link,base,meta').forEach(node => node.remove());
    doc.querySelectorAll('*').forEach(node => {
      [...node.attributes].forEach(attribute => {
        const name = attribute.name.toLowerCase(), value = attribute.value.trim().toLowerCase();
        if (name.startsWith('on') || name === 'srcdoc' || ((name === 'src' || name === 'href') && !value.startsWith('data:image/')) || (name === 'style' && value.includes('url('))) node.removeAttribute(attribute.name);
      });
    });
    const policy = doc.createElement('meta');
    policy.setAttribute('http-equiv', 'Content-Security-Policy');
    policy.setAttribute('content', "default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; font-src data:");
    doc.head.prepend(policy);
    return '<!doctype html>' + doc.documentElement.outerHTML;
  }, [html]);
  return <><div className="html-toolbar"><span><i></i> Live preview</span><small>Scripts and external resources are blocked</small></div><div className="html-workbench"><label><span>HTML</span><textarea value={html} onChange={e => setHtml(e.target.value)} rows="18" spellCheck="false" aria-label="HTML source"/></label><div className="preview-pane"><span>PREVIEW</span><iframe title="Sandboxed HTML preview" sandbox="" referrerPolicy="no-referrer" srcDoc={safeHtml}/></div></div></>;
}
