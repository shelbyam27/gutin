'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatIDR } from '@/lib/format';

export interface VariantOption {
  id: number;
  label: string;
  price: number;
}

export interface FlashSaleRow {
  id: number;
  variant_id: number;
  product_name: string;
  variant_name: string;
  original_price: number;
  flash_price: number;
  starts_at: string;
  ends_at: string;
  max_qty: number | null;
  sold_qty: number;
  is_active: number;
}

export default function FlashSaleClient({
  initial,
  variants,
}: {
  initial: FlashSaleRow[];
  variants: VariantOption[];
}) {
  const [rows, setRows] = useState<FlashSaleRow[]>(initial);
  return (
    <div className="space-y-6">
      <CreateForm variants={variants} onCreated={(row) => setRows((p) => [row, ...p])} />
      <List rows={rows} onChange={setRows} variants={variants} />
    </div>
  );
}

function CreateForm({ variants, onCreated }: { variants: VariantOption[]; onCreated: (r: FlashSaleRow) => void }) {
  const [variantId, setVariantId] = useState<number>(variants[0]?.id ?? 0);
  const [flashPrice, setFlashPrice] = useState<number>(0);
  const [startsAt, setStartsAt] = useState<string>(defaultStart());
  const [endsAt, setEndsAt] = useState<string>(defaultEnd());
  const [maxQty, setMaxQty] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const selected = variants.find((v) => v.id === variantId);
  const pct = selected && flashPrice > 0 && flashPrice < selected.price
    ? Math.round(((selected.price - flashPrice) / selected.price) * 100) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!variantId || !flashPrice || !startsAt || !endsAt) {
      setErr('Lengkapi semua field wajib.');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/admin/flash-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_id: variantId,
          flash_price: flashPrice,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
          max_qty: maxQty ? Number(maxQty) : null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Gagal');
      const v = variants.find((x) => x.id === variantId)!;
      const [productName, variantName] = v.label.split(' — ');
      onCreated({
        id: d.id,
        variant_id: variantId,
        product_name: productName || v.label,
        variant_name: variantName || '',
        original_price: v.price,
        flash_price: flashPrice,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        max_qty: maxQty ? Number(maxQty) : null,
        sold_qty: 0,
        is_active: 1,
      });
      setFlashPrice(0);
      setMaxQty('');
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (variants.length === 0) {
    return (
      <div className="card p-6 text-center text-muted text-sm">
        Belum ada varian aktif. Buat produk dan varian dulu sebelum bisa bikin flash sale.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div className="font-semibold">Buat Flash Sale Baru</div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Varian</label>
          <select className="select" value={variantId} onChange={(e) => setVariantId(Number(e.target.value))}>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>{v.label} ({formatIDR(v.price)})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Harga Flash</label>
          <input type="number" className="input" value={flashPrice || ''} min={500}
                 max={selected ? selected.price - 1 : undefined}
                 onChange={(e) => setFlashPrice(Number(e.target.value))} />
          {selected && flashPrice > 0 && flashPrice < selected.price && (
            <div className="text-xs text-success mt-1">Hemat {pct}% — {formatIDR(selected.price - flashPrice)}</div>
          )}
        </div>
        <div>
          <label className="label">Maksimal Slot (opsional)</label>
          <input type="number" min={1} className="input" placeholder="Kosongin = tanpa batas"
                 value={maxQty} onChange={(e) => setMaxQty(e.target.value)} />
        </div>
        <div>
          <label className="label">Mulai</label>
          <input type="datetime-local" className="input" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </div>
        <div>
          <label className="label">Berakhir</label>
          <input type="datetime-local" className="input" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
      </div>
      {err && <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-btn px-3 py-2">{err}</div>}
      <button type="submit" disabled={busy} className="btn btn-primary">
        {busy ? 'Membuat...' : '+ Buat Flash Sale'}
      </button>
    </form>
  );
}

function List({
  rows,
  onChange,
  variants,
}: {
  rows: FlashSaleRow[];
  onChange: (next: FlashSaleRow[]) => void;
  variants: VariantOption[];
}) {
  const now = Date.now();
  const router = useRouter();

  async function toggle(row: FlashSaleRow) {
    const next = row.is_active ? 0 : 1;
    const r = await fetch(`/api/admin/flash-sales/${row.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: next }),
    });
    const d = await r.json();
    if (!r.ok) { alert(d?.error || 'Gagal'); return; }
    onChange(rows.map((x) => x.id === row.id ? { ...x, is_active: next } : x));
    router.refresh();
  }

  async function remove(row: FlashSaleRow) {
    if (!confirm('Hapus flash sale ini?')) return;
    const r = await fetch(`/api/admin/flash-sales/${row.id}`, { method: 'DELETE' });
    const d = await r.json();
    if (!r.ok) { alert(d?.error || 'Gagal'); return; }
    if (d?.deactivated) {
      onChange(rows.map((x) => x.id === row.id ? { ...x, is_active: 0 } : x));
      alert(d.message);
    } else {
      onChange(rows.filter((x) => x.id !== row.id));
    }
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <div className="card p-10 text-center text-muted">
        Belum ada flash sale. Buat pertama di atas.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const start = Date.parse(row.starts_at);
        const end = Date.parse(row.ends_at);
        const isLive = row.is_active && start <= now && now < end && (row.max_qty == null || row.sold_qty < row.max_qty);
        const isUpcoming = row.is_active && start > now;
        const isEnded = end <= now;
        const isSoldOut = row.max_qty != null && row.sold_qty >= row.max_qty;
        const pct = Math.round(((row.original_price - row.flash_price) / row.original_price) * 100);
        const slotsLeft = row.max_qty != null ? Math.max(0, row.max_qty - row.sold_qty) : null;

        return (
          <div key={row.id} className="card p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {isLive && <span className="badge badge-success pulse-dot">Live</span>}
                  {isUpcoming && <span className="badge badge-warning">Belum mulai</span>}
                  {isEnded && <span className="badge badge-muted">Berakhir</span>}
                  {isSoldOut && !isEnded && <span className="badge badge-danger">Slot habis</span>}
                  {!row.is_active && <span className="badge badge-muted">Nonaktif</span>}
                  <span className="badge badge-danger">-{pct}%</span>
                </div>
                <div className="font-semibold">{row.product_name} · {row.variant_name}</div>
                <div className="flex items-center gap-2 text-sm mt-1">
                  <span className="font-bold text-danger">{formatIDR(row.flash_price)}</span>
                  <span className="text-muted line-through">{formatIDR(row.original_price)}</span>
                </div>
                <div className="text-xs text-muted mt-2">
                  {new Date(row.starts_at).toLocaleString('id-ID')} → {new Date(row.ends_at).toLocaleString('id-ID')}
                </div>
                <div className="text-xs mt-1">
                  Terjual: <span className="font-semibold">{row.sold_qty}</span>
                  {row.max_qty != null && <> / {row.max_qty} · sisa <span className="font-semibold">{slotsLeft}</span></>}
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <button onClick={() => toggle(row)} className="btn btn-secondary !text-xs">
                  {row.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button onClick={() => remove(row)} className="btn btn-ghost text-danger !text-xs">Hapus</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function defaultStart(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function defaultEnd(): string {
  const d = new Date(Date.now() + 6 * 60 * 60 * 1000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
