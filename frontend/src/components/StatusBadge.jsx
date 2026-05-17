const STYLES = {
  waiting:  'bg-paper text-ink border-rule',
  called:   'bg-accent text-paper border-accent animate-pulse-slow',
  served:   'bg-success/10 text-success border-success/30',
  expired:  'bg-graphite/10 text-graphite border-graphite/30',
  running:  'bg-success/10 text-success border-success/30',
  paused:   'bg-warn/10 text-warn border-warn/30',
};

const LABELS = {
  waiting: 'Waiting',
  called:  'Now serving',
  served:  'Served',
  expired: 'Expired',
  running: 'Live',
  paused:  'Paused',
};

export default function StatusBadge({ status }) {
  const style = STYLES[status] || 'bg-paper text-ink border-rule';
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 border text-[11px] font-medium tracking-[0.18em] uppercase ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {LABELS[status] || status}
    </span>
  );
}
