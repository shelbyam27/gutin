'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatIDR } from '@/lib/format';

const CATS = ['streaming', 'music', 'ai', 'design', 'social', 'game', 'edu', 'vpn'];

interface Product {
  id: number;
  slug: string;
  name: string;
  category: string;
  short_desc: string | null;
  long_desc: string | null;
  image: string | null;
  brand_color: string | null;
  is_active: number;
  sort_order: number;
}

interface VariantRow {
  id: number;
  name: string;
  duration_label: string | null;
  price: number;
  description: string | null;
  is_active: number;
  discount_price: number | null;
  discount_label: string | null;
  discount_until: string | null;
  source: string | null;
  wr_id: string | null;
  cost_price: number | null;
  margin_mode: string | null;
  margin_value: number | null;
  wr_stock: number | null;
  stock: number;
  sold: number;
}

export default function ProductEditor({ product, variants }: { product: Product; variants: VariantRow[] }) {
  return (
    <div className="container-page py-8 space-y-6">
      <Link href="/admin/produk" className="text-sm text-muted inline-flex items-center gap-1.5 hover:text-text">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2.4" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        Kembali ke daftar produk
      </Link>

      <ProductForm product={product} />

      <VariantsSection productId={product.id} initial={variants} />
    </div>
  );
}

function ProductForm({ product }: { product: Product }) {
  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [category, setCategory] = useState(product.category);
  const [color, setColor] = useState(product.brand_color || '#6366f1');
  const [image, setImage] = useState(product.image || '');
  const [shortDesc, setShortDesc] = useState(product.short_desc || '');
  const [longDesc, setLongDesc] = useState(product.long_desc || '');
  const [active, setActive] = useState(!!product.is_active);
  const [sortOrder, setSortOrder] = useState(product.sort_order);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const router = useRouter();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const r = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, slug, category, brand_color: color, image,
          short_desc: shortDesc, long_desc: longDesc,
          is_active: active ? 1 : 0, sort_order: Number(sortOrder),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Gagal simpan');
      setMsg({ kind: 'ok', text: 'Tersimpan.' });
      router.refresh();
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm('Hapus produk beserta semua varian & stoknya?')) return;
    const r = await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' });
    const d = await r.json();
    if (!r.ok) {
      alert(d?.error || 'Gagal hapus');
      return;
    }
    router.push('/admin/produk');
    router.refresh();
  }

  return (
    <form onSubmit={save} className="card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Edit Produk</h1>
          <p className="text-xs text-muted">/{product.slug}</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-brand-from" />
          Aktif
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="label">Nama</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><label className="label">Slug</label><input className="input font-mono" value={slug} onChange={(e) => setSlug(e.target.value)} required /></div>
        <div><label className="label">Kategori</label>
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div><label className="label">Brand Color</label><input type="color" className="input !p-1 h-11" value={color} onChange={(e) => setColor(e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="label">URL Gambar</label><input className="input font-mono text-xs" placeholder="/brands/netflix.svg" value={image} onChange={(e) => setImage(e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="label">Deskripsi Singkat</label><input className="input" value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="label">Deskripsi Panjang</label><textarea className="textarea" rows={5} value={longDesc} onChange={(e) => setLongDesc(e.target.value)} /></div>
        <div><label className="label">Urutan Tampil</label><input type="number" className="input" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></div>
      </div>

      {msg && <div className={`text-sm rounded-btn px-3 py-2 ${msg.kind === 'ok' ? 'bg-success/10 text-success border border-success/30' : 'bg-danger/10 text-danger border border-danger/30'}`}>{msg.text}</div>}

      <div className="flex justify-between gap-2">
        <button type="button" onClick={remove} className="btn btn-danger">Hapus</button>
        <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Menyimpan...' : 'Simpan'}</button>
      </div>
    </form>
  );
}

function VariantsSection({ productId, initial }: { productId: number; initial: VariantRow[] }) {
  const [variants, setVariants] = useState<VariantRow[]>(initial);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const router = useRouter();

  async function add() {
    if (!name || price <= 0) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/products/${productId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, duration_label: duration, price }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Gagal');
      setVariants((v) => [...v, {
        id: d.id, name, duration_label: duration, price,
        description: null, is_active: 1, stock: 0, sold: 0,
        discount_price: null, discount_label: null, discount_until: null,
        source: 'manual', wr_id: null, cost_price: null,
        margin_mode: null, margin_value: null, wr_stock: null,
      }]);
      setName(''); setDuration(''); setPrice(0);
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally { setBusy(false); }
  }

  async function update(v: VariantRow) {
    const r = await fetch(`/api/admin/variants/${v.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: v.name,
        duration_label: v.duration_label,
        price: v.price,
        is_active: v.is_active,
        discount_price: v.discount_price,
        discount_label: v.discount_label,
        discount_until: v.discount_until,
      }),
    });
    const d = await r.json();
    if (!r.ok) { alert(d?.error || 'Gagal update'); return; }
    setEditing(null);
    router.refresh();
  }

  async function remove(id: number) {
    if (!confirm('Hapus varian dan semua stoknya?')) return;
    const r = await fetch(`/api/admin/variants/${id}`, { method: 'DELETE' });
    const d = await r.json();
    if (!r.ok) { alert(d?.error || 'Gagal'); return; }
    setVariants((v) => v.filter((x) => x.id !== id));
    router.refresh();
  }

  function patch(id: number, p: Partial<VariantRow>) {
    setVariants((s) => s.map((x) => x.id === id ? { ...x, ...p } : x));
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Varian / Paket</h2>
        <Link href="/admin/stok" className="text-sm text-brand-from hover:underline">Kelola stok →</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-4">
        <input className="input sm:col-span-4" placeholder="Nama paket" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input sm:col-span-3" placeholder="Durasi (30 Hari, dll)" value={duration} onChange={(e) => setDuration(e.target.value)} />
        <input className="input sm:col-span-3" type="number" placeholder="Harga" value={price || ''} onChange={(e) => setPrice(Number(e.target.value))} />
        <button onClick={add} disabled={busy} className="btn btn-primary sm:col-span-2">+ Tambah</button>
      </div>

      <div className="space-y-3">
        {variants.length === 0 ? (
          <div className="px-3 py-6 text-center text-muted text-sm">Belum ada varian.</div>
        ) : variants.map((v) => {
          const isEditing = editing === v.id;
          const hasDiscount = v.discount_price && v.discount_price < v.price;
          const isWr = v.source === 'wr';
          return (
            <div key={v.id} className={`border rounded-card p-4 ${isWr ? 'bg-surface-2/40' : ''}`}>
              {isWr && (
                <div className="flex items-center gap-2 mb-2 text-[11px]">
                  <span className="badge badge-muted">Warung Rebahan</span>
                  <span className="text-muted">Modal: {formatIDR(v.cost_price ?? 0)} · Margin: {v.margin_mode === 'fixed' ? `+Rp${(v.margin_value ?? 0).toLocaleString('id-ID')}` : `+${v.margin_value ?? 0}%`} · Stok WR: {v.wr_stock ?? 0}</span>
                  <a href="/admin/wr" className="ml-auto text-brand-from hover:underline">Atur di importer →</a>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
                <input className="input !py-2 sm:col-span-3" value={v.name} onChange={(e) => patch(v.id, { name: e.target.value })} />
                <input className="input !py-2 sm:col-span-2" value={v.duration_label || ''} onChange={(e) => patch(v.id, { duration_label: e.target.value })} placeholder="Durasi" />
                <input className="input !py-2 sm:col-span-2" type="number" value={v.price} onChange={(e) => patch(v.id, { price: Number(e.target.value) })} placeholder="Harga" />
                <div className="text-xs sm:col-span-3 flex flex-col">
                  <span className="text-muted">{isWr ? 'Stok WR / Terjual' : 'Stok / Terjual'}</span>
                  <span className="font-semibold">{v.stock} <span className="text-muted">· {v.sold}</span></span>
                </div>
                <label className="flex items-center gap-1 text-xs sm:col-span-1">
                  <input type="checkbox" className="accent-brand-from" checked={!!v.is_active} onChange={(e) => patch(v.id, { is_active: e.target.checked ? 1 : 0 })} />
                  Aktif
                </label>
                <div className="sm:col-span-1 text-right whitespace-nowrap">
                  <button onClick={() => setEditing(isEditing ? null : v.id)} className="btn btn-ghost !py-1.5 !text-xs">
                    {isEditing ? 'Tutup' : 'Diskon'}
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className="mt-3 pt-3 border-t grid sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-3">
                    <label className="label !text-[10px]">Harga Diskon</label>
                    <input className="input !py-2" type="number" placeholder="Kosongin = ga ada diskon"
                           value={v.discount_price ?? ''}
                           onChange={(e) => patch(v.id, { discount_price: e.target.value === '' ? null : Number(e.target.value) })} />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="label !text-[10px]">Label Diskon</label>
                    <input className="input !py-2" placeholder="Promo, Hemat 30%, dll" maxLength={40}
                           value={v.discount_label ?? ''}
                           onChange={(e) => patch(v.id, { discount_label: e.target.value || null })} />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="label !text-[10px]">Berlaku Sampai (opsional)</label>
                    <input className="input !py-2" type="datetime-local"
                           value={toLocalDT(v.discount_until)}
                           onChange={(e) => patch(v.id, { discount_until: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                  </div>
                  <div className="sm:col-span-2 flex items-end">
                    <button onClick={() => patch(v.id, { discount_price: null, discount_label: null, discount_until: null })}
                            className="btn btn-ghost text-danger !text-xs w-full">Reset Diskon</button>
                  </div>
                  {hasDiscount && (
                    <div className="sm:col-span-12 text-xs text-success">
                      Diskon aktif: {formatIDR(v.discount_price!)} (hemat {formatIDR(v.price - v.discount_price!)} / {Math.round(((v.price - v.discount_price!) / v.price) * 100)}%)
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => update(v)} className="btn btn-secondary !py-1.5 !text-xs">Simpan</button>
                <button onClick={() => remove(v.id)} className="btn btn-ghost !py-1.5 !text-xs text-danger">Hapus</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-muted mt-4">
        Total nilai katalog: <span className="font-semibold text-text">{formatIDR(variants.reduce((a, b) => a + b.price * b.stock, 0))}</span>
      </div>
    </div>
  );
}

function toLocalDT(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}
