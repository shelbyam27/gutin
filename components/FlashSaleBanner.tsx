'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatIDR } from '@/lib/format';

interface FlashItem {
  id: number;
  flash_price: number;
  starts_at: string;
  ends_at: string;
  max_qty: number | null;
  sold_qty: number;
  variant_id: number;
  variant_name: string;
  original_price: number;
  product_slug: string;
  product_name: string;
  brand_color: string | null;
}

export default function FlashSaleBanner({ items }: { items: FlashItem[] }) {
  if (items.length === 0) return null;
  const soonest = items[0];
  const [remain, setRemain] = useState<number>(() => Date.parse(soonest.ends_at) - Date.now());

  useEffect(() => {
    const id = setInterval(() => setRemain(Date.parse(soonest.ends_at) - Date.now()), 1000);
    return () => clearInterval(id);
  }, [soonest.ends_at]);

  const hrs = Math.max(0, Math.floor(remain / 3_600_000));
  const min = Math.max(0, Math.floor((remain % 3_600_000) / 60_000));
  const sec = Math.max(0, Math.floor((remain % 60_000) / 1000));

  return (
    <div
      className="card-brutal overflow-hidden"
      style={{ background: 'rgb(var(--accent))' }}
    >
      <div className="p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex w-11 h-11 items-center justify-center rounded-xl text-white"
              style={{
                background: '#ef4444',
                border: '2px solid rgb(var(--ink))',
                boxShadow: '3px 3px 0 0 rgb(var(--ink))',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h7l-1 8 11-14h-7l1-6z" />
              </svg>
            </span>
            <div>
              <div
                className="font-extrabold text-lg sm:text-xl tracking-tight"
                style={{ color: 'rgb(var(--ink))' }}
              >
                Flash Sale
              </div>
              <div className="text-xs font-semibold" style={{ color: 'rgba(15,23,42,.7)' }}>
                Stok terbatas. Harga spesial.
              </div>
            </div>
          </div>

          {remain > 0 && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--ink))' }}>
              <span className="font-semibold">Berakhir dalam</span>
              <div className="flex gap-1.5 font-mono font-extrabold">
                {[hrs, min, sec].map((n, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded-md"
                    style={{
                      background: '#fff',
                      border: '2px solid rgb(var(--ink))',
                      boxShadow: '2px 2px 0 0 rgb(var(--ink))',
                      minWidth: 36,
                      textAlign: 'center',
                    }}
                  >
                    {String(n).padStart(2, '0')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((f) => {
            const pct = Math.round(((f.original_price - f.flash_price) / f.original_price) * 100);
            const slotsLeft = f.max_qty != null ? Math.max(0, f.max_qty - f.sold_qty) : null;
            const totalQty = f.max_qty ?? f.sold_qty + 1;
            const progress = f.max_qty ? Math.min(100, Math.round((f.sold_qty / totalQty) * 100)) : 0;

            return (
              <Link
                key={f.id}
                href={`/produk/${f.product_slug}`}
                className="card-brutal card-brutal-hover p-3 flex gap-3 items-center"
                style={{ background: 'rgb(var(--surface))' }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shrink-0"
                  style={{
                    background: f.brand_color || '#ef4444',
                    border: '2px solid rgb(var(--ink))',
                  }}
                >
                  {f.product_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{f.product_name}</div>
                  <div className="text-xs text-muted truncate">{f.variant_name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-extrabold text-danger">{formatIDR(f.flash_price)}</span>
                    <span className="text-xs text-muted line-through">{formatIDR(f.original_price)}</span>
                    <span className="badge badge-danger">-{pct}%</span>
                  </div>
                  {slotsLeft != null && (
                    <div className="mt-1.5">
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{
                          background: 'rgb(var(--surface-2))',
                          border: '1.5px solid rgb(var(--ink))',
                        }}
                      >
                        <div
                          className="h-full"
                          style={{
                            width: `${progress}%`,
                            background: 'linear-gradient(90deg, #ef4444, #f97316)',
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-muted mt-0.5 font-semibold">
                        {slotsLeft === 0 ? 'Habis' : `Tersisa ${slotsLeft}`}
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
