'use client';

import { useState } from 'react';

interface FaqItem {
  q: string;
  a: string;
}

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="card overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-semibold"
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span>{it.q}</span>
              <span
                className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-surface-2 transition-transform"
                style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>
            {isOpen && (
              <div className="px-5 pb-5 text-sm text-muted leading-relaxed">{it.a}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
