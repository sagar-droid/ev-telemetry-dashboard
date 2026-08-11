'use client';

export default function Gauge({ label, value, unit, max, warnAbove }) {
  const pct = Math.min(100, ((value ?? 0) / max) * 100);
  const isWarn = warnAbove != null && value >= warnAbove;

  return (
    <div className="card p-5">
      <p className="text-xs text-neutral-400 uppercase tracking-wide mb-2">{label}</p>
      <p className={`stat-value text-3xl font-semibold ${isWarn ? 'text-red-400' : ''}`}>
        {value != null ? value : '—'}
        <span className="text-sm text-neutral-500 ml-1">{unit}</span>
      </p>
      <div className="h-1.5 bg-black/40 rounded-full mt-3 overflow-hidden">
        <div
          className={`h-full ${isWarn ? 'bg-red-500' : 'bg-volt'} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
