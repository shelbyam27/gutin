'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatIDR } from '@/lib/format';

export interface VariantPurchase {
  id: number;
  name: string;
  duration_label: string | null;
  price: number;
  original_price: number;
  badge: string | null;
  flash_ends_at: string | null;
  flash_slots_left: number | null;
  stock: number;
}

export default function PurchaseCard({ variants }: { variants: VariantPurchase[] }) {
  const firstAvailable = variants.find((v) => v.stock > 0) || variants[0];
  const [selected, setSelected] = useState<number>(firstAvailable?.id ?? variants[0]?.id);
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const variant = variants.find((v) => v.id === selected) || variants[0];
  const hasDiscount = variant && variant.original_price > variant.price;
  const pct = hasDiscount ? Math.round(((variant!.original_price - variant!.price) / variant!.original_price) * 100) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.match(/.+@.+\..+/)) {
      setError('Email tidak valid.');
      return;
    }
    if (!variant) {
      setError('Varian tidak tersedia.');
      return;
    }
    if (variant.stock <= 0) {
      setError('Stok varian ini habis.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: variant.id,
          email,
          whatsapp,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Gagal membuat pesanan.');
      router.push(`/bayar/${data.code}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!variants.length) {
    return (
      <div className="card p-6 text-center text-muted">
        Belum ada varian aktif untuk produk ini.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <div>
        <div className="label">Pilih Paket</div>
        <div className="space-y-2">
          {variants.map((v) => {
            const active = selected === v.id;
            const out = v.stock <= 0;
            const variantDiscount = v.original_price > v.price;
            return (
              <label
                key={v.id}
                className={`flex items-start gap-3 p-3 rounded-btn border cursor-pointer transition relative ${
                  active ? 'border-brand-from bg-surface-2' : 'hover:bg-surface-2'
                } ${out ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="variant"
                  className="mt-1 accent-brand-from"
                  checked={active}
                  disabled={out}
                  onChange={() => setSelected(v.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="font-semibold flex items-center gap-1.5">
                      {v.name}
                      {v.badge && (
                        <span className={`badge text-[10px] ${v.badge === 'Flash Sale' ? 'badge-danger' : 'badge-warning'}`}>{v.badge}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatIDR(v.price)}</div>
                      {variantDiscount && (
                        <div className="text-[11px] text-muted line-through">{formatIDR(v.original_price)}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                    <span>{v.duration_label}</span>
                    <span>·</span>
                    <span>
                      {out ? (
                        <span className="text-danger">Stok habis</span>
                      ) : (
                        <>Stok {v.stock}</>
                      )}
                    </span>
                    {v.flash_slots_left != null && v.flash_slots_left <= 10 && (
                      <>
                        <span>·</span>
                        <span className="text-danger font-semibold">Sisa {v.flash_slots_left} slot</span>
                      </>
                    )}
                  </div>
                  {v.flash_ends_at && active && <FlashCountdown endsAt={v.flash_ends_at} />}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="email">Email Pengiriman</label>
        <input
          id="email"
          type="email"
          required
          className="input"
          placeholder="kamu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="wa">No. WhatsApp (opsional)</label>
        <input
          id="wa"
          type="tel"
          className="input"
          placeholder="08xxxxxxxxxx"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />
      </div>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-btn px-3 py-2">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? 'Memproses...' : `Beli Sekarang · ${formatIDR(variant?.price || 0)}`}
      </button>

      {hasDiscount && (
        <div className="text-center text-xs text-muted -mt-2">
          Hemat <span className="text-success font-semibold">{formatIDR(variant!.original_price - variant!.price)} ({pct}%)</span> dari harga normal
        </div>
      )}

      <p className="text-[11px] text-muted text-center">
        Dengan klik Beli, kamu setuju dengan ketentuan layanan kami.
      </p>
    </form>
  );
}

function FlashCountdown({ endsAt }: { endsAt: string }) {
  const [remain, setRemain] = useState(() => Date.parse(endsAt) - Date.now());
  useEffect(() => {
    const id = setInterval(() => setRemain(Date.parse(endsAt) - Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  if (remain <= 0) return null;
  const h = Math.floor(remain / 3_600_000);
  const m = Math.floor((remain % 3_600_000) / 60_000);
  const s = Math.floor((remain % 60_000) / 1000);
  return (
    <div className="mt-2 text-[11px] text-danger font-semibold font-mono">
      Berakhir dalam {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </div>
  );
}
