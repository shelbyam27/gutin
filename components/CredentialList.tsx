'use client';

import { useState } from 'react';

export default function CredentialList({ content }: { content: string }) {
  const fields = parse(content);
  const [copiedKey, setCopiedKey] = useState<number | null>(null);

  function copy(idx: number, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(idx);
      setTimeout(() => setCopiedKey(null), 1300);
    });
  }

  return (
    <div className="card divide-y">
      {fields.map((f, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="w-32 text-xs uppercase tracking-wide text-muted">{f.label}</div>
          <div className="flex-1 font-mono text-sm break-all">{f.value}</div>
          <button
            type="button"
            onClick={() => copy(i, f.value)}
            className="btn btn-ghost !px-3 !py-1.5 text-xs"
          >
            {copiedKey === i ? 'Tersalin' : 'Salin'}
          </button>
        </div>
      ))}
    </div>
  );
}

function parse(raw: string): Array<{ label: string; value: string }> {
  return raw
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const i = p.indexOf(':');
      if (i === -1) return { label: 'Detail', value: p };
      return {
        label: cap(p.slice(0, i).trim()),
        value: p.slice(i + 1).trim(),
      };
    });
}

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
