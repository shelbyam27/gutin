type Accent = 'brand' | 'success' | 'warning' | 'danger' | 'muted';

const tone: Record<Accent, string> = {
  brand: 'rgba(99,102,241,.15)',
  success: 'rgba(34,197,94,.15)',
  warning: 'rgba(234,179,8,.15)',
  danger: 'rgba(220,38,38,.15)',
  muted: 'rgba(138,147,166,.15)',
};
const stroke: Record<Accent, string> = {
  brand: 'rgb(var(--brand-from))',
  success: 'rgb(var(--success))',
  warning: 'rgb(var(--warning))',
  danger: 'rgb(var(--danger))',
  muted: 'rgb(var(--muted))',
};

export default function StatCard({
  label,
  value,
  accent = 'brand',
  hint,
}: {
  label: string;
  value: string;
  accent?: Accent;
  hint?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
          {hint && <div className="text-xs text-muted mt-1">{hint}</div>}
        </div>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: tone[accent] }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke[accent]} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17l6-6 4 4 8-8" />
            <path d="M14 7h7v7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
