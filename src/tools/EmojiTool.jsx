import { useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';

const emojis = [
  ['Smileys', '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😍','🥰','😎','🤓','🤩','🥳','😴','🤔','🫡','🤗','🙌'],
  ['People', '👋','👍','👎','👏','🙏','💪','🤝','✍️','👀','🧠','💡','❤️','🔥','✨','✅','🎉','🚀','💯','📌','📣'],
  ['Work', '💼','📅','📊','📈','🧾','💻','📱','⚙️','🔧','🛠️','📧','📝','🔒','🗂️','⏰','💰','🏆','🎯','📦','🌏'],
];

export default function EmojiTool() {
  const [query, setQuery] = useState(''); const [copied, setCopied] = useState('');
  const filtered = useMemo(() => emojis.map(([cat,...items]) => [cat, ...items.filter(e => !query || cat.toLowerCase().includes(query.toLowerCase()) || e.includes(query))]).filter(x => x.length > 1), [query]);
  const copy = async e => { try { await navigator.clipboard.writeText(e); } catch { /* preview environments may block clipboard */ } setCopied(e); setTimeout(() => setCopied(''), 1400); };
  return <><label className="search-box"><Icon name="search"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search emoji categories…"/></label>{copied && <div className="toast"><Icon name="check" size={16}/> {copied} copied</div>}<div className="emoji-groups">{filtered.map(([cat,...items]) => <div key={cat}><h3>{cat}</h3><div className="emoji-grid">{items.map((e,i)=><button key={i} onClick={()=>copy(e)} title={`Copy ${e}`}>{e}</button>)}</div></div>)}</div></>;
}
