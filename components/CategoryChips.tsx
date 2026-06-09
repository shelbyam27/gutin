'use client';

import { useState } from 'react';

const CATEGORIES = [
  { id: 'all', label: 'Semua' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'music', label: 'Musik' },
  { id: 'ai', label: 'AI' },
  { id: 'design', label: 'Desain' },
  { id: 'social', label: 'Sosmed' },
  { id: 'game', label: 'Game' },
  { id: 'edu', label: 'Edukasi' },
  { id: 'vpn', label: 'VPN' },
];

export default function CategoryChips({
  active,
  onChange,
}: {
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={`chip ${active === c.id ? 'chip-active' : ''}`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

export { CATEGORIES };
