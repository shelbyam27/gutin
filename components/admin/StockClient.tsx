'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface VariantStock {
  id: number;
  product_name: string;
  variant_name: string;
  price: number;
  stock: number;
  sold: number;
}

export default function StockClient({ variants }: { variants: VariantStock[] }) {
  const [selected, setSelected] = useState<number>(variants[0]?.id || 0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const router = useRouter();

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  async function save() {
    if (!selected || lines.length === 0) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`/api/admin/variants/${selected}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: lines }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Gagal');
      setMsg({ kind: 'ok', text: `${d.added} stok ditambahkan.` });
      setText('');
      router.refresh();
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    } finally { setBusy(false); }
  }

  async function clearSold() {
    if (!confirm('Hapus semua stok yang sudah terjual untuk varian ini? (history pesanan tetap aman)')) return;
    const r = await fetch(`/api/admin/variants/${selected}/stock?clearSold=1`, { method: 'DELETE' });
    if (!r.ok) { alert('Gagal'); return; }
    router.refresh();
  }

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-6">
      <div className="card p-3 max-h-[70vh] overflow-y-auto">
        {variants.length === 0 ? (
          <div className="p-6 text-center text-muted text-sm">Belum ada varian.</div>
        ) : variants.map((v) => {
          const active = selected === v.id;
          return (
            <button key={v.id} onClick={() => setSelected(v.id)}
                    className={`w-full text-left p-3 rounded-btn transition ${active ? 'bg-surface-2 border-brand-from' : 'hover:bg-surface-2'}`}>
              <div className="font-medium text-sm truncate">{v.product_name}</div>
              <div className="text-xs text-muted truncate">{v.variant_name}</div>
              <div className="flex gap-3 mt-1 text-xs">
                <span className={`badge ${v.stock === 0 ? 'badge-danger' : v.stock < 5 ? 'badge-warning' : 'badge-success'}`}>{v.stock} stok</span>
                <span className="text-muted">{v.sold} terjual</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="card p-5">
        <div className="font-semibold mb-1">Tambah Stok Massal</div>
        <p className="text-xs text-muted mb-3">
          Format bebas. Contoh tiap baris: <span className="font-mono">email:user@x.com|password:abc123|profile:Anak1</span>
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder="Tempel daftar akun di sini, 1 baris = 1 akun"
          className="textarea font-mono text-xs"
        />
        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-muted">{lines.length} baris siap ditambahkan.</div>
          <div className="flex gap-2">
            <button onClick={clearSold} className="btn btn-ghost text-danger !text-xs">Bersihkan yang Terjual</button>
            <button onClick={save} disabled={busy || lines.length === 0} className="btn btn-primary">
              {busy ? 'Menyimpan...' : 'Simpan Stok'}
            </button>
          </div>
        </div>
        {msg && <div className={`text-sm mt-3 rounded-btn px-3 py-2 ${msg.kind === 'ok' ? 'bg-success/10 text-success border border-success/30' : 'bg-danger/10 text-danger border border-danger/30'}`}>{msg.text}</div>}
      </div>
    </div>
  );
}
