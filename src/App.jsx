import { Suspense, useEffect, useMemo, useState } from 'react';
import Icon from './components/Icon.jsx';
import ToolGlyph from './components/ToolGlyph.jsx';
import { TOOL_FLAGS, categoryIcons, directoryFilters, featuredToolIds, tools } from './data/tools.js';
import { toolComponents } from './tools/index.jsx';

const toolIdFromHash = () => {
  const id = window.location.hash.replace('#', '').trim().split('/')[0];
  return id && tools.some(tool => tool.id === id) ? id : null;
};

function Logo({ onClick }) {
  return <button className="logo" onClick={onClick} aria-label="SurrendaSoft Tools home">
    <span className="logo-mark">S</span><span>SurrendaSoft</span><span className="logo-tools">Tools</span>
  </button>;
}

export default function App() {
  const [activeTool, setActiveTool] = useState(() => {
    return toolIdFromHash();
  });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onHash = () => {
      setActiveTool(toolIdFromHash());
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
  const featuredTools = useMemo(() => featuredToolIds
    .filter(id => TOOL_FLAGS[id])
    .map(id => tools.find(tool => tool.id === id))
    .filter(Boolean), []);
  const visibleTools = useMemo(() => {
    const search = query.trim().toLowerCase();
    return tools.filter(tool => {
      if (!TOOL_FLAGS[tool.id]) return false;
      const matchesFilter = filter === 'All' || (filter === 'New' && tool.isNew) || tool.categories.includes(filter);
      const searchable = `${tool.name} ${tool.description} ${tool.categories.join(' ')} ${tool.status}`.toLowerCase();
      return matchesFilter && (!search || searchable.includes(search));
    });
  }, [query, filter]);
  return <>
    <section className="hero">
      <div className="hero-orb orb-one"/><div className="hero-orb orb-two"/>
      <div className="wrap hero-inner">
        <div className="eyebrow"><span><ToolGlyph name="sparkles" size={14}/></span> SurrendaSoft Tools <b>Beta</b></div>
        <h1>Small tools.<br/><span>Big time savers.</span></h1>
        <p className="hero-copy">Free, privacy-conscious utilities for everyday work. No sign-up, no clutter—just open a tool and get it done.</p>
        <div className="hero-actions"><button className="button primary" onClick={() => document.querySelector('#tools')?.scrollIntoView({behavior:'smooth'})}>Browse tools <Icon name="arrow"/></button><a className="button secondary" href="#how-it-works"><Icon name="shield"/> Why local-first?</a></div>
        <div className="trust-row"><span><i><ToolGlyph name="check" size={12}/></i> Free to use</span><span><i><ToolGlyph name="check" size={12}/></i> No login</span><span><i><ToolGlyph name="check" size={12}/></i> Runs in your browser</span></div>
      </div>
    </section>

    {featuredTools.length > 0 && <section className="featured-section wrap">
      <div className="section-heading"><div><span className="kicker">HAND-PICKED</span><h2>Featured tools</h2></div><p>Standouts worth a look — built to solve a whole job, not just half of one.</p></div>
      <div className="featured-grid">{featuredTools.map(tool => <FeaturedCard key={tool.id} tool={tool} onOpen={onOpen}/>)}</div>
    </section>}

    <section className="tools-section wrap" id="tools">
      <div className="directory-controls"><label className="directory-search"><Icon name="search"/><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tools, e.g. PDF, invoice, emoji, AI…" aria-label="Search tools"/>{query && <button onClick={() => setQuery('')} aria-label="Clear search"><Icon name="close" size={16}/></button>}</label><div className="filter-chips" role="group" aria-label="Filter tools by category">{directoryFilters.map(item => <button key={item} className={filter === item ? 'active' : ''} aria-pressed={filter === item} onClick={() => setFilter(item)}><span className="chip-ico"><ToolGlyph name={categoryIcons[item]} size={14}/></span>{item}</button>)}</div></div>
      <div className="section-heading directory-heading"><div><span className="kicker">TOOL DIRECTORY</span><h2>{filter === 'All' ? 'What do you need to do?' : filter}</h2></div><p>{visibleTools.length} {visibleTools.length === 1 ? 'tool' : 'tools'} · simple jobs that shouldn’t take all day.</p></div>
      {visibleTools.length ? <div className="tool-grid">{visibleTools.map(tool => <ToolCard key={tool.id} tool={tool} onOpen={onOpen}/>)}</div> : <div className="no-results"><div className="no-results-orb"/><span className="no-results-icon"><ToolGlyph name="lightbulb" size={42}/></span><h3>{query.trim() ? `No results for "${query.trim()}"` : `Nothing in ${filter} yet`}</h3><p>{query.trim() ? "We don't have that one yet — but you can suggest it." : 'Try a different category, or tell us what we should build.'}</p><div className="no-results-actions"><button onClick={() => { setQuery(''); setFilter('All'); }}>Show all tools</button><button className="button primary" onClick={() => onOpen('suggest')}>Suggest a tool <Icon name="arrow" size={16}/></button></div></div>}
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

    <section className="cta-section wrap"><div><span className="eyebrow dark">BUILT BY SURRENDASOFT</span><h2>Need a tool that fits<br/>your business?</h2><p>We build practical custom software for real workflows—not software for software’s sake.</p><a className="button light" href="mailto:hello@surrendasoft.com">Tell us what you need <Icon name="arrow"/></a></div><div className="cta-art"><span><ToolGlyph name="settings" size={54}/></span><i><ToolGlyph name="sparkles" size={20}/></i><b><ToolGlyph name="check" size={20}/></b></div></section>
  </>;
}

function FeaturedCard({ tool, onOpen }) {
  return <article className="featured-card" onClick={() => onOpen(tool.id)}>
    <div className="featured-card-head">
      <div className={`tool-icon large ${tool.tint}`}><ToolGlyph name={tool.icon} size={26}/></div>
      <span className="featured-badge"><ToolGlyph name="sparkles" size={11}/> Featured</span>
    </div>
    <h3>{tool.name}</h3>
    <p>{tool.description}</p>
    <div className="featured-tags">{(tool.tags || ['Free', 'Browser-based', 'No login']).map(tag => <span key={tag}>{tag}</span>)}</div>
    <span className="featured-arrow">Try it <Icon name="arrow" size={15}/></span>
  </article>;
}

function ToolCard({ tool, onOpen }) {
  return <article className="tool-card" onClick={() => onOpen(tool.id)}>
    <div className={`tool-icon ${tool.tint}`}><ToolGlyph name={tool.icon}/></div>
    <div className="card-body"><div className="status">{tool.isNew && <span className="new-badge">New</span>}<span></span>{tool.status}</div><h3>{tool.name}</h3><p>{tool.description}</p></div>
    <button className="card-arrow" aria-label={`Open ${tool.name}`}><Icon name="arrow"/></button>
    <div className="card-tags">{(tool.tags || ['Free', 'Browser-based', 'No login']).map(tag => <span key={tag}>{tag}</span>)}</div>
  </article>;
}

function Step({ number, title, copy }) {
  return <div className="step"><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></div>;
}

function ToolPage({ id, onBack }) {
  const tool = tools.find(t => t.id === id);
  const ToolComponent = toolComponents[id];
  return <>
    <section className="tool-hero"><div className="wrap narrow">
      <button className="back-link" onClick={onBack}><Icon name="back" size={18}/> All tools</button>
      <div className={`tool-icon large ${tool.tint}`}><ToolGlyph name={tool.icon} size={28}/></div><span className="tool-label">FREE · BROWSER-BASED</span><h1>{tool.name}</h1><p>{tool.description}</p>
    </div></section>
    <section className="workspace-wrap wrap narrow"><div className="workspace">
      <Suspense fallback={<div className="tool-loading" role="status">Loading tool…</div>}><ToolComponent/></Suspense>
    </div><div className="privacy-note"><Icon name="shield"/><div><strong>Your data stays with you</strong><p>This tool runs in your browser. Nothing you enter is uploaded or stored.</p></div></div></section>
  </>;
}
