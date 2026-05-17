export default function Stat({ label, value, hint, accent = false }) {
  return (
    <div className="border-l border-rule pl-4">
      <div className="label">{label}</div>
      <div className={`mt-2 font-display text-4xl tracking-tightest leading-none num ${accent ? 'text-accent' : 'text-ink'}`}>
        {value}
      </div>
      {hint && <div className="mt-2 text-xs text-graphite">{hint}</div>}
    </div>
  );
}
