'use client';

import { useMemo } from 'react';

interface Point {
  day: string;
  total: number;
}

export default function RevenueChart({ data }: { data: Point[] }) {
  const { path, area, max, labels } = useMemo(() => {
    const w = 600;
    const h = 180;
    const padX = 30;
    const padY = 20;
    const max = Math.max(1, ...data.map((d) => d.total));
    const stepX = (w - padX * 2) / Math.max(1, data.length - 1);
    const points = data.map((d, i) => {
      const x = padX + i * stepX;
      const y = h - padY - (d.total / max) * (h - padY * 2);
      return [x, y] as const;
    });
    const path = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
    const area =
      points.length > 0
        ? `${path} L${padX + (points.length - 1) * stepX},${h - padY} L${padX},${h - padY} Z`
        : '';
    const labels = data.map((d) => {
      const dt = new Date(d.day);
      return ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][dt.getDay()];
    });
    return { path, area, max, labels };
  }, [data]);

  return (
    <div>
      <svg viewBox="0 0 600 180" className="w-full h-44">
        <defs>
          <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--brand-from))" stopOpacity=".4" />
            <stop offset="100%" stopColor="rgb(var(--brand-from))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#rg)" />
        <path d={path} fill="none" stroke="rgb(var(--brand-from))" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between text-[11px] text-muted px-7 -mt-1">
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
      <div className="text-[11px] text-muted text-right mt-1">Maks: Rp{max.toLocaleString('id-ID')}</div>
    </div>
  );
}
