'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatIDR } from '@/lib/format';

export interface OrderListRow {
  code: string;
  product_name: string;
  variant_name: string;
  total: number;
  email: string;
  status: string;
  created_at: string;
}

const STATUSES = ['all', 'pending', 'paid', 'delivered', 'expired', 'canceled', 'failed'];

export default function OrdersClient({ orders }: { orders: OrderListRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  const filtered = orders.filter((o) => {
    if (filter !== 'all' && o.status !== filter) return false;
    if (q) {
      const qq = q.toLowerCase();
      if (!o.code.toLowerCase().includes(qq) && !o.email.toLowerCase().includes(qq) && !o.product_name.toLowerCase().includes(qq))
        return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`chip ${filter === s ? 'chip-active' : ''}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="ml-auto sm:w-72">
          <input className="input" placeholder="Cari kode/email/produk" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button onClick={() => router.refresh()} className="btn btn-secondary !text-xs">Refresh</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted bg-surface-2">
              <tr>
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted">Tidak ada pesanan.</td></tr>
              ) : filtered.map((o) => (
                <tr key={o.code} className="border-t">
                  <td className="px-4 py-3 font-mono">{o.code}</td>
                  <td className="px-4 py-3">{o.product_name} <span className="text-muted text-xs">· {o.variant_name}</span></td>
                  <td className="px-4 py-3 text-muted">{o.email}</td>
                  <td className="px-4 py-3">{formatIDR(o.total)}</td>
                  <td className="px-4 py-3"><StatusBadge s={o.status} /></td>
                  <td className="px-4 py-3 text-muted text-xs">{o.created_at}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/pesanan/${o.code}`} className="btn btn-secondary !py-1.5 !text-xs">Detail</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending: 'badge-warning', paid: 'badge-warning', delivered: 'badge-success',
    expired: 'badge-muted', canceled: 'badge-muted', failed: 'badge-danger',
  };
  return <span className={`badge ${map[s] || 'badge-muted'}`}>{s}</span>;
}
