export default function Stat({ value, label }) {
  return <div className="stat"><strong>{value.toLocaleString()}</strong><span>{label}</span></div>;
}
