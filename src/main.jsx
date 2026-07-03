import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const tools = [
  { id: 'emoji', icon: '😁', name: 'Emoji Copy', description: 'Search, copy, and paste emojis quickly for messages, social posts, emails, and captions.', tint: 'yellow', status: 'Available', categories: ['Free'] },
  { id: 'dates', icon: '17', name: 'Date Range Calculator', description: 'Calculate days, weeks, business days, deadlines, and time between dates.', tint: 'blue', status: 'Available', categories: ['Free', 'Business'] },
  { id: 'gst', icon: '%', name: 'GST Calculator', description: 'Add or remove GST quickly for Australian invoices, quotes, and basic pricing checks.', tint: 'mint', status: 'Available', categories: ['Free', 'Business'] },
  { id: 'cleaner', icon: 'Aa', name: 'Text Cleaner', description: 'Remove extra spaces and line breaks, then tidy pasted text in one click.', tint: 'purple', status: 'Available', categories: ['Free', 'Business'] },
  { id: 'oneline', icon: '→', name: 'Text to One Line', description: 'Remove line breaks and turn multi-line text into one clean, copy-ready line.', tint: 'mint', status: 'Available', categories: ['Free', 'Business'] },
  { id: 'invoice', icon: 'AI', name: 'Invoice Description Generator', description: 'Turn rough job notes into a polished, client-ready invoice description.', tint: 'mint', status: 'Local AI concept', categories: ['Free', 'Business', 'Local AI', 'Uses Credits'] },
  { id: 'case', icon: 'Aa', name: 'Case Converter', description: 'Convert text to uppercase, lowercase, title case, sentence case, and clean headings.', tint: 'purple', status: 'Available', categories: ['Free', 'Business'] },
  { id: 'counter', icon: 'W', name: 'Word Counter', description: 'Count words, characters, sentences, paragraphs, and estimate reading time.', tint: 'blue', status: 'Available', categories: ['Free', 'Business'] },
  { id: 'shrinker', icon: '🖼️', name: 'Image Shrinker', description: 'Reduce image file size for emails, uploads, invoice logos, websites, and forms.', tint: 'yellow', status: 'Available', categories: ['Free', 'Files & PDF'] },
  { id: 'html', icon: '</>', name: 'HTML Viewer', description: 'Paste HTML and preview it safely in a sandboxed viewer for quick checks.', tint: 'blue', status: 'Available', tags: ['Free', 'Browser-based', 'Sandboxed'], categories: ['Free', 'Developer'] },
  { id: 'json', icon: '{}', name: 'JSON Formatter', description: 'Format, validate, and inspect JSON for APIs, web apps, and debugging.', tint: 'purple', status: 'Available', categories: ['Free', 'Developer'] },
  { id: 'imagepdf', icon: 'IMG', name: 'Image to PDF', description: 'Turn one or more JPG or PNG images into a clean, downloadable PDF.', tint: 'yellow', status: 'Available', categories: ['Free', 'Files & PDF'] },
  { id: 'pdfimage', icon: 'PDF', name: 'PDF to Image', description: 'Convert each page of a PDF into a high-quality PNG image in your browser.', tint: 'blue', status: 'Available', categories: ['Free', 'Files & PDF'] },
  { id: 'combinepdf', icon: 'PDF+', name: 'Combine PDFs', description: 'Merge multiple PDF files into one document in the order you choose.', tint: 'mint', status: 'Available', categories: ['Free', 'Files & PDF'] },
];

const directoryFilters = ['All', 'Free', 'Business', 'Files & PDF', 'Developer', 'Local AI', 'Uses Credits'];

const emojis = [
  ['Smileys', '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😍','🥰','😎','🤓','🤩','🥳','😴','🤔','🫡','🤗','🙌'],
  ['People', '👋','👍','👎','👏','🙏','💪','🤝','✍️','👀','🧠','💡','❤️','🔥','✨','✅','🎉','🚀','💯','📌','📣'],
  ['Work', '💼','📅','📊','📈','🧾','💻','📱','⚙️','🔧','🛠️','📧','📝','🔒','🗂️','⏰','💰','🏆','🎯','📦','🌏'],
];

function Icon({ name, size = 20 }) {
  const paths = {
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    back: <><path d="m15 18-6-6 6-6"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    spark: <><path d="m12 3-1.2 4.2L7 9l3.8 1.8L12 15l1.2-4.2L17 9l-3.8-1.8L12 3Z"/><path d="m5 15-.6 2.1L2.5 18l1.9.9L5 21l.6-2.1 1.9-.9-1.9-.9L5 15Z"/></>,
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Logo({ onClick }) {
  return <button className="logo" onClick={onClick} aria-label="SurrendaSoft Tools home">
    <span className="logo-mark">S</span><span>SurrendaSoft</span><span className="logo-tools">Tools</span>
  </button>;
}

function App() {
  const [activeTool, setActiveTool] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const openTool = id => { setActiveTool(id); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goHome = () => { setActiveTool(null); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return <div className="app-shell">
    <header>
      <div className="nav wrap">
        <Logo onClick={goHome} />
        <nav className="desktop-nav" aria-label="Main navigation">
          <button onClick={goHome}>All tools</button>
          <a href="#how-it-works" onClick={() => setActiveTool(null)}>How it works</a>
          <a className="nav-cta" href="mailto:hello@surrendasoft.com">Build with us <Icon name="arrow" size={16}/></a>
        </nav>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu"><Icon name={menuOpen ? 'close' : 'menu'} size={27}/></button>
      </div>
      {menuOpen && <nav className="mobile-nav">
        <button onClick={goHome}>All tools</button>
        <button onClick={() => { goHome(); setTimeout(() => document.querySelector('#how-it-works')?.scrollIntoView({behavior:'smooth'}), 20); }}>How it works</button>
        <a href="mailto:hello@surrendasoft.com">Build custom software <Icon name="arrow" size={16}/></a>
      </nav>}
    </header>

    <main>{activeTool ? <ToolPage id={activeTool} onBack={goHome}/> : <Home onOpen={openTool}/>}</main>

    <footer>
      <div className="wrap footer-inner">
        <div><Logo onClick={goHome}/><p>Useful tools. Less busywork.</p></div>
        <div className="footer-links"><button onClick={goHome}>All tools</button><a href="mailto:hello@surrendasoft.com">Work with SurrendaSoft</a></div>
        <small>© 2026 SurrendaSoft</small>
      </div>
    </footer>
  </div>;
}

function Home({ onOpen }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const visibleTools = useMemo(() => {
    const search = query.trim().toLowerCase();
    return tools.filter(tool => {
      const matchesFilter = filter === 'All' || tool.categories.includes(filter);
      const searchable = `${tool.name} ${tool.description} ${tool.categories.join(' ')} ${tool.status}`.toLowerCase();
      return matchesFilter && (!search || searchable.includes(search));
    });
  }, [query, filter]);
  return <>
    <section className="hero">
      <div className="hero-orb orb-one"/><div className="hero-orb orb-two"/>
      <div className="wrap hero-inner">
        <div className="eyebrow"><span>✦</span> SurrendaSoft Tools <b>Beta</b></div>
        <h1>Small tools.<br/><span>Big time savers.</span></h1>
        <p className="hero-copy">Free, privacy-conscious utilities for everyday work. No sign-up, no clutter—just open a tool and get it done.</p>
        <div className="hero-actions"><button className="button primary" onClick={() => document.querySelector('#tools')?.scrollIntoView({behavior:'smooth'})}>Browse tools <Icon name="arrow"/></button><a className="button secondary" href="#how-it-works"><Icon name="shield"/> Why local-first?</a></div>
        <div className="trust-row"><span><i>✓</i> Free to use</span><span><i>✓</i> No login</span><span><i>✓</i> Runs in your browser</span></div>
      </div>
    </section>

    <section className="tools-section wrap" id="tools">
      <div className="directory-controls"><label className="directory-search"><Icon name="search"/><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tools, e.g. PDF, invoice, emoji, AI…" aria-label="Search tools"/>{query && <button onClick={() => setQuery('')} aria-label="Clear search"><Icon name="close" size={16}/></button>}</label><div className="filter-chips" role="group" aria-label="Filter tools by category">{directoryFilters.map(item => <button key={item} className={filter === item ? 'active' : ''} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
      <div className="section-heading directory-heading"><div><span className="kicker">TOOL DIRECTORY</span><h2>{filter === 'All' ? 'What do you need to do?' : filter}</h2></div><p>{visibleTools.length} {visibleTools.length === 1 ? 'tool' : 'tools'} · simple jobs that shouldn’t take all day.</p></div>
      {visibleTools.length ? <div className="tool-grid">{visibleTools.map(tool => <ToolCard key={tool.id} tool={tool} onOpen={onOpen}/>)}</div> : <div className="no-results"><span>⌕</span><h3>No tools found</h3><p>Try another search or category.</p><button onClick={() => { setQuery(''); setFilter('All'); }}>Show all tools</button></div>}
      <div className="more-tools"><span>More tools are on the way</span><p>PDF Compressor, Split PDF, Invoice Builder and more.</p></div>
    </section>

    <section className="principles" id="how-it-works">
      <div className="wrap principles-grid">
        <div><span className="kicker">HOW IT WORKS</span><h2>Start simple.<br/>Scale when needed.</h2><p>Every tool has a job to do. We use the lightest technology that gets it done properly.</p></div>
        <div className="steps">
          <Step number="01" title="Free browser tools" copy="Fast utilities that work instantly, with no account needed." />
          <Step number="02" title="Local AI helpers" copy="Where possible, smart features run on your device to keep data private." />
          <Step number="03" title="Advanced AI credits" copy="For harder work, opt into more powerful cloud reasoning when you choose." />
          <Step number="04" title="Custom software" copy="Need something purpose-built? That’s exactly what SurrendaSoft does." />
        </div>
      </div>
    </section>

    <section className="cta-section wrap"><div><span className="eyebrow dark">BUILT BY SURRENDASOFT</span><h2>Need a tool that fits<br/>your business?</h2><p>We build practical custom software for real workflows—not software for software’s sake.</p><a className="button light" href="mailto:hello@surrendasoft.com">Tell us what you need <Icon name="arrow"/></a></div><div className="cta-art"><span>⚙</span><i>✦</i><b>✓</b></div></section>
  </>;
}

function ToolCard({ tool, onOpen }) {
  return <article className="tool-card" onClick={() => onOpen(tool.id)}>
    <div className={`tool-icon ${tool.tint}`}>{tool.icon}</div>
    <div className="card-body"><div className="status"><span></span>{tool.status}</div><h3>{tool.name}</h3><p>{tool.description}</p></div>
    <button className="card-arrow" aria-label={`Open ${tool.name}`}><Icon name="arrow"/></button>
    <div className="card-tags">{(tool.tags || ['Free', 'Browser-based', 'No login']).map(tag => <span key={tag}>{tag}</span>)}</div>
  </article>;
}

function Step({ number, title, copy }) {
  return <div className="step"><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></div>;
}

function ToolPage({ id, onBack }) {
  const tool = tools.find(t => t.id === id);
  return <>
    <section className="tool-hero"><div className="wrap narrow">
      <button className="back-link" onClick={onBack}><Icon name="back" size={18}/> All tools</button>
      <div className={`tool-icon large ${tool.tint}`}>{tool.icon}</div><span className="tool-label">FREE · BROWSER-BASED</span><h1>{tool.name}</h1><p>{tool.description}</p>
    </div></section>
    <section className="workspace-wrap wrap narrow"><div className="workspace">
      {id === 'emoji' && <EmojiTool/>}{id === 'dates' && <DateTool/>}{id === 'gst' && <GstTool/>}{id === 'cleaner' && <CleanerTool/>}{id === 'oneline' && <OneLineTool/>}{id === 'invoice' && <InvoiceTool/>}{id === 'case' && <CaseTool/>}{id === 'counter' && <WordCounterTool/>}{id === 'shrinker' && <ImageShrinkerTool/>}{id === 'html' && <HtmlViewerTool/>}{id === 'json' && <JsonFormatterTool/>}{id === 'imagepdf' && <ImageToPdfTool/>}{id === 'pdfimage' && <PdfToImageTool/>}{id === 'combinepdf' && <CombinePdfTool/>}
    </div><div className="privacy-note"><Icon name="shield"/><div><strong>Your data stays with you</strong><p>This tool runs in your browser. Nothing you enter is uploaded or stored.</p></div></div></section>
  </>;
}

function EmojiTool() {
  const [query, setQuery] = useState(''); const [copied, setCopied] = useState('');
  const filtered = useMemo(() => emojis.map(([cat,...items]) => [cat, ...items.filter(e => !query || cat.toLowerCase().includes(query.toLowerCase()) || e.includes(query))]).filter(x => x.length > 1), [query]);
  const copy = async e => { try { await navigator.clipboard.writeText(e); } catch { /* preview environments may block clipboard */ } setCopied(e); setTimeout(() => setCopied(''), 1400); };
  return <><label className="search-box"><Icon name="search"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search emoji categories…"/></label>{copied && <div className="toast"><Icon name="check" size={16}/> {copied} copied</div>}<div className="emoji-groups">{filtered.map(([cat,...items]) => <div key={cat}><h3>{cat}</h3><div className="emoji-grid">{items.map((e,i)=><button key={i} onClick={()=>copy(e)} title={`Copy ${e}`}>{e}</button>)}</div></div>)}</div></>;
}

function DateTool() {
  const today = new Date().toISOString().slice(0,10); const later = new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  const [start,setStart]=useState(today), [end,setEnd]=useState(later);
  const result = useMemo(() => { const a=new Date(start+'T00:00:00'), b=new Date(end+'T00:00:00'); if (!start||!end||isNaN(a)||isNaN(b)) return null; const days=Math.round((b-a)/86400000); let business=0, d=new Date(a), dir=days>=0?1:-1; for(let i=0;i<Math.abs(days);i++){d.setDate(d.getDate()+dir); if(d.getDay()!==0&&d.getDay()!==6)business+=dir;} return {days,weeks:(days/7).toFixed(1),business}; },[start,end]);
  return <><div className="field-row"><label>Start date<input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>End date<input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label></div>{result && <div className="result-grid"><div><strong>{Math.abs(result.days)}</strong><span>calendar days</span></div><div><strong>{Math.abs(result.business)}</strong><span>business days</span></div><div><strong>{Math.abs(result.weeks)}</strong><span>weeks</span></div></div>}<p className="result-caption">{result?.days === 0 ? 'These dates are the same day.' : `${Math.abs(result?.days || 0)} days ${result?.days < 0 ? 'before' : 'after'} the start date.`}</p></>;
}

function GstTool() {
  const [mode, setMode] = useState('add');
  const [amount, setAmount] = useState('1000');
  const numericAmount = Math.max(0, Number(amount) || 0);
  const values = useMemo(() => {
    if (mode === 'add') return { ex: numericAmount, gst: numericAmount * 0.1, inc: numericAmount * 1.1 };
    return { ex: numericAmount / 1.1, gst: numericAmount - numericAmount / 1.1, inc: numericAmount };
  }, [mode, numericAmount]);
  const money = value => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
  return <><div className="gst-mode" role="group" aria-label="GST calculation mode"><button className={mode === 'add' ? 'active' : ''} onClick={() => setMode('add')}>Add GST</button><button className={mode === 'remove' ? 'active' : ''} onClick={() => setMode('remove')}>Remove GST</button></div><label className="money-field"><span>{mode === 'add' ? 'Price excluding GST' : 'Price including GST'}</span><div><b>$</b><input type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} aria-label="Amount in Australian dollars"/><em>AUD</em></div></label><div className="gst-results"><div><span>Price excluding GST</span><strong>{money(values.ex)}</strong></div><div className="gst-highlight"><span>GST amount · 10%</span><strong>{money(values.gst)}</strong></div><div><span>Price including GST</span><strong>{money(values.inc)}</strong></div></div><p className="gst-note">Uses the standard Australian GST rate of 10%. Results are rounded to the nearest cent.</p></>;
}

function CleanerTool() {
  const [text,setText]=useState('Paste   messy text here...\n\n\nExtra spaces and line breaks will be cleaned up.'); const [mode,setMode]=useState('spaces');
  const clean = () => setText(mode==='lines' ? text.replace(/\n{2,}/g,'\n').trim() : text.replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim());
  return <><div className="segmented"><button className={mode==='spaces'?'active':''} onClick={()=>setMode('spaces')}>Clean spaces</button><button className={mode==='lines'?'active':''} onClick={()=>setMode('lines')}>Clean line breaks</button></div><label className="textarea-label">Your text<textarea value={text} onChange={e=>setText(e.target.value)} rows="10"/></label><div className="workspace-actions"><span>{text.trim()?text.trim().split(/\s+/).length:0} words · {text.length} characters</span><button className="button primary" onClick={clean}><Icon name="spark"/> Clean text</button></div></>;
}

function OneLineTool() {
  const [text, setText] = useState('First line of text.\nSecond line with more detail.\n\nThird line after a gap.');
  const [converted, setConverted] = useState(false);
  const lineCount = text ? text.split(/\r?\n/).length : 0;
  const convert = () => {
    setText(text.replace(/\r?\n+/g, ' ').replace(/[ \t]+/g, ' ').trim());
    setConverted(true);
  };
  return <><label className="textarea-label">Text with line breaks<textarea value={text} onChange={event => { setText(event.target.value); setConverted(false); }} rows="10" placeholder="Paste multi-line text here…"/></label><div className="one-line-meta"><span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span><span>{text.length} characters</span></div><div className="one-line-actions"><button className="button primary" onClick={convert} disabled={!text || lineCount === 1}>{lineCount === 1 ? 'Already one line' : 'Convert to one line'}</button><button className="button secondary" onClick={() => navigator.clipboard?.writeText(text)} disabled={!text}><Icon name="copy" size={18}/> Copy text</button></div>{converted && <div className="one-line-success"><Icon name="check" size={17}/> Line breaks removed. Your text is ready to copy.</div>}</>;
}

function InvoiceTool() {
  const [notes,setNotes]=useState('Installed new Wi-Fi router, configured guest network, connected 6 office computers and tested coverage.'); const [tone,setTone]=useState('Professional'); const [output,setOutput]=useState('');
  const generate=()=>{ const value=notes.trim().replace(/[.!]+$/,''); if(!value)return; const prefix=tone==='Concise'?'Completed: ':tone==='Detailed'?'Services completed include: ':'Professional services provided: '; setOutput(prefix+value.charAt(0).toLowerCase()+value.slice(1)+'. All systems were tested and confirmed operational.'); };
  return <><label className="textarea-label">What work did you complete?<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows="6" placeholder="Enter rough job notes…"/></label><div className="field-row align-end"><label>Tone<select value={tone} onChange={e=>setTone(e.target.value)}><option>Professional</option><option>Concise</option><option>Detailed</option></select></label><button className="button primary" onClick={generate}><Icon name="spark"/> Generate description</button></div>{output&&<div className="output-box"><div><strong>Invoice-ready draft</strong><span>Generated locally</span></div><p>{output}</p><button onClick={()=>navigator.clipboard?.writeText(output)}><Icon name="copy" size={17}/> Copy text</button></div>}<div className="concept-note"><span>AI concept</span>This demo uses a local template. A future browser AI version could rewrite text privately on your device.</div></>;
}

function CaseTool() {
  const [text, setText] = useState('Turn this rough HEADING into something useful.');
  const convert = mode => {
    if (mode === 'upper') setText(text.toUpperCase());
    if (mode === 'lower') setText(text.toLowerCase());
    if (mode === 'title') setText(text.toLowerCase().replace(/\b\w/g, char => char.toUpperCase()));
    if (mode === 'sentence') setText(text.toLowerCase().replace(/(^|[.!?]\s+)\w/g, char => char.toUpperCase()));
  };
  const copy = () => navigator.clipboard?.writeText(text);
  return <><label className="textarea-label">Your text<textarea value={text} onChange={e => setText(e.target.value)} rows="9" placeholder="Paste text to convert…"/></label><div className="case-actions"><button onClick={() => convert('upper')}>UPPERCASE</button><button onClick={() => convert('lower')}>lowercase</button><button onClick={() => convert('title')}>Title Case</button><button onClick={() => convert('sentence')}>Sentence case</button></div><div className="workspace-actions"><span>{text.length} characters</span><button className="button primary compact" onClick={copy}><Icon name="copy" size={18}/> Copy result</button></div></>;
}

function WordCounterTool() {
  const [text, setText] = useState('Paste or type your text here. Your counts update instantly as you write.');
  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const sentences = trimmed ? (trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []).length : 0;
    const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter(Boolean).length : 0;
    return { words, characters: text.length, noSpaces: text.replace(/\s/g, '').length, sentences, paragraphs, minutes: words ? Math.max(1, Math.ceil(words / 225)) : 0 };
  }, [text]);
  return <><div className="counter-grid"><Stat value={stats.words} label="Words"/><Stat value={stats.characters} label="Characters"/><Stat value={stats.sentences} label="Sentences"/><Stat value={stats.paragraphs} label="Paragraphs"/></div><label className="textarea-label">Your text<textarea value={text} onChange={e => setText(e.target.value)} rows="11" placeholder="Start typing or paste text…"/></label><div className="reading-strip"><span>Estimated reading time</span><strong>{stats.minutes} min</strong><span>{stats.noSpaces} characters without spaces</span></div></>;
}

function Stat({ value, label }) {
  return <div className="stat"><strong>{value.toLocaleString()}</strong><span>{label}</span></div>;
}

function ImageShrinkerTool() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [quality, setQuality] = useState(75);
  const [maxWidth, setMaxWidth] = useState(1600);
  const [result, setResult] = useState(null);
  const [working, setWorking] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result?.url]);

  const chooseFile = event => {
    const next = event.target.files?.[0];
    if (!next) return;
    setFile(next); setResult(null); setPreview(URL.createObjectURL(next));
  };
  const shrink = () => {
    if (!file || !preview) return;
    setWorking(true);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxWidth / image.width);
      const width = Math.round(image.width * scale), height = Math.round(image.height * scale);
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(image, 0, 0, width, height);
      canvas.toBlob(blob => {
        if (!blob) { setWorking(false); return; }
        setResult({ url: URL.createObjectURL(blob), size: blob.size, width, height, name: `${file.name.replace(/\.[^.]+$/, '')}-shrunk.jpg` });
        setWorking(false);
      }, 'image/jpeg', quality / 100);
    };
    image.onerror = () => setWorking(false);
    image.src = preview;
  };
  const formatSize = bytes => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;

  return <><label className={`upload-zone ${preview ? 'has-image' : ''}`}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile}/>{preview ? <><img src={preview} alt="Selected preview"/><div><strong>{file.name}</strong><span>{formatSize(file.size)} · Tap to replace</span></div></> : <><span className="upload-icon">↑</span><strong>Choose an image</strong><small>JPEG, PNG or WebP · processed on your device</small></>}</label><div className="shrink-controls"><label>Maximum width<select value={maxWidth} onChange={e => setMaxWidth(Number(e.target.value))}><option value="800">800 px</option><option value="1200">1200 px</option><option value="1600">1600 px</option><option value="2400">2400 px</option></select></label><label>Image quality <strong>{quality}%</strong><input type="range" min="30" max="95" value={quality} onChange={e => setQuality(Number(e.target.value))}/></label></div><button className="button primary shrink-button" onClick={shrink} disabled={!file || working}>{working ? 'Shrinking…' : 'Shrink image'}</button>{result && <div className="image-result"><div><span>New file size</span><strong>{formatSize(result.size)}</strong><small>{result.width} × {result.height}px · {Math.max(0, Math.round((1 - result.size / file.size) * 100))}% smaller</small></div><a className="button primary compact" href={result.url} download={result.name}>Download image</a></div>}</>;
}

function HtmlViewerTool() {
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

function JsonFormatterTool() {
  const [json, setJson] = useState('{"business":"SurrendaSoft","tools":["Emoji Copy","GST Calculator"],"localFirst":true}');
  const [message, setMessage] = useState({ type: 'idle', text: 'Ready to validate' });
  const parse = action => {
    try {
      const value = JSON.parse(json);
      if (action === 'format') setJson(JSON.stringify(value, null, 2));
      if (action === 'minify') setJson(JSON.stringify(value));
      setMessage({ type: 'success', text: 'Valid JSON' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message.replace(/^JSON\.parse:\s*/i, '') });
    }
  };
  const lines = json ? json.split('\n').length : 0;
  return <><div className="json-actions"><button className="button primary compact" onClick={() => parse('format')}><Icon name="spark" size={17}/> Format JSON</button><button onClick={() => parse('minify')}>Minify</button><button onClick={() => parse('validate')}>Validate</button><button onClick={() => navigator.clipboard?.writeText(json)}><Icon name="copy" size={16}/> Copy</button></div><label className="json-editor"><span>JSON input</span><textarea value={json} onChange={e => { setJson(e.target.value); setMessage({ type: 'idle', text: 'Ready to validate' }); }} rows="18" spellCheck="false" placeholder="Paste JSON here…"/></label><div className={`json-status ${message.type}`}><span>{message.type === 'success' ? '✓' : message.type === 'error' ? '!' : '•'} {message.text}</span><small>{lines} lines · {json.length} characters</small></div></>;
}

const formatBytes = bytes => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;

function FileDrop({ accept, multiple = false, onFiles, title, hint }) {
  return <label className="pdf-drop"><input type="file" accept={accept} multiple={multiple} onChange={event => { onFiles(Array.from(event.target.files || [])); event.target.value = ''; }}/><span>＋</span><strong>{title}</strong><small>{hint}</small></label>;
}

function FileList({ files, onRemove, onMove }) {
  return <div className="pdf-file-list">{files.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`}><span className="file-badge">{file.type.includes('pdf') ? 'PDF' : 'IMG'}</span><p><strong>{file.name}</strong><small>{formatBytes(file.size)}</small></p>{onMove && <div className="file-order"><button disabled={index === 0} onClick={() => onMove(index, -1)} aria-label={`Move ${file.name} up`}>↑</button><button disabled={index === files.length - 1} onClick={() => onMove(index, 1)} aria-label={`Move ${file.name} down`}>↓</button></div>}<button className="file-remove" onClick={() => onRemove(index)} aria-label={`Remove ${file.name}`}>×</button></div>)}</div>;
}

function ImageToPdfTool() {
  const [files, setFiles] = useState([]), [pageStyle, setPageStyle] = useState('a4'), [busy, setBusy] = useState(false), [error, setError] = useState(''), [result, setResult] = useState(null);
  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result?.url]);
  const addFiles = next => { setFiles(current => [...current, ...next]); setResult(null); setError(''); };
  const createPdf = async () => {
    if (!files.length) return;
    setBusy(true); setError('');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdf = await PDFDocument.create();
      for (const file of files) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const image = file.type === 'image/png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const naturalWidth = image.width * .75, naturalHeight = image.height * .75;
        const pageWidth = pageStyle === 'fit' ? naturalWidth : 595.28, pageHeight = pageStyle === 'fit' ? naturalHeight : 841.89;
        const margin = pageStyle === 'fit' ? 0 : 36;
        const scale = Math.min((pageWidth - margin * 2) / naturalWidth, (pageHeight - margin * 2) / naturalHeight, 1);
        const width = naturalWidth * scale, height = naturalHeight * scale;
        const page = pdf.addPage([pageWidth, pageHeight]);
        page.drawImage(image, { x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height });
      }
      const bytes = await pdf.save();
      setResult({ url: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), size: bytes.length, name: 'surrendasoft-images.pdf' });
    } catch (err) { setError(err.message || 'Could not create the PDF.'); }
    setBusy(false);
  };
  return <><FileDrop accept="image/jpeg,image/png" multiple onFiles={addFiles} title="Choose JPG or PNG images" hint="Select several images to create a multi-page PDF"/>{files.length > 0 && <><FileList files={files} onRemove={index => setFiles(files.filter((_, i) => i !== index))}/><div className="pdf-options"><label>Page size<select value={pageStyle} onChange={event => setPageStyle(event.target.value)}><option value="a4">A4 portrait</option><option value="fit">Fit each image</option></select></label><span>{files.length} {files.length === 1 ? 'page' : 'pages'}</span></div><button className="button primary pdf-action" onClick={createPdf} disabled={busy}>{busy ? 'Creating PDF…' : 'Create PDF'}</button></>}{error && <p className="pdf-error">{error}</p>}{result && <div className="pdf-result"><div><strong>PDF ready</strong><span>{files.length} pages · {formatBytes(result.size)}</span></div><a className="button primary compact" href={result.url} download={result.name}>Download PDF</a></div>}</>;
}

function PdfToImageTool() {
  const [file, setFile] = useState(null), [busy, setBusy] = useState(false), [outputs, setOutputs] = useState([]), [error, setError] = useState('');
  useEffect(() => () => outputs.forEach(output => URL.revokeObjectURL(output.url)), [outputs]);
  const choose = next => { setFile(next[0] || null); setOutputs([]); setError(''); };
  const convert = async () => {
    if (!file) return;
    setBusy(true); setError(''); setOutputs([]);
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const pages = [];
      for (let number = 1; number <= document.numPages; number++) {
        const page = await document.getPage(number), viewport = page.getViewport({ scale: 1.6 });
        const canvas = window.document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (blob) pages.push({ url: URL.createObjectURL(blob), size: blob.size, name: `page-${number}.png`, number });
      }
      setOutputs(pages);
    } catch (err) { setError(err.message || 'Could not read this PDF.'); }
    setBusy(false);
  };
  return <>{!file ? <FileDrop accept="application/pdf" onFiles={choose} title="Choose a PDF" hint="Every page will be converted locally to PNG"/> : <FileList files={[file]} onRemove={() => choose([])}/>} {file && <button className="button primary pdf-action" onClick={convert} disabled={busy}>{busy ? 'Rendering pages…' : 'Convert to images'}</button>}{error && <p className="pdf-error">{error}</p>}{outputs.length > 0 && <div className="page-outputs"><div className="output-heading"><strong>{outputs.length} images ready</strong><span>PNG · 1.6× quality</span></div>{outputs.map(output => <div key={output.name}><img src={output.url} alt={`PDF page ${output.number}`}/><p><strong>Page {output.number}</strong><small>{formatBytes(output.size)}</small></p><a href={output.url} download={output.name}>Download PNG</a></div>)}</div>}</>;
}

function CombinePdfTool() {
  const [files, setFiles] = useState([]), [busy, setBusy] = useState(false), [result, setResult] = useState(null), [error, setError] = useState('');
  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result?.url]);
  const move = (index, direction) => { const next = [...files], target = index + direction; [next[index], next[target]] = [next[target], next[index]]; setFiles(next); setResult(null); };
  const combine = async () => {
    if (files.length < 2) return;
    setBusy(true); setError('');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const merged = await PDFDocument.create();
      for (const file of files) {
        const source = await PDFDocument.load(await file.arrayBuffer());
        const pages = await merged.copyPages(source, source.getPageIndices());
        pages.forEach(page => merged.addPage(page));
      }
      const bytes = await merged.save();
      setResult({ url: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), size: bytes.length });
    } catch (err) { setError(err.message || 'Could not combine these PDFs. Encrypted files may not be supported.'); }
    setBusy(false);
  };
  return <><FileDrop accept="application/pdf" multiple onFiles={next => { setFiles(current => [...current, ...next]); setResult(null); setError(''); }} title="Choose PDF files" hint="Select at least two files; they stay on your device"/>{files.length > 0 && <FileList files={files} onRemove={index => setFiles(files.filter((_, i) => i !== index))} onMove={move}/>}<button className="button primary pdf-action" onClick={combine} disabled={files.length < 2 || busy}>{busy ? 'Combining PDFs…' : files.length < 2 ? 'Add at least two PDFs' : `Combine ${files.length} PDFs`}</button>{error && <p className="pdf-error">{error}</p>}{result && <div className="pdf-result"><div><strong>Combined PDF ready</strong><span>{files.length} files · {formatBytes(result.size)}</span></div><a className="button primary compact" href={result.url} download="surrendasoft-combined.pdf">Download PDF</a></div>}</>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
