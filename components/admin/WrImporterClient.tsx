'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatIDR } from '@/lib/format';

interface RemoteVariant {
  id: string;
  name: string;
  price: number;
  duration: string;
  type: string;
  warranty: string;
  stock: number;
  terms: string | null;
  delivery_terms: string | null;
  suggested_price: number;
  imported: boolean;
}
interface RemoteProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  image: string | null;
  variants: RemoteVariant[];
}
interface ImportedRow {
  variant_id: number;
  product_id: number;
  product_name: string;
  variant_name: string;
  wr_variant_id: string;
  cost_price: number | null;
  price: number;
  margin_mode: string | null;
  margin_value: number | null;
  wr_stock: number | null;
  last_synced_at: string | null;
  is_active: number;
}
type Mode = 'percent' | 'fixed';

interface Defaults { mode: Mode; value: number; minMargin: number; roundTo: number; }

export default function WrImporterClient({
  configured,
  imported,
  defaults,
}: {
  configured: boolean;
  imported: ImportedRow[];
  defaults: Defaults;
}) {
  const router = useRouter();
  const [products, setProducts] = useState<RemoteProduct[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [perProductMargin, setPerProductMargin] = useState<Record<string, { mode: Mode; value: number }>>({});

  function applyMargin(cost: number, mode: Mode, value: number): number {
    if (!cost || cost <= 0) return 0;
    let raw = mode === 'percent' ? cost * (1 + value / 100) : cost + value;
    if (defaults.minMargin > 0 && raw - cost < defaults.minMargin) raw = cost + defaults.minMargin;
    const rt = Math.max(1, defaults.roundTo);
    const rounded = Math.ceil(raw / rt) * rt;
    return Math.max(500, rounded);
  }

  async function fetchRemote() {
    setBusy('fetch'); setMsg(null);
    try {
      const r = await fetch('/api/admin/wr/products', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Gagal');
      setProducts(d.products || []);
      setLoaded(true);
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    } finally { setBusy(null); }
  }

  function getMarginFor(productId: string): { mode: Mode; value: number } {
    return perProductMargin[productId] ?? { mode: defaults.mode, value: defaults.value };
  }

  function selectionsByProduct(): { productId: string; variantIds: string[]; margin: { mode: Mode; value: number } }[] {
    const grouped: Record<string, string[]> = {};
    for (const [key, on] of Object.entries(selected)) {
      if (!on) continue;
      const [pid, vid] = key.split('::');
      if (!pid || !vid) continue;
      (grouped[pid] ||= []).push(vid);
    }
    return Object.entries(grouped).map(([productId, variantIds]) => ({
      productId, variantIds, margin: getMarginFor(productId),
    }));
  }

  const totalSelected = Object.values(selected).filter(Boolean).length;

  async function importNow() {
    const selections = selectionsByProduct();
    if (!selections.length) return;
    setBusy('import'); setMsg(null);
    try {
      const r = await fetch('/api/admin/wr/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Gagal import');
      setMsg({
        kind: 'ok',
        text: `Sukses: ${d.created_products} produk baru, ${d.imported_variants} varian baru, ${d.updated_variants} varian diupdate.`,
      });
      setSelected({});
      await fetchRemote();
      router.refresh();
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    } finally { setBusy(null); }
  }

  async function syncAll() {
    setBusy('sync'); setMsg(null);
    try {
      const r = await fetch('/api/admin/wr/sync', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Gagal');
      setMsg({ kind: 'ok', text: `Sync selesai. ${d.updated} varian diperbarui, ${d.stale} varian hilang dinonaktifkan.` });
      router.refresh();
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    } finally { setBusy(null); }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products
      .map((p) => ({
        ...p,
        variants: p.variants.filter((v) =>
          (p.name + ' ' + p.category + ' ' + v.name + ' ' + v.duration + ' ' + v.type).toLowerCase().includes(q),
        ),
      }))
      .filter((p) => p.name.toLowerCase().includes(q) || p.variants.length > 0);
  }, [products, search]);

  if (!configured) {
    return (
      <div className="card p-6 text-sm">
        <p className="font-semibold mb-2">API Key Warung Rebahan belum diisi.</p>
        <p className="text-muted mb-4">Buka <a className="text-brand-from underline" href="/admin/settings">Pengaturan</a> dan isi API Key di section Warung Rebahan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`text-sm rounded-btn px-3 py-2 ${msg.kind === 'ok' ? 'bg-success/10 text-success border border-success/30' : 'bg-danger/10 text-danger border border-danger/30'}`}>
          {msg.text}
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="font-semibold">Sudah Diimpor ({imported.length})</div>
          <button onClick={syncAll} disabled={busy === 'sync' || imported.length === 0} className="btn btn-secondary !text-xs">
            {busy === 'sync' ? 'Sync...' : 'Sync Harga & Stok dari WR'}
          </button>
        </div>
        {imported.length === 0 ? (
          <p className="text-sm text-muted">Belum ada varian yang diimpor.</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="px-2 py-2">Produk</th>
                  <th className="px-2 py-2">Varian</th>
                  <th className="px-2 py-2 text-right">Modal</th>
                  <th className="px-2 py-2">Margin</th>
                  <th className="px-2 py-2 text-right">Harga Jual</th>
                  <th className="px-2 py-2 text-right">Stok</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {imported.map((r) => (
                  <ImportedRowEditor key={r.variant_id} row={r} defaults={defaults} onSaved={() => router.refresh()} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="font-semibold">Katalog Warung Rebahan</div>
          <div className="flex gap-2">
            {loaded && <input className="input !py-2 !text-sm" placeholder="Cari produk / varian" value={search} onChange={(e) => setSearch(e.target.value)} />}
            <button onClick={fetchRemote} disabled={busy === 'fetch'} className="btn btn-secondary !text-xs">
              {busy === 'fetch' ? 'Ambil...' : (loaded ? 'Muat Ulang' : 'Tarik Daftar Produk')}
            </button>
          </div>
        </div>

        {!loaded ? (
          <p className="text-sm text-muted">Klik "Tarik Daftar Produk" untuk lihat katalog dari Warung Rebahan.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted">Tidak ada hasil.</p>
        ) : (
          <div className="space-y-4">
            {filtered.map((p) => {
              const m = getMarginFor(p.id);
              return (
                <div key={p.id} className="border rounded-card p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      {p.image && (
                        <img src={p.image} alt={p.name}
                             className="w-12 h-12 rounded-btn object-contain bg-surface-2 p-1"
                             onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      )}
                      <div>
                        <div className="font-semibold">{p.name} <span className="text-xs text-muted ml-1">/{p.category}</span></div>
                        <div className="text-xs text-muted line-clamp-2 max-w-xl">{p.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted">Margin produk:</span>
                      <select className="select !py-1 !text-xs"
                              value={m.mode}
                              onChange={(e) => setPerProductMargin((s) => ({ ...s, [p.id]: { mode: e.target.value as Mode, value: m.value } }))}>
                        <option value="percent">%</option>
                        <option value="fixed">Rp</option>
                      </select>
                      <input className="input !py-1 !text-xs w-24" type="number" value={m.value}
                             onChange={(e) => setPerProductMargin((s) => ({ ...s, [p.id]: { mode: m.mode, value: Number(e.target.value) || 0 } }))} />
                    </div>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs text-muted">
                        <tr>
                          <th className="px-2 py-1.5 w-8"></th>
                          <th className="px-2 py-1.5">Varian</th>
                          <th className="px-2 py-1.5">Tipe / Garansi</th>
                          <th className="px-2 py-1.5 text-right">Modal</th>
                          <th className="px-2 py-1.5 text-right">Harga Jual</th>
                          <th className="px-2 py-1.5 text-right">Stok WR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.variants.map((v) => {
                          const key = `${p.id}::${v.id}`;
                          const sell = applyMargin(v.price, m.mode, m.value);
                          const profit = sell - v.price;
                          return (
                            <tr key={v.id} className="border-t">
                              <td className="px-2 py-2">
                                <input type="checkbox" className="accent-brand-from"
                                       checked={!!selected[key]}
                                       onChange={(e) => setSelected((s) => ({ ...s, [key]: e.target.checked }))} />
                              </td>
                              <td className="px-2 py-2">
                                <div className="font-medium">{v.type || v.name} {v.duration && <span className="text-muted text-xs">— {v.duration}</span>}</div>
                                {v.imported && <span className="badge badge-muted !text-[10px]">sudah diimpor</span>}
                              </td>
                              <td className="px-2 py-2 text-xs text-muted">
                                {v.type || '—'}{v.warranty ? ` · ${v.warranty}` : ''}
                              </td>
                              <td className="px-2 py-2 text-right font-mono text-xs">{formatIDR(v.price)}</td>
                              <td className="px-2 py-2 text-right">
                                <div className="font-semibold">{formatIDR(sell)}</div>
                                <div className="text-[10px] text-success">+{formatIDR(profit)}</div>
                              </td>
                              <td className="px-2 py-2 text-right">{v.stock}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {loaded && (
          <div className="mt-5 flex items-center justify-between gap-3 flex-wrap border-t pt-4">
            <div className="text-sm text-muted">{totalSelected} varian dipilih</div>
            <button onClick={importNow} disabled={busy === 'import' || totalSelected === 0} className="btn btn-primary">
              {busy === 'import' ? 'Mengimpor...' : `Import ${totalSelected} Varian`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ImportedRowEditor({
  row, defaults, onSaved,
}: { row: ImportedRow; defaults: Defaults; onSaved: () => void }) {
  const [mode, setMode] = useState<Mode>((row.margin_mode === 'fixed' ? 'fixed' : 'percent') as Mode);
  const [value, setValue] = useState<number>(row.margin_value ?? defaults.value);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(!!row.is_active);

  function preview(): number {
    const cost = row.cost_price || 0;
    if (cost <= 0) return row.price;
    let raw = mode === 'percent' ? cost * (1 + value / 100) : cost + value;
    if (defaults.minMargin > 0 && raw - cost < defaults.minMargin) raw = cost + defaults.minMargin;
    const rt = Math.max(1, defaults.roundTo);
    return Math.max(500, Math.ceil(raw / rt) * rt);
  }

  async function save() {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/variants/${row.variant_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          margin_mode: mode,
          margin_value: value,
          price: preview(),
          is_active: active ? 1 : 0,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Gagal');
      onSaved();
    } catch (e) {
      alert((e as Error).message);
    } finally { setBusy(false); }
  }

  const newPrice = preview();

  return (
    <tr className="border-t">
      <td className="px-2 py-2 font-medium">{row.product_name}</td>
      <td className="px-2 py-2 text-xs">{row.variant_name}</td>
      <td className="px-2 py-2 text-right font-mono text-xs">{formatIDR(row.cost_price ?? 0)}</td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <select className="select !py-1 !text-xs" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="percent">%</option>
            <option value="fixed">Rp</option>
          </select>
          <input type="number" className="input !py-1 !text-xs w-20" value={value} onChange={(e) => setValue(Number(e.target.value) || 0)} />
        </div>
      </td>
      <td className="px-2 py-2 text-right">
        <div className="font-semibold">{formatIDR(newPrice)}</div>
        {newPrice !== row.price && <div className="text-[10px] text-muted">sebelumnya {formatIDR(row.price)}</div>}
      </td>
      <td className="px-2 py-2 text-right text-xs">{row.wr_stock ?? '—'}</td>
      <td className="px-2 py-2 text-right whitespace-nowrap">
        <label className="text-xs mr-2 inline-flex items-center gap-1">
          <input type="checkbox" className="accent-brand-from" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Aktif
        </label>
        <button onClick={save} disabled={busy} className="btn btn-secondary !py-1 !text-xs">{busy ? '...' : 'Simpan'}</button>
      </td>
    </tr>
  );
}
