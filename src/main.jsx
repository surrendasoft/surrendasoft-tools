import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import QRCode from 'qrcode';
import { buildIcs, padCalendar } from './calendar.js';
import './styles.css';

const tools = [
  { id: 'emoji', icon: '😁', name: 'Emoji Copy', description: 'Search, copy, and paste emojis quickly for messages, social posts, emails, and captions.', tint: 'yellow', status: 'Available', categories: ['Free'] },
  { id: 'dates', icon: '17', name: 'Date Range Calculator', description: 'Calculate days, weeks, business days, deadlines, and time between dates.', tint: 'blue', status: 'Available', categories: ['Free', 'Business'] },
  { id: 'schedule', icon: '📅', name: 'Calendar Schedule Generator', description: 'Create calendar files for timetables, programs, workshops, and repeating sessions.', tint: 'blue', status: 'Available', tags: ['Free', 'Browser-based', 'Downloads ICS'], categories: ['Free', 'Business', 'Productivity', 'Education'] },
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
  { id: 'webstatus', icon: 'URL', name: 'Website Status Checker', description: 'Check whether a website is reachable and see response timing when the browser can read it.', tint: 'blue', status: 'Available', categories: ['Free', 'Business', 'Developer'] },
  { id: 'speed', icon: 'NET', name: 'Internet Speed Checker', description: 'Run a quick browser download test and estimate your current connection speed.', tint: 'mint', status: 'Available', categories: ['Free', 'Business'] },
  { id: 'hourly', icon: 'HR', name: 'Hourly Rate Calculator', description: 'Work out a sustainable hourly rate from income goals, billable hours, overheads, and profit.', tint: 'yellow', status: 'Available', categories: ['Free', 'Business'] },
  { id: 'margin', icon: '$', name: 'Profit Margin Calculator', description: 'Calculate selling price, profit, margin, and markup for products or services.', tint: 'mint', status: 'Available', categories: ['Free', 'Business'] },
  { id: 'signpdf', icon: '✍️', name: 'Sign PDF', description: 'See your PDF, then drag a drawn or uploaded signature onto the page and download the signed file.', tint: 'mint', status: 'Available', categories: ['Free', 'Files & PDF', 'Business'] },
  { id: 'tts', icon: '🔊', name: 'Text to Speech', description: 'Read any text aloud with your browser voice. Choose the voice, speed, and pitch.', tint: 'purple', status: 'Available', categories: ['Free', 'Media', 'Productivity'] },
  { id: 'recorder', icon: '🎙️', name: 'Audio Recorder', description: 'Record from your microphone and download the audio. Nothing is uploaded.', tint: 'yellow', status: 'Available', categories: ['Free', 'Media'] },
  { id: 'location', icon: '📍', name: 'My Location', description: 'Show your GPS coordinates and accuracy with a map link. Asks permission first.', tint: 'blue', status: 'Available', categories: ['Free', 'Utilities'] },
  { id: 'sysinfo', icon: 'IP', name: 'IP & System Info', description: 'See your public IP, browser, operating system, screen, timezone, and language.', tint: 'mint', status: 'Available', categories: ['Free', 'Developer', 'Utilities'] },
  { id: 'camera', icon: '📷', name: 'Camera', description: 'Take photos from your device camera, then pick which ones to download — or grab them all.', tint: 'yellow', status: 'Available', categories: ['Free', 'Media'] },
  { id: 'percent', icon: '%', name: 'Percentage Calculator', description: 'Work out percentages, find what percent one number is of another, and calculate percentage change.', tint: 'blue', status: 'Available', categories: ['Free', 'Business', 'Calculators'] },
  { id: 'units', icon: '⇄', name: 'Unit Converter', description: 'Convert between metric and imperial units for length, weight, temperature, volume, speed, and area.', tint: 'mint', status: 'Available', categories: ['Free', 'Calculators'] },
  { id: 'scam', icon: '🛡️', name: 'Scam Email Checker', description: 'Paste a suspicious email to check for scam signals, phishing patterns, and dodgy links.', tint: 'yellow', status: 'Available', categories: ['Free', 'Business', 'Utilities'] },
  { id: 'seo', icon: '🔍', name: 'SEO Checker', description: 'Enter a URL to get a quick SEO audit via Google PageSpeed — title, meta, speed, and Core Web Vitals.', tint: 'blue', status: 'Available', categories: ['Free', 'Business', 'Developer'] },
  { id: 'calc', icon: '🧮', name: 'Calculator', description: 'A straightforward calculator for everyday arithmetic — add, subtract, multiply, divide.', tint: 'mint', status: 'Available', categories: ['Free', 'Calculators'] },
  { id: 'utc', icon: '🕒', name: 'UTC Converter', description: 'Convert between local time and UTC. Shows Unix timestamp and ISO 8601 format — handy for developers.', tint: 'blue', status: 'Available', categories: ['Free', 'Developer', 'Utilities'] },
  { id: 'tz', icon: '🌍', name: 'Time Zone Converter', description: 'Pick a time and source timezone to instantly see the equivalent across major world cities.', tint: 'purple', status: 'Available', categories: ['Free', 'Business', 'Utilities'] },
  { id: 'qr', icon: '▦', name: 'QR Code Generator', description: 'Turn any URL, text, or contact detail into a scannable QR code. Download as PNG instantly.', tint: 'yellow', status: 'Available', categories: ['Free', 'Business', 'Utilities'] },
  { id: 'bgremove', icon: '✂️', name: 'Background Remover', description: 'Remove the background from product photos and portraits with edge flood-fill. No AI, no upload, runs locally.', tint: 'purple', status: 'Available', categories: ['Free', 'Files & PDF', 'Media'] },
  { id: 'fileconv', icon: '🔄', name: 'Image Converter', description: 'Convert images between JPG, PNG, and WebP. Adjust quality for JPEG and WebP. All conversion runs in your browser.', tint: 'blue', status: 'Available', categories: ['Free', 'Files & PDF', 'Media'] },
  { id: 'fileview', icon: '👁', name: 'File Viewer', description: 'Drop any file to view it: images, audio, video, PDF, text, code, JSON, CSV, HTML — or a hex dump for binary files. Edit text and download.', tint: 'mint', status: 'Available', categories: ['Free', 'Files & PDF', 'Developer', 'Utilities'] },
  { id: 'suggest', icon: '💡', name: 'Suggest a Tool', description: "Need a tool we haven't built yet? Tell us what you need — we read every suggestion and it shapes what gets built next.", tint: 'yellow', status: 'Available', categories: ['Free'] },
];

// ─── Tool visibility flags — set false to hide a tool from the directory ────
const TOOL_FLAGS = {
  emoji:      true, // Search and copy emojis
  dates:      true, // Days / weeks / business days between two dates
  schedule:   true, // Repeating calendar session generator → .ics download
  gst:        true, // Add or remove Australian GST (10%)
  cleaner:    true, // Strip extra spaces and line breaks from text
  oneline:    true, // Collapse multi-line text into a single line
  invoice:    true, // AI-assisted invoice description writer
  case:       true, // UPPER / lower / Title / Sentence case converter
  counter:    true, // Word, character, sentence, paragraph counter
  shrinker:   true, // Compress images for email / upload
  html:       true, // Sandboxed HTML preview
  json:       true, // Format and validate JSON
  imagepdf:   true, // JPG / PNG images → PDF
  pdfimage:   true, // PDF pages → PNG images
  combinepdf: true, // Merge multiple PDFs into one
  webstatus:  true, // Check if a website is reachable
  speed:      true, // Browser-based download speed test
  hourly:     true, // Sustainable hourly rate from income goals
  margin:     true, // Selling price, profit, margin, and markup
  signpdf:    true, // Drag a drawn or uploaded signature onto a PDF
  tts:        true, // Browser text-to-speech with voice / speed controls
  recorder:   true, // Microphone recorder → download audio
  location:   true, // GPS coordinates + map link
  sysinfo:    true, // Public IP, browser, OS, screen, timezone
  camera:     true, // Snap photos and download selected shots
  percent:    true, // Percentage of, what % is X of Y, % change
  units:      true, // Length / weight / temp / volume / speed / area converter
  scam:       true, // Pattern-match email body for scam / phishing signals
  seo:        true, // Google PageSpeed SEO audit for a URL
  calc:       true, // Basic arithmetic calculator
  utc:        true, // Local ↔ UTC converter + Unix timestamp + ISO 8601
  tz:         true, // World time zone converter across major cities
  qr:         true, // QR code generator → PNG download
  bgremove:   true, // Edge flood-fill background removal → transparent PNG
  fileconv:   true, // Image format converter: JPG / PNG / WebP + quality control
  fileview:   true, // Universal file viewer: auto-detect + edit text + hex dump for binary
  suggest:    true, // Suggest a tool you'd like us to build
};

const directoryFilters = ['All', 'Free', 'Business', 'Productivity', 'Education', 'Calculators', 'Media', 'Utilities', 'Files & PDF', 'Developer', 'Local AI', 'Uses Credits'];
const categoryIcons = { All:'✦', Free:'✓', Business:'💼', Productivity:'⚡', Education:'🎓', Calculators:'🧮', Media:'🎬', Utilities:'🔧', 'Files & PDF':'📄', Developer:'💻', 'Local AI':'🤖', 'Uses Credits':'⭐' };

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
  const [activeTool, setActiveTool] = useState(() => {
    const hash = window.location.hash.replace('#', '').trim();
    return hash && tools.find(t => t.id === hash) ? hash : null;
  });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace('#', '').trim();
      const tool = hash && tools.find(t => t.id === hash) ? hash : null;
      setActiveTool(tool);
      setMenuOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const openTool = id => { setActiveTool(id); setMenuOpen(false); window.location.hash = id; window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goHome = () => { setActiveTool(null); setMenuOpen(false); history.replaceState(null, '', window.location.pathname + window.location.search); window.scrollTo({ top: 0, behavior: 'smooth' }); };

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
      if (!TOOL_FLAGS[tool.id]) return false;
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
      <div className="directory-controls"><label className="directory-search"><Icon name="search"/><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tools, e.g. PDF, invoice, emoji, AI…" aria-label="Search tools"/>{query && <button onClick={() => setQuery('')} aria-label="Clear search"><Icon name="close" size={16}/></button>}</label><div className="filter-chips" role="group" aria-label="Filter tools by category">{directoryFilters.map(item => <button key={item} className={filter === item ? 'active' : ''} aria-pressed={filter === item} onClick={() => setFilter(item)}><span className="chip-ico">{categoryIcons[item]}</span>{item}</button>)}</div></div>
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
      {id === 'emoji' && <EmojiTool/>}{id === 'dates' && <DateTool/>}{id === 'schedule' && <CalendarScheduleTool/>}{id === 'gst' && <GstTool/>}{id === 'cleaner' && <CleanerTool/>}{id === 'oneline' && <OneLineTool/>}{id === 'invoice' && <InvoiceTool/>}{id === 'case' && <CaseTool/>}{id === 'counter' && <WordCounterTool/>}{id === 'shrinker' && <ImageShrinkerTool/>}{id === 'html' && <HtmlViewerTool/>}{id === 'json' && <JsonFormatterTool/>}{id === 'imagepdf' && <ImageToPdfTool/>}{id === 'pdfimage' && <PdfToImageTool/>}{id === 'combinepdf' && <CombinePdfTool/>}{id === 'webstatus' && <WebsiteStatusTool/>}{id === 'speed' && <InternetSpeedTool/>}{id === 'hourly' && <HourlyRateTool/>}{id === 'margin' && <ProfitMarginTool/>}{id === 'signpdf' && <SignPdfTool/>}{id === 'tts' && <TextToSpeechTool/>}{id === 'recorder' && <AudioRecorderTool/>}{id === 'location' && <LocationTool/>}{id === 'sysinfo' && <SystemInfoTool/>}{id === 'camera' && <CameraTool/>}{id === 'percent' && <PercentageTool/>}{id === 'units' && <UnitConverterTool/>}{id === 'scam' && <ScamCheckerTool/>}{id === 'seo' && <SeoCheckerTool/>}{id === 'calc' && <CalculatorTool/>}{id === 'utc' && <UtcConverterTool/>}{id === 'tz' && <TimeZoneConverterTool/>}{id === 'qr' && <QrCodeTool/>}{id === 'bgremove' && <BgRemoverTool/>}{id === 'fileconv' && <FileConverterTool/>}{id === 'fileview' && <FileViewerTool/>}{id === 'suggest' && <SuggestTool/>}
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

function CalendarScheduleTool() {
  const tomorrowDate = new Date(Date.now() + 86400000);
  const tomorrow = `${tomorrowDate.getFullYear()}-${padCalendar(tomorrowDate.getMonth() + 1)}-${padCalendar(tomorrowDate.getDate())}`;
  const [form, setForm] = useState({ title: 'Counselling Lecture', date: tomorrow, start: '09:00', end: '11:00', repeat: 'weekly', sessions: 12, location: 'City campus', description: 'Master of Counselling class', titleFormat: 'week' });
  const [events, setEvents] = useState([]), [error, setError] = useState(''), [copied, setCopied] = useState(false);
  const update = (field, value) => { setForm(current => ({ ...current, [field]: value })); setEvents([]); setError(''); setCopied(false); };
  const createDate = (date, time) => new Date(`${date}T${time}:00`);
  const sessionDate = (start, index) => {
    if (form.repeat !== 'monthly') return new Date(start.getTime() + index * (form.repeat === 'fortnightly' ? 14 : 7) * 86400000);
    const result = new Date(start), day = start.getDate();
    result.setDate(1); result.setMonth(start.getMonth() + index);
    result.setDate(Math.min(day, new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()));
    return result;
  };
  const buildEvents = () => {
    const start = createDate(form.date, form.start), end = createDate(form.date, form.end), count = Math.min(52, Math.max(1, Number(form.sessions) || 1));
    if (!form.title.trim()) return setError('Enter an event title.');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return setError('Choose a valid date and time.');
    if (end <= start) return setError('End time must be later than start time.');
    const duration = end - start;
    const nextEvents = Array.from({ length: count }, (_, index) => {
      const eventStart = sessionDate(start, index), eventEnd = new Date(sessionDate(start, index).getTime() + duration);
      return { title: formatEventTitle(index), start: eventStart, end: eventEnd, location: form.location.trim(), description: form.description.trim(), number: index + 1 };
    });
    setEvents(nextEvents); setError(''); return nextEvents;
  };
  const formatEventTitle = index => {
    const baseTitle = form.title.trim() || 'Event title';
    if (form.titleFormat === 'week') return `Week ${index + 1} - ${baseTitle}`;
    if (form.titleFormat === 'session') return `Session ${index + 1} - ${baseTitle}`;
    return baseTitle;
  };
  const summary = list => list.map(event => `${event.title} — ${event.start.toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`).join('\n');
  const download = () => {
    const list = events.length ? events : buildEvents(); if (!list?.length) return;
    const ics = buildIcs(list);
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${form.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'schedule'}.ics`; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const copySummary = async () => { const list = events.length ? events : buildEvents(); if (!list?.length) return; await navigator.clipboard?.writeText(summary(list)); setCopied(true); };
  const displayDate = date => date.toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  return <>
    <div className="schedule-form">
      <label className="wide">Base event title<input value={form.title} onChange={event => update('title', event.target.value)} placeholder="e.g. Counselling Lecture"/></label>
      <label>Start date<input type="date" value={form.date} onChange={event => update('date', event.target.value)}/></label>
      <label>Repeat every<select value={form.repeat} onChange={event => update('repeat', event.target.value)}><option value="weekly">Week</option><option value="fortnightly">Fortnight</option><option value="monthly">Month</option></select></label>
      <label>Start time<input type="time" value={form.start} onChange={event => update('start', event.target.value)}/></label>
      <label>End time<input type="time" value={form.end} onChange={event => update('end', event.target.value)}/></label>
      <label>Number of sessions<input type="number" min="1" max="52" value={form.sessions} onChange={event => update('sessions', event.target.value)}/></label>
      <label>Title format<select value={form.titleFormat} onChange={event => update('titleFormat', event.target.value)}><option value="same">Same title every time</option><option value="week">Week 1 - Title</option><option value="session">Session 1 - Title</option></select><small className="schedule-sample">First event: {formatEventTitle(0)}</small></label>
      <label className="wide">Location <span>optional</span><input value={form.location} onChange={event => update('location', event.target.value)} placeholder="e.g. City campus"/></label>
      <label className="wide">Description <span>optional</span><textarea rows="2" value={form.description} onChange={event => update('description', event.target.value)} placeholder="Notes for every event"/></label>
    </div>
    <button className="button primary schedule-generate" onClick={buildEvents}>Generate schedule</button>
    {error && <p className="pdf-error">{error}</p>}
    {events.length > 0 && <div className="schedule-output"><div className="schedule-output-head"><div><strong>{events.length}-session schedule</strong><span>{form.repeat === 'fortnightly' ? 'Fortnightly' : form.repeat === 'monthly' ? 'Monthly' : 'Weekly'} · {displayDate(events[0].start)} to {displayDate(events[events.length - 1].start)}</span></div><span>Ready for calendar</span></div><div className="schedule-preview">{events.map(event => <div key={event.number}><b>{event.number}</b><p><strong>{event.title}</strong><span>{displayDate(event.start)} – {event.end.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}{event.location ? ` · ${event.location}` : ''}</span></p></div>)}</div><div className="schedule-actions"><button className="button primary" onClick={download}>Download .ics</button><button className="button secondary" onClick={copySummary}><Icon name={copied ? 'check' : 'copy'} size={18}/>{copied ? 'Copied' : 'Copy calendar summary'}</button></div><p className="calendar-help">Import the downloaded file into Google Calendar, Apple Calendar, or Outlook. All sessions are created as separate events, so each can be edited later.</p></div>}
  </>;
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

function WebsiteStatusTool() {
  const [url, setUrl] = useState('https://surrendasoft.com');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const normaliseUrl = value => /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  const check = async () => {
    if (!url.trim()) return;
    const target = normaliseUrl(url);
    setChecking(true); setResult(null);
    const started = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(target, { method: 'HEAD', cache: 'no-store', signal: controller.signal });
      setResult({ type: response.ok ? 'success' : 'warning', title: response.ok ? 'Website responded' : 'Website returned an error', detail: `${response.status} ${response.statusText || 'response'} - ${Math.round(performance.now() - started)} ms`, target });
    } catch (error) {
      try {
        await fetch(target, { mode: 'no-cors', cache: 'no-store', signal: controller.signal });
        setResult({ type: 'success', title: 'Website appears reachable', detail: `Reached in ${Math.round(performance.now() - started)} ms. Status code is hidden by browser privacy rules.`, target });
      } catch (fallbackError) {
        setResult({ type: 'error', title: fallbackError.name === 'AbortError' ? 'Request timed out' : 'Could not reach website', detail: fallbackError.name === 'AbortError' ? 'No response within 8 seconds.' : 'The site may be offline, blocking browser checks, or the address may be incorrect.', target });
      }
    } finally {
      clearTimeout(timeout); setChecking(false);
    }
  };
  return <><label className="textarea-label status-url">Website URL<input value={url} onChange={event => { setUrl(event.target.value); setResult(null); }} placeholder="example.com" inputMode="url"/></label><button className="button primary status-button" onClick={check} disabled={checking || !url.trim()}>{checking ? 'Checking...' : 'Check website'}</button>{result && <div className={`status-result ${result.type}`}><div><strong>{result.title}</strong><span>{result.target}</span></div><p>{result.detail}</p></div>}<p className="tool-footnote">Browser checks can confirm reachability, but a backend monitor is needed for full uptime, SSL, and regional checks.</p></>;
}

function InternetSpeedTool() {
  const [size, setSize] = useState(5);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const runTest = async () => {
    setRunning(true); setResult(null);
    const bytes = size * 1000 * 1000;
    const started = performance.now();
    try {
      const response = await fetch(`https://speed.cloudflare.com/__down?bytes=${bytes}&cache=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Speed test returned ${response.status}`);
      const buffer = await response.arrayBuffer();
      const seconds = (performance.now() - started) / 1000;
      const mbps = (buffer.byteLength * 8) / seconds / 1000 / 1000;
      setResult({ type: 'success', mbps, seconds, size: buffer.byteLength });
    } catch (error) {
      setResult({ type: 'error', message: error.message || 'Could not complete the speed test.' });
    }
    setRunning(false);
  };
  const speedRating = mbps => {
    if (mbps >= 100) return { label: 'Excellent', note: 'Great for 4K streaming, large uploads, and video calls.', color: '#08785f' };
    if (mbps >= 25)  return { label: 'Fast', note: 'Handles HD streaming, remote work, and video calls comfortably.', color: '#1666d9' };
    if (mbps >= 10)  return { label: 'Okay', note: 'Fine for browsing and SD video. May struggle with 4K or large files.', color: '#8a6500' };
    if (mbps >= 5)   return { label: 'Slow', note: 'Basic browsing should work. Streaming and large downloads will be slow.', color: '#c25c00' };
    return { label: 'Very slow', note: 'May struggle with most online tasks. Try restarting your router or moving closer to it.', color: '#a83b3b' };
  };
  return <><div className="speed-panel"><label>Test size<select value={size} onChange={event => setSize(Number(event.target.value))}><option value="1">Quick - 1 MB</option><option value="5">Standard - 5 MB</option><option value="10">Stronger - 10 MB</option></select></label><button className="button primary" onClick={runTest} disabled={running}>{running ? 'Testing...' : 'Start speed test'}</button></div>{result?.type === 'success' && (() => { const r = speedRating(result.mbps); return <div className="speed-result"><strong>{result.mbps.toFixed(1)} Mbps</strong><div className="speed-rating" style={{color: r.color}}><span className="speed-rating-label">{r.label}</span><span className="speed-rating-note">{r.note}</span></div><span className="speed-detail">{formatBytes(result.size)} downloaded in {result.seconds.toFixed(2)} s</span><meter min="0" max="150" optimum="100" value={Math.min(150, result.mbps)}/></div>; })()}{result?.type === 'error' && <p className="pdf-error">{result.message}</p>}<p className="tool-footnote">This is a quick download estimate from your current browser session, not a replacement for a full ISP diagnostic.</p></>;
}

function HourlyRateTool() {
  const [income, setIncome] = useState('120000'), [hours, setHours] = useState('25'), [weeksOff, setWeeksOff] = useState('5'), [overhead, setOverhead] = useState('15'), [profit, setProfit] = useState('20');
  const money = value => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value || 0);
  const values = useMemo(() => {
    const targetIncome = Math.max(0, Number(income) || 0), billableHours = Math.max(1, Number(hours) || 1), workingWeeks = Math.max(1, 52 - (Number(weeksOff) || 0));
    const overheadRate = Math.max(0, Number(overhead) || 0) / 100, profitRate = Math.max(0, Number(profit) || 0) / 100;
    const requiredRevenue = targetIncome * (1 + overheadRate) / Math.max(.01, 1 - profitRate);
    const yearlyHours = billableHours * workingWeeks;
    return { rate: requiredRevenue / yearlyHours, yearlyHours, monthlyRevenue: requiredRevenue / 12, requiredRevenue };
  }, [income, hours, weeksOff, overhead, profit]);
  return <><div className="calculator-form"><label>Target annual pay<input type="number" min="0" value={income} onChange={event => setIncome(event.target.value)}/></label><label>Billable hours per week<input type="number" min="1" value={hours} onChange={event => setHours(event.target.value)}/></label><label>Weeks off per year<input type="number" min="0" max="51" value={weeksOff} onChange={event => setWeeksOff(event.target.value)}/></label><label>Overheads<input type="number" min="0" value={overhead} onChange={event => setOverhead(event.target.value)}/><span>%</span></label><label>Profit buffer<input type="number" min="0" max="95" value={profit} onChange={event => setProfit(event.target.value)}/><span>%</span></label></div><div className="calculator-results"><div className="hero-stat"><span>Suggested hourly rate</span><strong>{money(values.rate)}</strong></div><Stat value={Math.round(values.yearlyHours)} label="Billable hours/year"/><Stat value={money(values.monthlyRevenue)} label="Monthly revenue"/><Stat value={money(values.requiredRevenue)} label="Annual revenue"/></div><p className="tool-footnote">Thoughts: this is a genuinely useful business tool because it turns vague pricing anxiety into concrete inputs.</p></>;
}

function ProfitMarginTool() {
  const [mode, setMode] = useState('price'), [cost, setCost] = useState('65'), [price, setPrice] = useState('120'), [targetMargin, setTargetMargin] = useState('35');
  const money = value => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value || 0);
  const values = useMemo(() => {
    const costValue = Math.max(0, Number(cost) || 0);
    const sellPrice = mode === 'target' ? costValue / Math.max(.01, 1 - (Math.max(0, Number(targetMargin) || 0) / 100)) : Math.max(0, Number(price) || 0);
    const grossProfit = sellPrice - costValue;
    return { sellPrice, grossProfit, margin: sellPrice ? grossProfit / sellPrice * 100 : 0, markup: costValue ? grossProfit / costValue * 100 : 0 };
  }, [mode, cost, price, targetMargin]);
  return <><div className="gst-mode" role="group" aria-label="Profit margin mode"><button className={mode === 'price' ? 'active' : ''} onClick={() => setMode('price')}>Known sell price</button><button className={mode === 'target' ? 'active' : ''} onClick={() => setMode('target')}>Target margin</button></div><div className="calculator-form"><label>Cost<input type="number" min="0" step="0.01" value={cost} onChange={event => setCost(event.target.value)}/></label>{mode === 'price' ? <label>Sell price<input type="number" min="0" step="0.01" value={price} onChange={event => setPrice(event.target.value)}/></label> : <label>Target margin<input type="number" min="0" max="95" step="0.1" value={targetMargin} onChange={event => setTargetMargin(event.target.value)}/><span>%</span></label>}</div><div className="margin-results"><div><span>Sell price</span><strong>{money(values.sellPrice)}</strong></div><div><span>Gross profit</span><strong>{money(values.grossProfit)}</strong></div><div><span>Profit margin</span><strong>{values.margin.toFixed(1)}%</strong></div><div><span>Markup</span><strong>{values.markup.toFixed(1)}%</strong></div></div><p className="tool-footnote">Thoughts: this pairs well with the hourly calculator and makes markup versus margin obvious.</p></>;
}

function SignPdfTool() {
  const [file, setFile] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [result, setResult] = useState(null);
  const [rendering, setRendering] = useState(false), [numPages, setNumPages] = useState(0), [pageNum, setPageNum] = useState(1), [pageDims, setPageDims] = useState(null);
  const [sigMode, setSigMode] = useState('draw'), [sigDataUrl, setSigDataUrl] = useState(''), [sigAspect, setSigAspect] = useState(3), [signedText, setSignedText] = useState(''), [hasInk, setHasInk] = useState(false);
  const [placement, setPlacement] = useState({ fx: 0.6, fy: 0.82, fw: 0.3 });
  const previewRef = useRef(null), stageRef = useRef(null), drawCanvasRef = useRef(null), pdfDocRef = useRef(null);
  const drawing = useRef(false), lastPoint = useRef(null), dragRef = useRef(null);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const fheightFor = fw => pageDims ? (fw * pageDims.ptWidth) / (sigAspect * pageDims.ptHeight) : fw / sigAspect;
  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result?.url]);
  const renderPage = async (doc, number) => {
    setRendering(true);
    try {
      const page = await doc.getPage(number), base = page.getViewport({ scale: 1 });
      setPageDims({ ptWidth: base.width, ptHeight: base.height });
      const scale = Math.min(2, 1400 / base.width), viewport = page.getViewport({ scale }), canvas = previewRef.current;
      if (!canvas) return;
      canvas.width = viewport.width; canvas.height = viewport.height;
      const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
    } finally { setRendering(false); }
  };
  const loadPdf = async source => {
    setError(''); setRendering(true);
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await source.arrayBuffer()) }).promise;
      pdfDocRef.current = doc; setNumPages(doc.numPages); setPageNum(1);
      await renderPage(doc, 1);
    } catch (err) { setError(err.message || 'Could not open this PDF.'); setRendering(false); }
  };
  useEffect(() => { if (file) loadPdf(file); }, [file]);
  useEffect(() => { if (sigMode !== 'draw') return; const canvas = drawCanvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#10183e'; }, [sigMode, file]);
  const goToPage = async next => { const doc = pdfDocRef.current; if (!doc || next < 1 || next > doc.numPages || rendering) return; setPageNum(next); await renderPage(doc, next); };
  const reset = () => { setFile(null); setResult(null); setError(''); setSigDataUrl(''); setNumPages(0); setPageNum(1); setPageDims(null); setHasInk(false); pdfDocRef.current = null; };
  const pointerPos = event => { const canvas = drawCanvasRef.current, rect = canvas.getBoundingClientRect(), point = event.touches ? event.touches[0] : event; return { x: (point.clientX - rect.left) * (canvas.width / rect.width), y: (point.clientY - rect.top) * (canvas.height / rect.height) }; };
  const startDraw = event => { event.preventDefault(); drawing.current = true; lastPoint.current = pointerPos(event); };
  const moveDraw = event => { if (!drawing.current) return; event.preventDefault(); const ctx = drawCanvasRef.current.getContext('2d'), point = pointerPos(event); ctx.beginPath(); ctx.moveTo(lastPoint.current.x, lastPoint.current.y); ctx.lineTo(point.x, point.y); ctx.stroke(); lastPoint.current = point; setHasInk(true); };
  const endDraw = () => { drawing.current = false; };
  const clearInk = () => { const canvas = drawCanvasRef.current; canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); setHasInk(false); };
  const trimCanvas = canvas => {
    const ctx = canvas.getContext('2d'), { width, height } = canvas, data = ctx.getImageData(0, 0, width, height).data;
    let minX = width, minY = height, maxX = 0, maxY = 0, found = false;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 10) { found = true; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    if (!found) return null;
    const pad = 8;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad); maxX = Math.min(width - 1, maxX + pad); maxY = Math.min(height - 1, maxY + pad);
    const w = maxX - minX + 1, h = maxY - minY + 1, out = window.document.createElement('canvas');
    out.width = w; out.height = h; out.getContext('2d').drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
    return { dataUrl: out.toDataURL('image/png'), aspect: w / h };
  };
  const applyDrawn = () => { const trimmed = trimCanvas(drawCanvasRef.current); if (!trimmed) return; setSigDataUrl(trimmed.dataUrl); setSigAspect(trimmed.aspect); setPlacement(previous => ({ ...previous, fw: Math.min(0.35, Math.max(0.15, trimmed.aspect * 0.06)) })); setError(''); };
  const onUpload = event => {
    const image = event.target.files?.[0]; if (!image) return;
    const reader = new FileReader();
    reader.onload = () => { const url = reader.result, probe = new Image(); probe.onload = () => { setSigDataUrl(url); setSigAspect(probe.naturalWidth / probe.naturalHeight || 3); setPlacement(previous => ({ ...previous, fw: 0.3 })); setError(''); }; probe.src = url; };
    reader.readAsDataURL(image);
  };
  const beginDrag = mode => event => {
    event.preventDefault(); event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { mode, startX: event.clientX, startY: event.clientY, rect: stageRef.current.getBoundingClientRect(), orig: { ...placement } };
  };
  const onDrag = event => {
    const drag = dragRef.current; if (!drag) return;
    const dx = (event.clientX - drag.startX) / drag.rect.width, dy = (event.clientY - drag.startY) / drag.rect.height;
    if (drag.mode === 'move') { const fx = clamp(drag.orig.fx + dx, 0, 1 - drag.orig.fw), fy = clamp(drag.orig.fy + dy, 0, 1 - fheightFor(drag.orig.fw)); setPlacement(previous => ({ ...previous, fx, fy })); }
    else { const fw = clamp(drag.orig.fw + dx, 0.06, 1 - drag.orig.fx), fy = Math.min(drag.orig.fy, 1 - fheightFor(fw)); setPlacement(previous => ({ ...previous, fw, fy })); }
  };
  const endDrag = () => { dragRef.current = null; };
  const sign = async () => {
    if (!file) return;
    if (!sigDataUrl && !signedText.trim()) return setError('Add a signature or a typed line first.');
    setBusy(true); setError('');
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const page = pdf.getPages()[pageNum - 1], { width, height } = page.getSize();
      let textY = null, textX = placement.fx * width;
      if (sigDataUrl) {
        const bytes = await fetch(sigDataUrl).then(response => response.arrayBuffer());
        const image = sigDataUrl.startsWith('data:image/png') ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const sigW = placement.fw * width, sigH = sigW / sigAspect, x = placement.fx * width, y = height - (placement.fy * height) - sigH;
        page.drawImage(image, { x, y, width: sigW, height: sigH });
        textY = y - 14; textX = x;
      } else { textY = height - (placement.fy * height) - 14; }
      const textValue = signedText.trim();
      if (textValue) { const font = await pdf.embedFont(StandardFonts.Helvetica); page.drawText(textValue, { x: textX, y: textY, size: sigDataUrl ? 11 : 12, font, color: rgb(0.06, 0.09, 0.24) }); }
      const out = await pdf.save();
      setResult({ url: URL.createObjectURL(new Blob([out], { type: 'application/pdf' })), size: out.length, name: `${file.name.replace(/\.pdf$/i, '')}-signed.pdf` });
    } catch (err) { setError(err.message || 'Could not sign this PDF.'); }
    setBusy(false);
  };
  return <>{!file ? <FileDrop accept="application/pdf" onFiles={files => { setFile(files[0] || null); setResult(null); setError(''); setSigDataUrl(''); }} title="Choose a PDF to sign" hint="Your document is rendered and signed locally — never uploaded"/> : <FileList files={[file]} onRemove={reset}/>}
    {file && <>
      <div className="sign-layout">
        <div className="sign-stage-wrap">
          {numPages > 1 && <div className="sign-pager"><button className="button secondary compact" onClick={() => goToPage(pageNum - 1)} disabled={pageNum <= 1 || rendering}>Prev</button><span>Page {pageNum} of {numPages}</span><button className="button secondary compact" onClick={() => goToPage(pageNum + 1)} disabled={pageNum >= numPages || rendering}>Next</button></div>}
          <div className="sign-stage" ref={stageRef}>
            <canvas ref={previewRef} className="sign-page"/>
            {sigDataUrl && pageDims && <div className="sign-overlay" style={{ left: `${placement.fx * 100}%`, top: `${placement.fy * 100}%`, width: `${placement.fw * 100}%` }} onPointerDown={beginDrag('move')} onPointerMove={onDrag} onPointerUp={endDrag} onPointerCancel={endDrag}><img src={sigDataUrl} alt="Signature" draggable="false"/><span className="sign-handle" onPointerDown={beginDrag('resize')} onPointerMove={onDrag} onPointerUp={endDrag} onPointerCancel={endDrag}/></div>}
            {rendering && <div className="sign-loading">Rendering…</div>}
          </div>
          {sigDataUrl && <p className="sign-hint">Drag the signature to position it, and drag the corner handle to resize.</p>}
        </div>
        <div className="sign-panel">
          <div className="sign-tabs"><button type="button" className={sigMode === 'draw' ? 'active' : ''} onClick={() => { setSigMode('draw'); setHasInk(false); }}>Draw</button><button type="button" className={sigMode === 'upload' ? 'active' : ''} onClick={() => setSigMode('upload')}>Upload</button></div>
          {sigMode === 'draw' ? <><canvas ref={drawCanvasRef} width="600" height="200" className="sign-canvas" onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onMouseLeave={endDraw} onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw}/><div className="sign-canvas-actions"><span>{hasInk ? 'Signature ready' : 'Sign in the box'}</span><button className="button secondary compact" onClick={clearInk} disabled={!hasInk}>Clear</button></div><button className="button primary compact sign-apply" onClick={applyDrawn} disabled={!hasInk}>{sigDataUrl ? 'Update signature' : 'Place on document'}</button></> : <><label className="sign-upload"><input type="file" accept="image/png,image/jpeg" onChange={onUpload}/><span>{sigDataUrl ? 'Choose a different image' : 'Choose a signature image (PNG or JPG)'}</span></label><p className="sign-hint">A transparent PNG works best, but a photo of a signature also works.</p></>}
          <label className="textarea-label sign-text">Typed line <span>optional</span><input value={signedText} onChange={event => setSignedText(event.target.value)} placeholder="e.g. Jane Smith · 4 July 2026"/></label>
        </div>
      </div>
      <button className="button primary pdf-action" onClick={sign} disabled={busy || rendering}>{busy ? 'Signing PDF…' : 'Sign & download'}</button>
    </>}
    {error && <p className="pdf-error">{error}</p>}
    {result && <div className="pdf-result"><div><strong>Signed PDF ready</strong><span>{formatBytes(result.size)}</span></div><a className="button primary compact" href={result.url} download={result.name}>Download PDF</a></div>}
    <p className="tool-footnote">Place your signature exactly where you want it on the page you are viewing. Rotated pages may position differently. For legally binding e-signatures, use a dedicated service with audit trails.</p></>;
}

function TextToSpeechTool() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [text, setText] = useState('Hello! This text will be read aloud by your browser voice.');
  const [voices, setVoices] = useState([]), [voiceName, setVoiceName] = useState('');
  const [rate, setRate] = useState(1), [pitch, setPitch] = useState(1), [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    if (!supported) return;
    const load = () => { const list = window.speechSynthesis.getVoices(); setVoices(list); setVoiceName(current => current || list.find(voice => voice.default)?.name || list[0]?.name || ''); };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => { window.speechSynthesis.removeEventListener('voiceschanged', load); window.speechSynthesis.cancel(); };
  }, [supported]);
  const speak = () => {
    if (!text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = voices.find(item => item.name === voiceName);
    if (voice) utterance.voice = voice;
    utterance.rate = rate; utterance.pitch = pitch;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true); window.speechSynthesis.speak(utterance);
  };
  const stop = () => { window.speechSynthesis.cancel(); setSpeaking(false); };
  if (!supported) return <p className="pdf-error">Your browser does not support speech synthesis.</p>;
  return <><label className="textarea-label">Text to read<textarea value={text} onChange={event => setText(event.target.value)} rows="6" placeholder="Type or paste text to read aloud…"/></label>
    <div className="tts-controls"><label>Voice<select value={voiceName} onChange={event => setVoiceName(event.target.value)}>{voices.length ? voices.map(voice => <option key={voice.name} value={voice.name}>{voice.name} ({voice.lang})</option>) : <option>Loading voices…</option>}</select></label><label>Speed <strong>{rate.toFixed(1)}×</strong><input type="range" min="0.5" max="2" step="0.1" value={rate} onChange={event => setRate(Number(event.target.value))}/></label><label>Pitch <strong>{pitch.toFixed(1)}</strong><input type="range" min="0" max="2" step="0.1" value={pitch} onChange={event => setPitch(Number(event.target.value))}/></label></div>
    <div className="tts-actions"><button className="button primary" onClick={speak} disabled={!text.trim()}><Icon name="spark"/> {speaking ? 'Restart' : 'Read aloud'}</button><button className="button secondary" onClick={stop} disabled={!speaking}>Stop</button></div>
    <p className="tool-footnote">Uses the voices installed on your device. Availability and quality vary by browser and operating system.</p></>;
}

function AudioRecorderTool() {
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof window !== 'undefined' && 'MediaRecorder' in window;
  const [recording, setRecording] = useState(false), [audioUrl, setAudioUrl] = useState(''), [seconds, setSeconds] = useState(0), [error, setError] = useState(''), [maxMinutes, setMaxMinutes] = useState(5);
  const recorderRef = useRef(null), chunksRef = useRef([]), streamRef = useRef(null), timerRef = useRef(null);
  const cleanup = () => { clearInterval(timerRef.current); streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; };
  useEffect(() => () => { cleanup(); if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  const stop = () => { if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop(); clearInterval(timerRef.current); setRecording(false); };
  const start = async () => {
    setError('');
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(''); }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => { const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }); setAudioUrl(URL.createObjectURL(blob)); cleanup(); };
      recorderRef.current = recorder; recorder.start();
      setRecording(true); setSeconds(0);
      const cap = maxMinutes * 60;
      timerRef.current = setInterval(() => setSeconds(prev => { const next = prev + 1; if (next >= cap) stop(); return next; }), 1000);
    } catch (err) { setError(err.name === 'NotAllowedError' ? 'Microphone permission was denied.' : 'Could not access the microphone.'); }
  };
  const clock = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  if (!supported) return <p className="pdf-error">Your browser does not support audio recording.</p>;
  return <><div className="recorder-stage"><div className={`recorder-dot ${recording ? 'live' : ''}`}/><strong>{clock(seconds)}</strong><span>{recording ? `Recording… auto-stops at ${maxMinutes}:00` : 'Ready to record'}</span></div>
    <div className="recorder-options"><label>Max length<select value={maxMinutes} onChange={event => setMaxMinutes(Number(event.target.value))} disabled={recording}><option value="1">1 minute</option><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="30">30 minutes</option></select></label>{!recording ? <button className="button primary" onClick={start}>Start recording</button> : <button className="button primary recorder-stop" onClick={stop}>Stop recording</button>}</div>
    {error && <p className="pdf-error">{error}</p>}
    {audioUrl && !recording && <div className="recorder-result"><audio controls src={audioUrl}/><a className="button primary compact" href={audioUrl} download="recording.webm">Download audio</a></div>}
    <p className="tool-footnote">Recording happens entirely in your browser and is never uploaded. Format is WebM, playable in most modern apps.</p></>;
}

function LocationTool() {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const [status, setStatus] = useState('idle'), [coords, setCoords] = useState(null), [error, setError] = useState(''), [copied, setCopied] = useState(false);
  const locate = () => {
    setStatus('locating'); setError(''); setCopied(false);
    navigator.geolocation.getCurrentPosition(
      position => { setCoords({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy }); setStatus('done'); },
      err => { setError(err.code === 1 ? 'Location permission was denied.' : 'Could not determine your location. Try again outdoors or with GPS enabled.'); setStatus('error'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  const copy = async () => { if (!coords) return; await navigator.clipboard?.writeText(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`); setCopied(true); };
  if (!supported) return <p className="pdf-error">Your browser does not support geolocation.</p>;
  return <><button className="button primary status-button" onClick={locate} disabled={status === 'locating'}>{status === 'locating' ? 'Locating…' : coords ? 'Update my location' : 'Find my location'}</button>
    {error && <p className="pdf-error">{error}</p>}
    {coords && <><div className="location-grid"><div><span>Latitude</span><strong>{coords.lat.toFixed(6)}</strong></div><div><span>Longitude</span><strong>{coords.lng.toFixed(6)}</strong></div><div><span>Accuracy</span><strong>±{Math.round(coords.accuracy)} m</strong></div></div><div className="location-actions"><button className="button secondary compact" onClick={copy}><Icon name={copied ? 'check' : 'copy'} size={18}/> {copied ? 'Copied' : 'Copy coordinates'}</button><a className="button primary compact" href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=16/${coords.lat}/${coords.lng}`} target="_blank" rel="noreferrer noopener">View on map</a></div></>}
    <p className="tool-footnote">Coordinates come from your device and stay in your browser. Accuracy depends on GPS, Wi-Fi, and your hardware.</p></>;
}

function SystemInfoTool() {
  const [ip, setIp] = useState('Loading…');
  useEffect(() => {
    let active = true;
    fetch('https://api.ipify.org?format=json').then(response => response.json()).then(data => { if (active) setIp(data.ip); }).catch(() => { if (active) setIp('Unavailable'); });
    return () => { active = false; };
  }, []);
  const info = useMemo(() => {
    const nav = typeof navigator !== 'undefined' ? navigator : {}, agent = nav.userAgent || '';
    const browser = /Edg\//.test(agent) ? 'Microsoft Edge' : /OPR\//.test(agent) ? 'Opera' : /Firefox\//.test(agent) ? 'Firefox' : /Chrome\//.test(agent) ? 'Chrome' : /Safari\//.test(agent) ? 'Safari' : 'Unknown';
    const os = /Windows/.test(agent) ? 'Windows' : /Mac OS X/.test(agent) ? 'macOS' : /Android/.test(agent) ? 'Android' : /(iPhone|iPad|iPod)/.test(agent) ? 'iOS' : /Linux/.test(agent) ? 'Linux' : 'Unknown';
    return {
      browser, os,
      language: nav.language || 'Unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
      screen: typeof window !== 'undefined' ? `${window.screen.width} × ${window.screen.height}` : 'Unknown',
      viewport: typeof window !== 'undefined' ? `${window.innerWidth} × ${window.innerHeight}` : 'Unknown',
      cores: nav.hardwareConcurrency ? `${nav.hardwareConcurrency} logical cores` : 'Unknown',
      connection: nav.onLine === false ? 'Offline' : 'Online',
    };
  }, []);
  const rows = [['Public IP', ip], ['Browser', info.browser], ['Operating system', info.os], ['Language', info.language], ['Time zone', info.timezone], ['Screen', info.screen], ['Window', info.viewport], ['CPU', info.cores], ['Network', info.connection]];
  return <><div className="sysinfo-grid">{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <p className="tool-footnote">Your public IP is fetched from ipify.org; everything else is read from your browser. Nothing here is stored or sent to us.</p></>;
}

function CameraTool() {
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const [active, setActive] = useState(false), [error, setError] = useState(''), [photos, setPhotos] = useState([]), [facingMode, setFacingMode] = useState('user');
  const videoRef = useRef(null), streamRef = useRef(null);
  const stopStream = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
  useEffect(() => () => { stopStream(); photos.forEach(p => URL.revokeObjectURL(p.url)); }, []);
  const start = async () => {
    setError('');
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; }
      setActive(true);
    } catch (err) { setError(err.name === 'NotAllowedError' ? 'Camera permission was denied.' : 'Could not access the camera.'); }
  };
  const stop = () => { stopStream(); setActive(false); };
  const switchCamera = async () => { const next = facingMode === 'user' ? 'environment' : 'user'; setFacingMode(next); if (active) { stopStream(); setActive(false); setTimeout(async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }); streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream; setActive(true); } catch (err) { setError('Could not switch camera.'); } }, 100); } };
  const snap = () => {
    const video = videoRef.current; if (!video) return;
    const canvas = window.document.createElement('canvas');
    canvas.width = video.videoWidth || 1280; canvas.height = video.videoHeight || 720;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => { if (!blob) return; const url = URL.createObjectURL(blob); const ts = new Date().toISOString().replace(/[:.]/g, '-'); setPhotos(prev => [...prev, { url, name: `photo-${ts}.jpg`, size: blob.size, selected: true }]); }, 'image/jpeg', 0.92);
  };
  const toggle = index => setPhotos(prev => prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p));
  const remove = index => { URL.revokeObjectURL(photos[index].url); setPhotos(prev => prev.filter((_, i) => i !== index)); };
  const selectAll = () => setPhotos(prev => prev.map(p => ({ ...p, selected: true })));
  const deselectAll = () => setPhotos(prev => prev.map(p => ({ ...p, selected: false })));
  const downloadSelected = () => { photos.filter(p => p.selected).forEach(p => { const a = window.document.createElement('a'); a.href = p.url; a.download = p.name; a.click(); }); };
  const selected = photos.filter(p => p.selected);
  if (!supported) return <p className="pdf-error">Your browser does not support camera access.</p>;
  return <>
    <div className="camera-controls">
      {!active ? <button className="button primary" onClick={start}>Open camera</button> : <><button className="button primary" onClick={snap}><Icon name="spark"/> Take photo</button><button className="button secondary" onClick={switchCamera}>Flip camera</button><button className="button secondary" onClick={stop}>Close camera</button></>}
    </div>
    {error && <p className="pdf-error">{error}</p>}
    {active && <div className="camera-viewfinder"><video ref={videoRef} autoPlay playsInline muted className="camera-video"/></div>}
    {photos.length > 0 && <>
      <div className="camera-bar"><span>{photos.length} photo{photos.length !== 1 ? 's' : ''} · {selected.length} selected</span><div><button className="button secondary compact" onClick={selectAll}>Select all</button><button className="button secondary compact" onClick={deselectAll}>Deselect all</button><button className="button primary compact" onClick={downloadSelected} disabled={selected.length === 0}>Download {selected.length > 0 ? selected.length : ''} selected</button></div></div>
      <div className="camera-grid">{photos.map((p, i) => <div key={p.url} className={`camera-thumb ${p.selected ? 'sel' : ''}`} onClick={() => toggle(i)}><img src={p.url} alt={`Photo ${i + 1}`}/><div className="camera-thumb-bar"><span>{formatBytes(p.size)}</span><a href={p.url} download={p.name} onClick={e => e.stopPropagation()} className="camera-dl">↓</a><button onClick={e => { e.stopPropagation(); remove(i); }} className="camera-del">×</button></div><div className="camera-check">{p.selected ? '✓' : ''}</div></div>)}</div>
    </>}
    <p className="tool-footnote">Photos are taken in your browser and never uploaded. Tap a photo to select or deselect it before downloading.</p></>;
}

function PercentageTool() {
  const [mode, setMode] = useState('of');
  const [a, setA] = useState('25'), [b, setB] = useState('200'), [c, setC] = useState('80'), [d, setD] = useState('100'), [e, setE] = useState('50'), [f, setF] = useState('75');
  const fmt = n => isFinite(n) ? (Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 4 })) : '—';
  const resultOf = useMemo(() => { const pct = parseFloat(a), num = parseFloat(b); return isFinite(pct) && isFinite(num) ? fmt((pct / 100) * num) : '—'; }, [a, b]);
  const resultIs = useMemo(() => { const num = parseFloat(c), total = parseFloat(d); return isFinite(num) && isFinite(total) && total !== 0 ? fmt((num / total) * 100) + '%' : '—'; }, [c, d]);
  const resultChange = useMemo(() => { const from = parseFloat(e), to = parseFloat(f); if (!isFinite(from) || !isFinite(to) || from === 0) return { value: '—', label: '' }; const pct = ((to - from) / Math.abs(from)) * 100; return { value: fmt(Math.abs(pct)) + '%', label: pct >= 0 ? 'increase' : 'decrease' }; }, [e, f]);
  return <>
    <div className="sign-tabs pct-tabs"><button type="button" className={mode==='of'?'active':''} onClick={()=>setMode('of')}>X% of Y</button><button type="button" className={mode==='is'?'active':''} onClick={()=>setMode('is')}>What % is X of Y</button><button type="button" className={mode==='change'?'active':''} onClick={()=>setMode('change')}>% Change</button></div>
    {mode === 'of' && <>
      <div className="calculator-form pct-form"><label>Percentage<div className="calc-input-wrap"><input type="number" value={a} onChange={e=>setA(e.target.value)} inputMode="decimal" placeholder="25"/><span>%</span></div></label><label>of number<input type="number" value={b} onChange={e=>setB(e.target.value)} inputMode="decimal" placeholder="200"/></label></div>
      <div className="pct-result"><span>Result</span><strong>{resultOf}</strong><p>{a}% of {b} = {resultOf}</p></div>
    </>
    }
    {mode === 'is' && <>
      <div className="calculator-form pct-form"><label>Number<input type="number" value={c} onChange={e=>setC(e.target.value)} inputMode="decimal" placeholder="80"/></label><label>out of<input type="number" value={d} onChange={e=>setD(e.target.value)} inputMode="decimal" placeholder="100"/></label></div>
      <div className="pct-result"><span>Result</span><strong>{resultIs}</strong><p>{c} is {resultIs} of {d}</p></div>
    </>
    }
    {mode === 'change' && <>
      <div className="calculator-form pct-form"><label>From<input type="number" value={e} onChange={ev=>setE(ev.target.value)} inputMode="decimal" placeholder="50"/></label><label>To<input type="number" value={f} onChange={ev=>setF(ev.target.value)} inputMode="decimal" placeholder="75"/></label></div>
      <div className="pct-result"><span>{resultChange.label || 'Change'}</span><strong>{resultChange.value}</strong><p>{e} → {f} is a {resultChange.value} {resultChange.label}</p></div>
    </>
    }
    <p className="tool-footnote">All calculations happen instantly in your browser.</p></>;
}

function UnitConverterTool() {
  const categories = {
    Length:      { units: ['mm','cm','m','km','in','ft','yd','mi'], toBase: { mm:0.001, cm:0.01, m:1, km:1000, in:0.0254, ft:0.3048, yd:0.9144, mi:1609.344 } },
    Weight:      { units: ['mg','g','kg','t','oz','lb','st'], toBase: { mg:0.000001, g:0.001, kg:1, t:1000, oz:0.0283495, lb:0.453592, st:6.35029 } },
    Temperature: { units: ['°C','°F','K'], toBase: null },
    Volume:      { units: ['ml','L','fl oz','cup','pt','qt','gal'], toBase: { ml:0.001, L:1, 'fl oz':0.0295735, cup:0.236588, pt:0.473176, qt:0.946353, gal:3.78541 } },
    Speed:       { units: ['m/s','km/h','mph','knots'], toBase: { 'm/s':1, 'km/h':1/3.6, mph:0.44704, knots:0.514444 } },
    Area:        { units: ['mm²','cm²','m²','km²','in²','ft²','acre','ha'], toBase: { 'mm²':0.000001, 'cm²':0.0001, 'm²':1, 'km²':1000000, 'in²':0.00064516, 'ft²':0.092903, acre:4046.86, ha:10000 } },
  };
  const catNames = Object.keys(categories);
  const [cat, setCat] = useState('Length');
  const { units } = categories[cat];
  const [fromUnit, setFromUnit] = useState(units[0]), [toUnit, setToUnit] = useState(units[4]);
  const [fromVal, setFromVal] = useState('1'), [toVal, setToVal] = useState('');
  const convertTemp = (val, from, to) => { let c; if (from==='°C') c=val; else if (from==='°F') c=(val-32)/1.8; else c=val-273.15; if (to==='°C') return c; if (to==='°F') return c*1.8+32; return c+273.15; };
  const convert = (val, from, to, cat) => { if (!isFinite(val)) return ''; if (cat==='Temperature') return convertTemp(val,from,to); const base = categories[cat].toBase; return val * base[from] / base[to]; };
  const fmt = n => { if (!isFinite(n)) return ''; const abs = Math.abs(n); if (abs === 0) return '0'; if (abs < 0.0001 || abs >= 1e9) return n.toExponential(4); return parseFloat(n.toPrecision(7)).toString(); };
  const onFromChange = val => { setFromVal(val); setToVal(fmt(convert(parseFloat(val), fromUnit, toUnit, cat))); };
  const onToChange = val => { setToVal(val); setFromVal(fmt(convert(parseFloat(val), toUnit, fromUnit, cat))); };
  const swap = () => { const newFrom = toUnit, newTo = fromUnit, newFromVal = toVal, newToVal = fromVal; setFromUnit(newFrom); setToUnit(newTo); setFromVal(newFromVal); setToVal(newToVal); };
  const onCatChange = next => { const u = categories[next].units; setCat(next); setFromUnit(u[0]); setToUnit(u[next==='Temperature'?1:4] || u[1]); setFromVal('1'); setToVal(fmt(convert(1, u[0], u[next==='Temperature'?1:4]||u[1], next))); };
  useEffect(() => { onFromChange(fromVal); }, [fromUnit, toUnit, cat]);
  return <>
    <div className="unit-cats">{catNames.map(n => <button key={n} type="button" className={cat===n?'active':''} onClick={()=>onCatChange(n)}>{n}</button>)}</div>
    <div className="unit-row">
      <div className="unit-field"><select value={fromUnit} onChange={e=>{setFromUnit(e.target.value);}} aria-label="From unit">{units.map(u=><option key={u}>{u}</option>)}</select><input type="number" value={fromVal} onChange={e=>onFromChange(e.target.value)} inputMode="decimal" placeholder="0" aria-label="Value to convert"/></div>
      <button className="unit-swap" onClick={swap} aria-label="Swap units">⇄</button>
      <div className="unit-field"><select value={toUnit} onChange={e=>{setToUnit(e.target.value);}} aria-label="To unit">{units.map(u=><option key={u}>{u}</option>)}</select><input type="number" value={toVal} onChange={e=>onToChange(e.target.value)} inputMode="decimal" placeholder="0" aria-label="Converted value"/></div>
    </div>
    <p className="unit-eq">{fromVal || '0'} {fromUnit} = <strong>{toVal || '0'} {toUnit}</strong></p>
    <p className="tool-footnote">Conversions use standard international values. Temperature converts exactly. All calculations run locally.</p></>;
}

function ScamCheckerTool() {
  const [sender, setSender] = useState(''), [body, setBody] = useState(''), [result, setResult] = useState(null);
  const freeProviders = ['gmail.com','yahoo.com','hotmail.com','outlook.com','live.com','aol.com','icloud.com','protonmail.com','mail.com','ymail.com','msn.com'];
  const urlShorteners = ['bit.ly','tinyurl.com','goo.gl','t.co','ow.ly','buff.ly','short.io','rebrand.ly','cutt.ly','rb.gy'];
  const patterns = [
    { id:'urgent',   label:'Urgency / pressure',          re:/\b(urgent|immediately|act now|within 24 hours|limited time|expires today|respond asap|last chance|time sensitive|final notice)\b/gi },
    { id:'prize',    label:'Prize / lottery / windfall',   re:/\b(you.ve? won|you are a winner|lottery|jackpot|prize|claim your|million dollars?|inheritance|next of kin|unclaimed funds?|beneficiary)\b/gi },
    { id:'money',    label:'Money / payment request',      re:/\b(wire transfer|western union|moneygram|bitcoin|crypto|gift card|itunes card|google play card|send money|transfer funds?|pay via)\b/gi },
    { id:'creds',    label:'Credential / info request',    re:/\b(verify your (account|identity|details)|confirm your (password|pin|ssn|bank account|credit card)|log ?in to confirm|suspended|account locked|unusual activity|security alert)\b/gi },
    { id:'impersonate',label:'Impersonation signals',      re:/\b(microsoft|apple|amazon|paypal|netflix|your bank|australian tax|ato|irs|hmrc|federal bureau|fbi|interpol|official notice|government department)\b/gi },
    { id:'secrecy',  label:'Secrecy / confidentiality',    re:/\b(keep (this |it )?confidential|do not (tell|share|discuss)|strictly private|top secret|for your eyes only)\b/gi },
    { id:'threat',   label:'Threat / fear tactic',         re:/\b(legal action|arrest warrant|court order|suspend your account|cancel your (service|subscription)|report you|law enforcement|your account will be (closed|terminated))\b/gi },
    { id:'grammar',  label:'Scam phrasing patterns',       re:/(\bkindly\b|\bdo the needful\b|\bdearest\b|\bbeloved\b|\bGod bless you\b|\bAllah\b.*\btransfer\b|\brespected sir\b|\bdear friend\b.*\bproposal\b)/gi },
  ];
  const analyse = () => {
    const text = `${sender} ${body}`;
    const flags = patterns.map(p => ({ ...p, hits: [...text.matchAll(p.re)].map(m => m[0].toLowerCase()) })).filter(p => p.hits.length > 0);
    const senderFlags = [];
    const s = sender.trim().toLowerCase();
    if (s) {
      const domain = (s.match(/@([\w.-]+)$/) || [])[1] || '';
      const local = s.split('@')[0] || '';
      if (freeProviders.includes(domain) && /\b(bank|ato|tax|gov|amazon|paypal|microsoft|apple|netflix|support|security|noreply|admin|service)\b/.test(s)) senderFlags.push('Free email provider (e.g. Gmail) pretending to be a company or service');
      if (/[a-z]{1,4}[0-9]{5,}|[0-9]{4,}[a-z]{1,4}/.test(local)) senderFlags.push('Username looks auto-generated (random letters and numbers)');
      if (domain && !/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) senderFlags.push('Sender domain looks malformed or unusual');
    }
    const urlFlags = [];
    const urls = [...body.matchAll(/https?:\/\/[^\s<>"']+/gi)].map(m => m[0]);
    urls.forEach(raw => { try { const host = new URL(raw).hostname.replace(/^www\./, ''); if (urlShorteners.includes(host)) urlFlags.push(`Shortened URL: ${raw.slice(0,55)}${raw.length>55?'…':''}`); if (/^\d{1,3}(\.\d{1,3}){3}/.test(host)) urlFlags.push(`IP address used as domain: ${host}`); } catch {} });
    const total = flags.length + senderFlags.length + urlFlags.length;
    const verdict = total === 0 ? 'safe' : total <= 2 ? 'suspicious' : 'scam';
    setResult({ flags, senderFlags, urlFlags, total, verdict });
  };
  const vm = { safe:{ label:'Looks safe', icon:'✅', col:'#08785f', bg:'#eaf9f4', bd:'#c6ebdf' }, suspicious:{ label:'Suspicious', icon:'⚠️', col:'#a05c00', bg:'#fff8ec', bd:'#f5d896' }, scam:{ label:'Likely a scam', icon:'🚨', col:'#b53e3e', bg:'#fff0f0', bd:'#f5b8b8' } };
  return <>
    <div className="scam-form">
      <label className="textarea-label">Sender email address <span>optional</span><input value={sender} onChange={e => setSender(e.target.value)} placeholder="e.g. noreply@amaz0n-support.com" type="text" autoComplete="off"/></label>
      <label className="textarea-label">Email body<textarea value={body} onChange={e => setBody(e.target.value)} rows="10" placeholder="Paste the email content here…"/></label>
    </div>
    <button className="button primary pdf-action" onClick={analyse} disabled={!body.trim()}>Check for scam signals</button>
    {result && <>
      <div className="scam-verdict" style={{ background: vm[result.verdict].bg, borderColor: vm[result.verdict].bd }}>
        <span style={{ color: vm[result.verdict].col }}>{vm[result.verdict].icon} {vm[result.verdict].label}</span>
        <p>{result.total === 0 ? 'No common scam patterns detected. Always stay cautious with unexpected emails.' : `${result.total} signal${result.total !== 1 ? 's' : ''} detected. ${result.verdict === 'scam' ? 'Do not click links, reply, or provide personal details.' : 'Proceed with caution and verify independently.'}`}</p>
      </div>
      {(result.flags.length + result.senderFlags.length + result.urlFlags.length) > 0 && <div className="scam-flags">
        {result.senderFlags.map((f, i) => <div key={i} className="scam-flag scam-sender"><span className="scam-tag">Sender</span><span>{f}</span></div>)}
        {result.urlFlags.map((f, i) => <div key={i} className="scam-flag scam-link"><span className="scam-tag">Link</span><span>{f}</span></div>)}
        {result.flags.map(f => <div key={f.id} className="scam-flag scam-body"><span className="scam-tag">{f.label}</span><span>{f.hits.slice(0,3).join(', ')}</span></div>)}
      </div>}
    </>
    }
    <p className="tool-footnote">Pattern matching only — not a substitute for professional security advice. Never click links or provide personal details to emails you are unsure about.</p></>;
}

function SeoCheckerTool() {
  const [url, setUrl] = useState('https://surrendasoft.com');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [result, setResult] = useState(null);
  const normalise = v => /^https?:\/\//i.test(v.trim()) ? v.trim() : `https://${v.trim()}`;
  const check = async () => {
    const target = normalise(url);
    setBusy(true); setError(''); setResult(null);
    try {
      const [mRes, dRes] = await Promise.all([
        fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(target)}&strategy=mobile`),
        fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(target)}&strategy=desktop`),
      ]);
      if (!mRes.ok) { const err = await mRes.json().catch(() => ({})); throw new Error(err?.error?.message || `PageSpeed API error ${mRes.status}. Make sure the URL is public.`); }
      const [mob, desk] = await Promise.all([mRes.json(), dRes.json()]);
      const lhr = mob.lighthouseResult, audits = lhr?.audits || {}, cats = lhr?.categories || {};
      const titleAudit = audits['document-title'], metaAudit = audits['meta-description'], imgAudit = audits['image-alt'], vpAudit = audits['viewport'];
      const titleText = titleAudit?.details?.items?.[0]?.snippet || (titleAudit?.score === 0 ? 'Missing' : '—');
      const metaText = metaAudit?.score === 1 ? (metaAudit?.details?.items?.[0]?.value?.slice(0,80) || 'Present') : 'Missing';
      const imgText = imgAudit?.score === 1 ? 'All images have alt text' : imgAudit?.details?.items?.length ? `Missing on ${imgAudit.details.items.length} image(s)` : 'Unknown';
      const vpText = vpAudit?.score === 1 ? 'Configured' : 'Missing or misconfigured';
      const mobScore = Math.round((cats?.performance?.score ?? 0) * 100);
      const deskScore = Math.round((desk.lighthouseResult?.categories?.performance?.score ?? 0) * 100);
      const seoScore = Math.round((cats?.seo?.score ?? 0) * 100);
      const a11yScore = Math.round((cats?.accessibility?.score ?? 0) * 100);
      const fcp = audits['first-contentful-paint']?.displayValue || '—';
      const lcp = audits['largest-contentful-paint']?.displayValue || '—';
      const tbt = audits['total-blocking-time']?.displayValue || '—';
      const cls = audits['cumulative-layout-shift']?.displayValue || '—';
      const opps = Object.values(audits).filter(a => a.score !== null && a.score < 0.9 && a.details?.type === 'opportunity').sort((a,b) => (b.details?.overallSavingsMs||0)-(a.details?.overallSavingsMs||0)).map(a => a.title).slice(0,5);
      const displayUrl = lhr?.finalDisplayedUrl || target;
      setResult({ displayUrl, titleText, metaText, imgText, vpText, mobScore, deskScore, seoScore, a11yScore, fcp, lcp, tbt, cls, opps, https: target.startsWith('https') });
    } catch (err) { setError(err.message || 'Could not fetch SEO data.'); }
    setBusy(false);
  };
  const tier = n => n >= 90 ? 'good' : n >= 50 ? 'ok' : 'poor';
  return <>
    <div className="status-input-row">
      <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && !busy && check()} placeholder="https://example.com" type="url" aria-label="Website URL to check"/>
      <button className="button primary" onClick={check} disabled={busy || !url.trim()}>{busy ? 'Checking…' : 'Check SEO'}</button>
    </div>
    {error && <p className="pdf-error">{error}</p>}
    {result && <>
      <p className="seo-url">{result.displayUrl}</p>
      <div className="seo-scores">
        <div className={`seo-score ${tier(result.mobScore)}`}><strong>{result.mobScore}</strong><span>Mobile speed</span></div>
        <div className={`seo-score ${tier(result.deskScore)}`}><strong>{result.deskScore}</strong><span>Desktop speed</span></div>
        <div className={`seo-score ${tier(result.seoScore)}`}><strong>{result.seoScore}</strong><span>SEO score</span></div>
        <div className={`seo-score ${tier(result.a11yScore)}`}><strong>{result.a11yScore}</strong><span>Accessibility</span></div>
      </div>
      <div className="seo-grid">
        <div><span>Title tag</span><strong title={result.titleText}>{result.titleText.length > 55 ? result.titleText.slice(0,55)+'…' : result.titleText}</strong></div>
        <div><span>Meta description</span><strong>{result.metaText.length > 80 ? result.metaText.slice(0,80)+'…' : result.metaText}</strong></div>
        <div><span>Image alt text</span><strong>{result.imgText}</strong></div>
        <div><span>Viewport meta</span><strong>{result.vpText}</strong></div>
        <div><span>HTTPS</span><strong>{result.https ? 'Yes ✓' : 'No — not secure'}</strong></div>
        <div><span>First Contentful Paint</span><strong>{result.fcp}</strong></div>
        <div><span>Largest Contentful Paint</span><strong>{result.lcp}</strong></div>
        <div><span>Total Blocking Time</span><strong>{result.tbt}</strong></div>
        <div><span>Layout Shift (CLS)</span><strong>{result.cls}</strong></div>
      </div>
      {result.opps.length > 0 && <div className="seo-opps"><strong>Top opportunities</strong><ul>{result.opps.map((o,i) => <li key={i}>{o}</li>)}</ul></div>}
    </>
    }
    <p className="tool-footnote">Powered by Google PageSpeed Insights (free, no API key). The site must be publicly accessible. Scores are out of 100 and may vary slightly between runs.</p></>;
}

function CalculatorTool() {
  const [display, setDisplay] = useState('0');
  const [expr, setExpr] = useState('');
  const [justEvaled, setJustEvaled] = useState(false);
  const press = key => {
    if (key === 'AC') { setDisplay('0'); setExpr(''); setJustEvaled(false); return; }
    if (key === '±') { setDisplay(d => d.startsWith('-') ? d.slice(1) : d === '0' ? '0' : '-' + d); return; }
    if (key === '%') { setDisplay(d => String(parseFloat(d) / 100)); return; }
    if (key === '=') {
      try {
        const full = expr + display;
        // Safe eval: only digits, operators, dot, parens
        if (!/^[\d.+\-*/()\s]+$/.test(full)) return;
        // eslint-disable-next-line no-new-func
        const res = Function('"use strict"; return (' + full + ')')();
        const out = isFinite(res) ? String(parseFloat(res.toFixed(10))) : 'Error';
        setDisplay(out); setExpr(''); setJustEvaled(true);
      } catch { setDisplay('Error'); setExpr(''); setJustEvaled(true); }
      return;
    }
    const isOp = ['+', '-', '×', '÷'].includes(key);
    const opChar = key === '×' ? '*' : key === '÷' ? '/' : key;
    if (isOp) {
      setExpr(display + opChar); setDisplay('0'); setJustEvaled(false); return;
    }
    if (justEvaled) { setDisplay(key === '.' ? '0.' : key); setJustEvaled(false); return; }
    if (key === '.' && display.includes('.')) return;
    setDisplay(d => d === '0' && key !== '.' ? key : d + key);
  };
  const rows = [['AC','±','%','÷'],['7','8','9','×'],['4','5','6','-'],['1','2','3','+'],[['0',2],'.',  '=']];
  return <div className="calc-wrap">
    <div className="calc-screen">
      <div className="calc-expr">{expr}</div>
      <div className="calc-display">{display.length > 12 ? parseFloat(parseFloat(display).toPrecision(9)).toString() : display}</div>
    </div>
    <div className="calc-keys">
      {rows.map((row, ri) => <div key={ri} className="calc-row">
        {row.map((k, ki) => {
          const [key, span] = Array.isArray(k) ? k : [k, 1];
          const isOp = ['÷','×','-','+','='].includes(key);
          const isFn = ['AC','±','%'].includes(key);
          return <button key={ki} onClick={() => press(key)} className={`calc-key${isOp?' calc-op':''}${isFn?' calc-fn':''}${key==='='?' calc-eq':''}`} style={span>1?{gridColumn:`span ${span}`}:{}}>{key}</button>;
        })}
      </div>)}
    </div>
  </div>;
}

function UtcConverterTool() {
  const toLocalInput = d => { const p = n => String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const toUtcInput = d => { const p = n => String(n).padStart(2,'0'); return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`; };
  const [local, setLocal] = useState(() => toLocalInput(new Date()));
  const [utcVal, setUtcVal] = useState(() => toUtcInput(new Date()));
  const [fromLocal, setFromLocal] = useState(true);
  const now = () => { const d = new Date(); setLocal(toLocalInput(d)); setUtcVal(toUtcInput(d)); setFromLocal(true); };
  const onLocalChange = v => { setLocal(v); setFromLocal(true); const d = new Date(v); if (!isNaN(d)) setUtcVal(toUtcInput(d)); };
  const onUtcChange = v => { setUtcVal(v); setFromLocal(false); const d = new Date(v + 'Z'); if (!isNaN(d)) setLocal(toLocalInput(d)); };
  const d = fromLocal ? new Date(local) : new Date(utcVal + 'Z');
  const valid = !isNaN(d);
  const unix = valid ? Math.floor(d.getTime() / 1000) : null;
  const iso = valid ? d.toISOString() : null;
  const offset = -new Date().getTimezoneOffset();
  const offsetStr = `UTC${offset >= 0 ? '+' : ''}${Math.floor(offset/60)}:${String(Math.abs(offset%60)).padStart(2,'0')}`;
  const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return <>
    <div className="utc-grid">
      <div className="utc-field"><label>Local time <span className="utc-tz">{tzName} ({offsetStr})</span><input type="datetime-local" value={local} onChange={e => onLocalChange(e.target.value)}/></label></div>
      <div className="utc-eq">⇄</div>
      <div className="utc-field"><label>UTC<input type="datetime-local" value={utcVal} onChange={e => onUtcChange(e.target.value)}/></label></div>
    </div>
    <button className="button secondary" style={{marginBottom:16}} onClick={now}>Use current time</button>
    {valid && <div className="utc-results">
      <div><span>Unix timestamp</span><strong>{unix}</strong></div>
      <div><span>ISO 8601</span><strong style={{fontSize:13}}>{iso}</strong></div>
      <div><span>UTC offset</span><strong>{offsetStr}</strong></div>
      <div><span>UTC date</span><strong>{d.toUTCString()}</strong></div>
    </div>}
    <p className="tool-footnote">Conversions use your device’s local timezone. Unix timestamp is seconds since 1970-01-01T00:00:00Z.</p></>;
}

function TimeZoneConverterTool() {
  const ZONES = [
    { label: 'UTC',              tz: 'UTC' },
    { label: 'London',           tz: 'Europe/London' },
    { label: 'Paris / Berlin',   tz: 'Europe/Paris' },
    { label: 'Dubai',            tz: 'Asia/Dubai' },
    { label: 'Mumbai',           tz: 'Asia/Kolkata' },
    { label: 'Singapore',        tz: 'Asia/Singapore' },
    { label: 'Tokyo',            tz: 'Asia/Tokyo' },
    { label: 'Shanghai',         tz: 'Asia/Shanghai' },
    { label: 'Sydney',           tz: 'Australia/Sydney' },
    { label: 'Auckland',         tz: 'Pacific/Auckland' },
    { label: 'New York',         tz: 'America/New_York' },
    { label: 'Chicago',          tz: 'America/Chicago' },
    { label: 'Denver',           tz: 'America/Denver' },
    { label: 'Los Angeles',      tz: 'America/Los_Angeles' },
    { label: 'São Paulo',        tz: 'America/Sao_Paulo' },
    { label: 'Honolulu',         tz: 'Pacific/Honolulu' },
  ];
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [srcTz, setSrcTz] = useState(localTz);
  const toInput = d => { const p = n => String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const [input, setInput] = useState(() => toInput(new Date()));
  const fmt = (date, tz) => { try { return new Intl.DateTimeFormat('en-AU', { timeZone: tz, weekday:'short', day:'numeric', month:'short', hour:'numeric', minute:'2-digit', hour12:true, timeZoneName:'short' }).format(date); } catch { return '—'; } };
  const getOffset = tz => { try { const s = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName'); return s?.value || ''; } catch { return ''; } };
  const srcDate = useMemo(() => { if (!input) return null; try { return new Date(new Intl.DateTimeFormat('en-CA', { timeZone: srcTz, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).format(new Date(input)).replace(/,/,'').replace(/\//g,'-').replace(' ','T') + '+00:00'); } catch { return null; } }, [input, srcTz]);
  // simpler approach: treat datetime-local as src timezone by computing offset
  const convert = useMemo(() => {
    if (!input) return null;
    // Build a Date by interpreting the input as being in srcTz
    const naive = new Date(input); // treat as local; we'll offset
    const localOffset = naive.getTimezoneOffset(); // minutes behind UTC
    const srcOffsetMs = (() => { try { const now = naive; const utcStr = new Intl.DateTimeFormat('en-CA', { timeZone: srcTz, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).format(now); const interpreted = new Date(utcStr.replace(/\//g,'-').replace(', ','T')); return now - interpreted; } catch { return 0; } })();
    const utcMs = naive.getTime() + naive.getTimezoneOffset() * 60000 + srcOffsetMs;
    return new Date(utcMs);
  }, [input, srcTz]);
  const allZones = ZONES.some(z => z.tz === srcTz) ? ZONES : [{ label: 'Source', tz: srcTz }, ...ZONES];
  return <>
    <div className="tz-controls">
      <label className="tz-label">Date &amp; time<input type="datetime-local" value={input} onChange={e => setInput(e.target.value)}/></label>
      <label className="tz-label">Source timezone
        <select value={srcTz} onChange={e => setSrcTz(e.target.value)}>
          {[...new Set([localTz, ...ZONES.map(z => z.tz)])].map(tz => <option key={tz} value={tz}>{tz.replace(/_/g,' ')}</option>)}
        </select>
      </label>
      <button className="button secondary" onClick={() => { setInput(toInput(new Date())); setSrcTz(localTz); }}>Now</button>
    </div>
    {convert && <div className="tz-results">
      {allZones.map(z => {
        const isSrc = z.tz === srcTz;
        return <div key={z.tz} className={`tz-row${isSrc ? ' tz-src' : ''}`}>
          <span className="tz-city">{z.label}</span>
          <span className="tz-offset">{getOffset(z.tz)}</span>
          <strong className="tz-time">{fmt(convert, z.tz)}</strong>
        </div>;
      })}
    </div>}
    <p className="tool-footnote">Uses your browser’s built-in timezone database. Daylight saving is applied automatically.</p></>;
}

function QrCodeTool() {
  const [text, setText] = useState('https://surrendasoft.com');
  const [size, setSize] = useState(300);
  const [margin, setMargin] = useState(2);
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !text.trim()) return;
    QRCode.toCanvas(canvasRef.current, text.trim(), { width: size, margin }, err => { if (err) console.error(err); });
  }, [text, size, margin]);
  const download = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };
  return <>
    <div className="qr-layout">
      <div className="qr-controls">
        <label className="textarea-label">Content (URL, text, phone, email…)<textarea value={text} onChange={e => setText(e.target.value)} rows="5" placeholder="https://example.com"/></label>
        <div className="qr-options">
          <label>Size<select value={size} onChange={e => setSize(Number(e.target.value))}><option value={200}>Small (200px)</option><option value={300}>Medium (300px)</option><option value={400}>Large (400px)</option><option value={600}>XL (600px)</option></select></label>
          <label>Quiet zone<select value={margin} onChange={e => setMargin(Number(e.target.value))}><option value={1}>Minimal</option><option value={2}>Normal</option><option value={4}>Wide</option></select></label>
        </div>
        <button className="button primary" onClick={download} disabled={!text.trim()}>Download PNG</button>
      </div>
      <div className="qr-preview">
        {text.trim() ? <canvas ref={canvasRef}/> : <div className="qr-empty">Enter content to generate</div>}
      </div>
    </div>
    <p className="tool-footnote">QR codes are generated entirely in your browser. Nothing is sent to any server.</p></>;
}

function BgRemoverTool() {
  const [imgUrl, setImgUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [tolerance, setTolerance] = useState(35);
  const [busy, setBusy] = useState(false);
  const [pickMode, setPickMode] = useState(false);
  const [pickedColor, setPickedColor] = useState(null);
  const canvasRef = useRef(null);
  const imgObjRef = useRef(null);

  const loadFile = file => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgObjRef.current = img;
      if (!canvasRef.current) return;
      const MAX = 1200, scale = Math.min(1, MAX / Math.max(img.width, img.height));
      canvasRef.current.width = Math.round(img.width * scale);
      canvasRef.current.height = Math.round(img.height * scale);
      canvasRef.current.getContext('2d').drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
    };
    img.src = url;
    setImgUrl(url); setResultUrl(null); setPickedColor(null); setPickMode(false);
  };

  const colorDist = (a, b) => Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);

  const remove = () => {
    if (!canvasRef.current || !imgObjRef.current) return;
    setBusy(true);
    const canvas = canvasRef.current;
    canvas.getContext('2d').drawImage(imgObjRef.current, 0, 0, canvas.width, canvas.height);
    setTimeout(() => {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data, width, height } = imageData;
      const topLeft = [data[0], data[1], data[2]];
      const seed = pickedColor || topLeft;
      const visited = new Uint8Array(width * height);
      const queue = [];
      for (let x = 0; x < width; x++) { queue.push(x); queue.push((height-1)*width+x); }
      for (let y = 1; y < height-1; y++) { queue.push(y*width); queue.push(y*width+width-1); }
      while (queue.length) {
        const idx = queue.pop();
        if (visited[idx]) continue;
        visited[idx] = 1;
        const i = idx * 4;
        if (colorDist([data[i], data[i+1], data[i+2]], seed) > tolerance) continue;
        data[i+3] = 0;
        const x = idx % width, y = Math.floor(idx / width);
        if (x > 0) queue.push(idx-1);
        if (x < width-1) queue.push(idx+1);
        if (y > 0) queue.push(idx-width);
        if (y < height-1) queue.push(idx+width);
      }
      const out = document.createElement('canvas');
      out.width = width; out.height = height;
      out.getContext('2d').putImageData(imageData, 0, 0);
      setResultUrl(out.toDataURL('image/png'));
      ctx.drawImage(imgObjRef.current, 0, 0, canvas.width, canvas.height);
      setBusy(false);
    }, 20);
  };

  const handleCanvasClick = e => {
    if (!pickMode || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = canvasRef.current.width / rect.width, sy = canvasRef.current.height / rect.height;
    const x = Math.min(Math.round((e.clientX - rect.left) * sx), canvasRef.current.width - 1);
    const y = Math.min(Math.round((e.clientY - rect.top) * sy), canvasRef.current.height - 1);
    const p = canvasRef.current.getContext('2d').getImageData(x, y, 1, 1).data;
    setPickedColor([p[0], p[1], p[2]]); setPickMode(false);
  };

  const dl = () => { const a = document.createElement('a'); a.download = 'no-bg.png'; a.href = resultUrl; a.click(); };

  return <>
    {!imgUrl
      ? <label className="bgr-upload-zone"><input type="file" accept="image/*" style={{display:'none'}} onChange={e => e.target.files[0] && loadFile(e.target.files[0])}/><div className="bgr-drop" onDrop={e=>{e.preventDefault(); e.dataTransfer.files[0]&&loadFile(e.dataTransfer.files[0]);}} onDragOver={e=>e.preventDefault()}><span style={{fontSize:40}}>🖼️</span><p>Drop an image or <u>browse</u></p><small>Works best on plain or solid-colour backgrounds</small></div></label>
      : <>
          <div className="bgr-layout">
            <div className="bgr-panel">
              <div className="bgr-panel-head"><strong>Original</strong>
                <span style={{display:'flex',alignItems:'center',gap:6}}>
                  {pickedColor && <span className="bgr-swatch" style={{background:`rgb(${pickedColor.join(',')})`}} title={`Picked: rgb(${pickedColor.join(',')})`}/>}
                  <button className={`button secondary${pickMode?' bgr-pick-on':''}`} onClick={()=>setPickMode(m=>!m)} style={{padding:'6px 10px',fontSize:12}}>{pickMode?'Click image…':'🎯 Pick colour'}</button>
                </span>
              </div>
              <canvas ref={canvasRef} onClick={handleCanvasClick} className={`bgr-canvas${pickMode?' bgr-crosshair':''}`}/>
            </div>
            {resultUrl && <div className="bgr-panel">
              <div className="bgr-panel-head"><strong>Result</strong><button className="button primary" onClick={dl} style={{padding:'6px 12px',fontSize:12}}>Download PNG</button></div>
              <div className="bgr-result-wrap"><img src={resultUrl} alt="Background removed" className="bgr-canvas"/></div>
            </div>}
          </div>
          <div className="bgr-controls">
            <label className="bgr-tol">Tolerance <b>{tolerance}</b><input type="range" min="5" max="120" value={tolerance} onChange={e=>setTolerance(Number(e.target.value))}/></label>
            <button className="button primary" onClick={remove} disabled={busy}>{busy?'Removing…':'Remove background'}</button>
            <button className="button secondary" onClick={()=>{setImgUrl(null);setResultUrl(null);setPickedColor(null);}}>New image</button>
          </div>
        </>
    }
    <p className="tool-footnote">Edge flood-fill removal — no AI, no upload. Works best on plain backgrounds. Raise tolerance for gradients; lower it to keep fine edges. Download is a transparent PNG.</p></>;
}

const FV_TEXT_EXTS = new Set(['txt','md','csv','json','xml','yaml','yml','toml','ini','cfg','log',
  'js','ts','jsx','tsx','mjs','cjs','py','css','html','htm','sh','bash','zsh','rb','php',
  'java','c','cpp','h','go','rs','swift','kt','sql','graphql','env','gitignore','nvmrc',
  'editorconfig','prettierrc','eslintrc','babelrc','dockerfile','makefile','ics']);

const icsDateBadge = str => {
  if (!str) return { day: '?', mon: '', weekday: '' };
  try {
    const d = new Date(`${str.slice(0,4)}-${str.slice(4,6)}-${str.slice(6,8)}`);
    if (isNaN(d)) return { day: '?', mon: '', weekday: '' };
    return { day: d.getDate(), mon: d.toLocaleDateString('en-AU',{month:'short'}).toUpperCase(), weekday: d.toLocaleDateString('en-AU',{weekday:'short'}) };
  } catch { return { day: '?', mon: '', weekday: '' }; }
};

const fmtIcsDate = str => {
  if (!str) return '';
  const isAllDay = str.length === 8;
  const clean = str.replace(/Z$/, '');
  try {
    if (isAllDay) return new Date(`${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}`).toLocaleDateString('en-AU', {weekday:'short',day:'numeric',month:'long',year:'numeric'});
    const dt = `${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}T${clean.slice(9,11)}:${clean.slice(11,13)}:${clean.slice(13,15)}${str.endsWith('Z')?'Z':''}`;
    const d = new Date(dt);
    return isNaN(d) ? str : d.toLocaleString('en-AU', {weekday:'short',day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});
  } catch { return str; }
};

const parseIcs = text => {
  const events = [];
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = unfolded.split('BEGIN:VEVENT');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0];
    const props = {};
    for (const line of block.split('\n')) {
      const colon = line.indexOf(':');
      if (colon < 0) continue;
      const key = line.slice(0, colon).split(';')[0].toUpperCase().trim();
      const val = line.slice(colon + 1).trim();
      if (key && val) props[key] = val;
    }
    if (props.SUMMARY || props.DTSTART) events.push(props);
  }
  // sort by DTSTART
  events.sort((a, b) => (a.DTSTART || '').localeCompare(b.DTSTART || ''));
  return events;
};

function FileViewerTool() {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null); // image|audio|video|pdf|text|binary
  const [objUrl, setObjUrl] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [edited, setEdited] = useState(false);
  const [hexBytes, setHexBytes] = useState(null);
  const [view, setView] = useState('raw'); // raw|table|preview
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');

  const getExt = name => name.includes('.') ? name.split('.').pop().toLowerCase() : '';

  const detect = f => {
    const ext = getExt(f.name), mime = f.type || '';
    if (mime.startsWith('image/') || ['jpg','jpeg','png','gif','webp','bmp','svg','ico','avif'].includes(ext)) return 'image';
    if (mime.startsWith('audio/') || ['mp3','wav','ogg','flac','aac','m4a','opus'].includes(ext)) return 'audio';
    if (mime.startsWith('video/') || ['mp4','webm','mov','avi','mkv','m4v'].includes(ext)) return 'video';
    if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (mime.startsWith('text/') || FV_TEXT_EXTS.has(ext)) return 'text';
    return 'unknown';
  };

  const reset = () => {
    if (objUrl) URL.revokeObjectURL(objUrl);
    setFile(null); setFileType(null); setObjUrl(null); setTextContent('');
    setEdited(false); setHexBytes(null); setView('raw'); setErr('');
  };

  const load = async f => {
    if (objUrl) URL.revokeObjectURL(objUrl);
    const initView = getExt(f.name) === 'ics' ? 'calendar' : 'raw';
    setFile(f); setErr(''); setEdited(false); setHexBytes(null); setCopied(false); setView(initView);
    const type = detect(f);
    if (['image','audio','video','pdf'].includes(type)) {
      setFileType(type); setObjUrl(URL.createObjectURL(f)); return;
    }
    try {
      const text = await f.text();
      if (text.includes('\x00')) throw new Error('binary');
      const ext = getExt(f.name);
      let display = text;
      if (ext === 'json') { try { display = JSON.stringify(JSON.parse(text), null, 2); } catch {} }
      setFileType('text'); setTextContent(display); setObjUrl(null);
    } catch {
      setFileType('binary');
      try { const buf = await f.arrayBuffer(); setHexBytes(new Uint8Array(buf.slice(0, 512))); }
      catch { setErr('Could not read file contents.'); }
    }
  };

  const ext = file ? getExt(file.name) : '';
  const lineCount = useMemo(() => textContent ? textContent.split('\n').length : 0, [textContent]);

  const icsEvents = useMemo(() => ext === 'ics' && textContent ? parseIcs(textContent) : null, [ext, textContent]);

  const csvRows = useMemo(() => {
    if (ext !== 'csv' || !textContent) return null;
    return textContent.trim().split('\n').map(row => {
      const cells = []; let cell = '', inQ = false;
      for (const ch of row) {
        if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { cells.push(cell); cell = ''; }
        else cell += ch;
      }
      cells.push(cell); return cells;
    });
  }, [ext, textContent]);

  const hexRows = useMemo(() => {
    if (!hexBytes) return [];
    const rows = [];
    for (let i = 0; i < hexBytes.length; i += 16) {
      const chunk = hexBytes.slice(i, i + 16);
      rows.push({
        off: i.toString(16).padStart(8, '0'),
        hex: Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ').padEnd(47, ' '),
        asc: Array.from(chunk).map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : '\u00b7').join(''),
      });
    }
    return rows;
  }, [hexBytes]);

  const download = () => {
    const blob = new Blob([textContent], { type: file?.type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copyAll = async () => {
    try { await navigator.clipboard.writeText(textContent); } catch {}
    setCopied(true); setTimeout(() => setCopied(false), 1400);
  };

  const formatJson = () => {
    try { setTextContent(JSON.stringify(JSON.parse(textContent), null, 2)); setEdited(true); setErr(''); }
    catch { setErr('Invalid JSON — cannot format.'); }
  };

  if (!file) return <label className="bgr-upload-zone">
    <input type="file" style={{display:'none'}} onChange={e => e.target.files[0] && load(e.target.files[0])}/>
    <div className="bgr-drop" onDrop={e=>{e.preventDefault();e.dataTransfer.files[0]&&load(e.dataTransfer.files[0]);}} onDragOver={e=>e.preventDefault()}>
      <span style={{fontSize:40}}>📂</span>
      <p>Drop any file or <u>browse</u></p>
      <small>Text, code, JSON, CSV, HTML, ICS calendar, images, audio, video, PDF — or binary hex dump</small>
    </div>
  </label>;

  const btnOn = { background:'#10183e', color:'#fff', borderColor:'#10183e' };

  return <>
    <div className="fv-bar">
      <div className="fv-meta">
        <span className="fv-ext">{(ext || '?').toUpperCase()}</span>
        <strong className="fv-name">{file.name}</strong>
        <span className="fv-dim">{formatBytes(file.size)}</span>
        {fileType === 'text' && <span className="fv-dim">{lineCount} line{lineCount !== 1 ? 's' : ''}</span>}
        {edited && <span className="fv-changed">&#9679; edited</span>}
      </div>
      <div className="fv-acts">
        {ext === 'csv' && <button className="button secondary" style={view==='table'?btnOn:{}} onClick={()=>setView(v=>v==='table'?'raw':'table')}>Table view</button>}
        {ext === 'ics' && <button className="button secondary" style={view==='calendar'?btnOn:{}} onClick={()=>setView(v=>v==='calendar'?'raw':'calendar')}>Calendar</button>}
        {(ext === 'html' || ext === 'htm') && <button className="button secondary" style={view==='preview'?btnOn:{}} onClick={()=>setView(v=>v==='preview'?'raw':'preview')}>Preview</button>}
        {ext === 'json' && <button className="button secondary" onClick={formatJson}>Format JSON</button>}
        {fileType === 'text' && <button className="button secondary" onClick={copyAll}><Icon name={copied?'check':'copy'} size={15}/>{copied?' Copied':' Copy all'}</button>}
        {fileType === 'text' && <button className="button primary" onClick={download}>Download{edited?' *':''}</button>}
        <button className="button secondary" onClick={reset}>New file</button>
      </div>
    </div>
    {err && <p className="pdf-error" style={{marginBottom:12}}>{err}</p>}
    {fileType === 'image' && <div className="fv-img-wrap"><img src={objUrl} alt={file.name}/></div>}
    {fileType === 'audio' && <div className="fv-media-wrap"><audio controls src={objUrl}/></div>}
    {fileType === 'video' && <div className="fv-media-wrap"><video controls src={objUrl}/></div>}
    {fileType === 'pdf' && <div className="fv-pdf-wrap"><iframe src={objUrl} title={file.name}/></div>}
    {fileType === 'text' && view === 'raw' && <textarea className="fv-textarea" value={textContent} onChange={e=>{setTextContent(e.target.value);setEdited(true);}} spellCheck={false} aria-label="File contents — editable"/>}
    {fileType === 'text' && view === 'table' && csvRows && <div className="fv-table-wrap"><table className="fv-table"><thead><tr>{csvRows[0]?.map((h,i)=><th key={i}>{h||`Col ${i+1}`}</th>)}</tr></thead><tbody>{csvRows.slice(1).map((row,r)=><tr key={r}>{row.map((cell,c)=><td key={c}>{cell}</td>)}</tr>)}</tbody></table></div>}
    {fileType === 'text' && view === 'preview' && <iframe sandbox="allow-scripts" srcDoc={textContent} title="HTML preview" className="fv-preview-frame"/>}
    {fileType === 'text' && view === 'calendar' && icsEvents && <div className="fv-cal">
      {icsEvents.length === 0
        ? <p className="fv-cal-empty">No events found in this calendar file.</p>
        : icsEvents.map((ev, i) => {
            const badge = icsDateBadge(ev.DTSTART);
            const allDay = ev.DTSTART && ev.DTSTART.length === 8;
            return <div key={i} className="fv-cal-event">
              <div className="fv-cal-badge"><span className="fv-cal-badge-day">{badge.day}</span><span className="fv-cal-badge-mon">{badge.mon}</span></div>
              <div className="fv-cal-body">
                <div className="fv-cal-title">{ev.SUMMARY || '(No title)'}</div>
                {ev.DTSTART && <div className="fv-cal-time">{allDay ? `${badge.weekday} · All day` : `${badge.weekday} · ${fmtIcsDate(ev.DTSTART)}${ev.DTEND && ev.DTEND !== ev.DTSTART ? ' → '+fmtIcsDate(ev.DTEND) : ''}`}</div>}
                <div className="fv-cal-meta">
                  {ev.LOCATION && <span>&#128205; {ev.LOCATION}</span>}
                  {ev.STATUS && ev.STATUS !== 'CONFIRMED' && <span>{ev.STATUS}</span>}
                  {ev.RRULE && <span>&#128257; Repeating</span>}
                  {ev.ORGANIZER && <span>&#128100; {ev.ORGANIZER.replace(/^.*CN=/,'').replace(/:.*/,'')}</span>}
                </div>
                {ev.DESCRIPTION && <div className="fv-cal-desc">{ev.DESCRIPTION.replace(/\\n/g,'\n').replace(/\\,/g,',')}</div>}
              </div>
            </div>;
          })
      }
      <p className="fv-hex-note" style={{marginTop:4}}>{icsEvents.length} event{icsEvents.length !== 1?'s':''} · switch to raw view to edit</p>
    </div>}
    {fileType === 'binary' && hexRows.length > 0 && <div className="fv-hex-outer">
      <p className="fv-hex-note">Hex dump — first {hexBytes.length} of {formatBytes(file.size)}</p>
      <div className="fv-hex">
        <div className="fv-hex-head"><span>Offset</span><span>Hex (16 bytes/row)</span><span>ASCII</span></div>
        {hexRows.map((row,i)=><div key={i} className="fv-hex-row"><span>{row.off}</span><span>{row.hex}</span><span>{row.asc}</span></div>)}
      </div>
      <p className="fv-hex-note" style={{marginTop:8}}>Binary file — open it in the appropriate application to view its full content.</p>
    </div>}
  </>;
}

function FileConverterTool() {
  const FMTS = [
    { label: 'JPEG', mime: 'image/jpeg', ext: 'jpg' },
    { label: 'PNG',  mime: 'image/png',  ext: 'png' },
    { label: 'WebP', mime: 'image/webp', ext: 'webp' },
  ];
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [outFmt, setOutFmt] = useState('image/jpeg');
  const [quality, setQuality] = useState(88);
  const [result, setResult] = useState(null);

  const load = f => {
    if (!f || !f.type.startsWith('image/')) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f); setResult(null);
    setPreview(URL.createObjectURL(f));
    setOutFmt(f.type === 'image/jpeg' ? 'image/png' : 'image/jpeg');
  };

  const convert = () => {
    if (!preview || !file) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (outFmt === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(img, 0, 0);
      const q = outFmt === 'image/png' ? undefined : quality / 100;
      const dataUrl = canvas.toDataURL(outFmt, q);
      const fmt = FMTS.find(f => f.mime === outFmt);
      setResult({ dataUrl, name: `${file.name.replace(/\.[^.]+$/, '')}.${fmt.ext}`, approxBytes: Math.round(dataUrl.length * 0.75) });
    };
    img.src = preview;
  };

  const fmt = FMTS.find(f => f.mime === outFmt);

  return <>
    {!file
      ? <label className="bgr-upload-zone"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp" style={{display:'none'}} onChange={e => e.target.files[0] && load(e.target.files[0])}/><div className="bgr-drop" onDrop={e=>{e.preventDefault();e.dataTransfer.files[0]&&load(e.dataTransfer.files[0]);}} onDragOver={e=>e.preventDefault()}><span style={{fontSize:40}}>🖼️</span><p>Drop an image or <u>browse</u></p><small>Supports JPG, PNG, WebP, GIF, BMP</small></div></label>
      : <>
          <div className="bgr-panel-head" style={{marginBottom:12}}>
            <strong style={{font:'700 14px Manrope',color:'#10183e'}}>{file.name}</strong>
            <span className="conv-badge">{file.type.split('/')[1].toUpperCase()} · {formatBytes(file.size)}</span>
          </div>
          <img src={preview} alt="Original" className="bgr-canvas" style={{maxHeight:260,objectFit:'contain',marginBottom:16}}/>
          <div className="conv-options">
            <div>
              <p style={{font:'700 12px Manrope',color:'#68748a',marginBottom:8,textTransform:'uppercase',letterSpacing:.5}}>Convert to</p>
              <div className="conv-formats">{FMTS.map(f => <button key={f.mime} className={`conv-fmt${outFmt===f.mime?' active':''}`} onClick={()=>setOutFmt(f.mime)}>{f.label}</button>)}</div>
            </div>
            {outFmt !== 'image/png' && <label className="bgr-tol">Quality <b>{quality}%</b><input type="range" min="10" max="100" value={quality} onChange={e=>setQuality(Number(e.target.value))}/></label>}
          </div>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <button className="button primary" onClick={convert}>Convert to {fmt?.label}</button>
            <button className="button secondary" onClick={()=>{setFile(null);setPreview(null);setResult(null);}}>New file</button>
          </div>
          {result && <div className="conv-result">
            <div className="conv-result-head"><span><strong>{result.name}</strong> · ~{formatBytes(result.approxBytes)}</span><button className="button primary" onClick={()=>{const a=document.createElement('a');a.download=result.name;a.href=result.dataUrl;a.click();}}>Download</button></div>
            <div className="conv-result-wrap"><img src={result.dataUrl} alt="Converted"/></div>
          </div>}
        </>
    }
    <p className="tool-footnote">Conversion uses the browser’s built-in canvas. PNG is lossless. Transparent images converted to JPEG get a white background. WebP may not be supported in older Safari versions.</p></>;
}

function SuggestTool() {
  const [form, setForm] = useState({ name: '', email: '', toolName: '', details: '' });
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const upd = (f, v) => setForm(p => ({...p, [f]: v}));
  const submit = e => {
    e.preventDefault();
    if (!form.toolName.trim()) { setErr('Please name the tool you need.'); return; }
    setErr('');
    const subject = encodeURIComponent(`Tool suggestion: ${form.toolName.trim()}`);
    const body = encodeURIComponent([
      form.name ? `From: ${form.name}${form.email ? ` <${form.email}>` : ''}` : '',
      '',
      `Tool requested: ${form.toolName.trim()}`,
      '',
      form.details.trim() || '(no details provided)',
    ].join('\n').trimStart());
    window.open(`mailto:hello@surrendasoft.com?subject=${subject}&body=${body}`);
    setSent(true);
  };
  if (sent) return <div className="suggest-thanks">
    <span>💡</span>
    <h3>Thanks for the suggestion!</h3>
    <p>Your email client should have opened. If it didn't, email us directly at <a href="mailto:hello@surrendasoft.com">hello@surrendasoft.com</a>.</p>
    <button className="button secondary" onClick={() => { setSent(false); setForm({ name: '', email: '', toolName: '', details: '' }); }}>Send another</button>
  </div>;
  return <form className="suggest-form" onSubmit={submit} noValidate>
    <p className="suggest-intro">Got an idea for a tool? Every suggestion is read — your feedback shapes what gets built next.</p>
    <div className="field-row">
      <label>Your name <span>optional</span><input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. Alex"/></label>
      <label>Your email <span>optional</span><input type="email" value={form.email} onChange={e => upd('email', e.target.value)} placeholder="so we can follow up"/></label>
    </div>
    <label style={{display:'flex',flexDirection:'column',gap:6}}>What tool do you need? <span style={{fontWeight:500,opacity:.6,fontSize:12}}>required</span><input value={form.toolName} onChange={e => upd('toolName', e.target.value)} placeholder="e.g. Mortgage calculator, colour picker, password generator…"/></label>
    <label style={{display:'flex',flexDirection:'column',gap:6}}>Tell us more <span style={{fontWeight:500,opacity:.6,fontSize:12}}>optional</span><textarea rows="4" value={form.details} onChange={e => upd('details', e.target.value)} placeholder="What would you use it for? What inputs and outputs matter most?"/></label>
    {err && <p className="pdf-error">{err}</p>}
    <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
      <button className="button primary" type="submit">Send suggestion <Icon name="arrow"/></button>
      <p className="suggest-note">Opens your email client with your message pre-filled.</p>
    </div>
  </form>;
}

const rootElement = document.getElementById('root');

const root = globalThis.__surrendaSoftRoot || createRoot(rootElement);
globalThis.__surrendaSoftRoot = root;
root.render(<React.StrictMode><App/></React.StrictMode>);
