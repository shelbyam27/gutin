'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CATS = ['streaming', 'music', 'ai', 'design', 'social', 'game', 'edu', 'vpn'];

export default function ProductsClient() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('streaming');
  const [color, setColor] = useState('#6366f1');
  const [shortDesc, setShortDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, slug, category, brand_color: color, short_desc: shortDesc,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Gagal');
      setOpen(false);
      setName(''); setSlug(''); setShortDesc('');
      router.refresh();
      router.push(`/admin/produk/${d.id}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn btn-primary">+ Produk Baru</button>
      ) : (
        <form onSubmit={submit} className="card p-5 grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nama Produk</label>
            <input className="input" required value={name}
                   onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} />
          </div>
          <div>
            <label className="label">Slug</label>
            <input className="input font-mono" required value={slug}
                   onChange={(e) => setSlug(slugify(e.target.value))} />
          </div>
          <div>
            <label className="label">Kategori</label>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Brand Color</label>
            <input type="color" className="input !p-1 h-11" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Deskripsi Singkat</label>
            <input className="input" value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} />
          </div>
          {err && <div className="sm:col-span-2 text-sm text-danger bg-danger/10 border border-danger/30 rounded-btn px-3 py-2">{err}</div>}
          <div className="sm:col-span-2 flex gap-2 justify-end">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">Batal</button>
            <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Menyimpan...' : 'Simpan & Edit'}</button>
          </div>
        </form>
      )}
    </div>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
