'use client';

import { useState } from 'react';

interface CredRecord {
  fields: Array<{ label: string; value: string }>;
}

export default function CredentialList({ content }: { content: string }) {
  const records = parseAll(content);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copy(key: string, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1300);
    });
  }

  if (records.length === 0) {
    return (
      <div className="card p-4 text-sm text-muted">
        Detail akun belum tersedia. Coba refresh halaman, atau hubungi admin.
      </div>
    );
  }

  const allText = records
    .map((r) => r.fields.map((f) => `${f.label}: ${f.value}`).join('\n'))
    .join('\n\n');

  return (
    <div className="space-y-3">
      {records.map((r, ri) => (
        <div key={ri} className="card divide-y">
          {records.length > 1 && (
            <div className="px-4 py-2 text-xs font-semibold text-muted bg-surface-2">
              Akun #{ri + 1}
            </div>
          )}
          {r.fields.map((f, i) => {
            const key = `${ri}-${i}`;
            return (
              <div key={key} className="flex items-center gap-3 px-4 py-3">
                <div className="w-32 text-xs uppercase tracking-wide text-muted">{f.label}</div>
                <div className="flex-1 font-mono text-sm break-all">{f.value}</div>
                <button
                  type="button"
                  onClick={() => copy(key, f.value)}
                  className="btn btn-ghost !px-3 !py-1.5 text-xs"
                >
                  {copiedKey === key ? 'Tersalin' : 'Salin'}
                </button>
              </div>
            );
          })}
        </div>
      ))}
      {records.length > 1 && (
        <button
          type="button"
          onClick={() => copy('ALL', allText)}
          className="btn btn-secondary !text-xs"
        >
          {copiedKey === 'ALL' ? 'Semua tersalin' : 'Salin Semua Akun'}
        </button>
      )}
    </div>
  );
}

function parseAll(raw: string): CredRecord[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ fields: parseLine(line) }))
    .filter((r) => r.fields.length > 0);
}

function parseLine(line: string): Array<{ label: string; value: string }> {
  return line
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const i = p.indexOf(':');
      if (i === -1) return { label: 'Detail', value: p };
      return {
        label: humanize(p.slice(0, i).trim()),
        value: p.slice(i + 1).trim(),
      };
    })
    .filter((f) => f.value.length > 0);
}

function humanize(s: string): string {
  if (!s) return s;
  let key = s.toLowerCase().replace(/[-\s]+/g, '_');
  for (const prefix of ['details_', 'detail_', 'account_', 'data_', 'item_']) {
    if (key.startsWith(prefix) && key.length > prefix.length) key = key.slice(prefix.length);
  }
  const map: Record<string, string> = {
    email: 'Email',
    password: 'Password',
    pin: 'PIN',
    profile: 'Profile',
    username: 'Username',
    user: 'Username',
    url: 'URL',
    link: 'Link',
    code: 'Kode',
    key: 'Key',
    serial: 'Serial',
    note: 'Catatan',
    notes: 'Catatan',
    catatan: 'Catatan',
    warranty: 'Garansi',
    garansi: 'Garansi',
    expired: 'Expired',
    expiry: 'Expired',
    expired_at: 'Expired',
    expire_at: 'Expired',
    duration: 'Durasi',
    durasi: 'Durasi',
    product: 'Produk',
    produk: 'Produk',
    name: 'Nama',
    nama: 'Nama',
  };
  if (map[key]) return map[key];
  return key
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
