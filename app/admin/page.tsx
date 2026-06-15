import { getDb } from '@/lib/db';
import { formatIDR } from '@/lib/settings';
import StatCard from '@/components/admin/StatCard';
import RevenueChart from '@/components/admin/RevenueChart';
import AdminShell from '@/components/admin/AdminShell';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Stats {
  revenueToday: number;
  revenueMonth: number;
  pending: number;
  delivered: number;
  unique: number;
  totalOrders: number;
  lowStock: Array<{ product: string; variant: string; stock: number }>;
  recent: Array<{ code: string; product_name: string; variant_name: string; total: number; status: string; created_at: string }>;
  daily: Array<{ day: string; total: number }>;
}

function loadStats(): Stats {
  const db = getDb();
  const revToday = (db.prepare(
    `SELECT COALESCE(SUM(total), 0) AS s FROM orders WHERE status IN ('paid','delivered') AND date(created_at) = date('now','localtime')`,
  ).get() as { s: number }).s;
  const revMonth = (db.prepare(
    `SELECT COALESCE(SUM(total), 0) AS s FROM orders WHERE status IN ('paid','delivered') AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now','localtime')`,
  ).get() as { s: number }).s;
  const pending = (db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'`).get() as { n: number }).n;
  const delivered = (db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE status = 'delivered'`).get() as { n: number }).n;
  const unique = (db.prepare(`SELECT COUNT(DISTINCT email) AS n FROM orders WHERE status IN ('paid','delivered')`).get() as { n: number }).n;
  const totalOrders = (db.prepare(`SELECT COUNT(*) AS n FROM orders`).get() as { n: number }).n;

  const lowStock = db.prepare(
    `SELECT p.name AS product, v.name AS variant,
            CASE WHEN v.source = 'wr' THEN COALESCE(v.wr_stock, 0)
                 ELSE COALESCE((SELECT COUNT(*) FROM credentials c WHERE c.variant_id = v.id AND c.status = 'available'), 0)
            END AS stock
     FROM variants v JOIN products p ON p.id = v.product_id
     WHERE v.is_active = 1 AND p.is_active = 1
     GROUP BY v.id
     HAVING stock < 5
     ORDER BY stock ASC LIMIT 6`,
  ).all() as Stats['lowStock'];

  const recent = db.prepare(
    `SELECT code, product_name, variant_name, total, status, created_at
     FROM orders ORDER BY id DESC LIMIT 6`,
  ).all() as Stats['recent'];

  const daily = db.prepare(
    `SELECT date(created_at,'localtime') AS day, COALESCE(SUM(total),0) AS total
     FROM orders WHERE status IN ('paid','delivered')
       AND date(created_at,'localtime') >= date('now','localtime','-6 days')
     GROUP BY day ORDER BY day ASC`,
  ).all() as Stats['daily'];

  const filledDaily: Stats['daily'] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = daily.find((x) => x.day === key);
    filledDaily.push({ day: key, total: found?.total || 0 });
  }

  return { revenueToday: revToday, revenueMonth: revMonth, pending, delivered, unique, totalOrders, lowStock, recent, daily: filledDaily };
}

export default function AdminDashboard() {
  const s = loadStats();
  return (
    <AdminShell>
      <div className="container-page py-8">
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-sm text-muted mb-6">Ringkasan toko hari ini.</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard label="Omzet Hari Ini" value={formatIDR(s.revenueToday)} accent="brand" />
          <StatCard label="Omzet Bulan Ini" value={formatIDR(s.revenueMonth)} accent="success" />
          <StatCard label="Order Pending" value={String(s.pending)} accent="warning" />
          <StatCard label="Order Delivered" value={String(s.delivered)} accent="muted" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3 mb-6">
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-semibold">Omzet 7 Hari Terakhir</div>
                <div className="text-xs text-muted">Termasuk yang masih paid (belum delivered).</div>
              </div>
            </div>
            <RevenueChart data={s.daily} />
          </div>

          <div className="card p-5">
            <div className="font-semibold mb-3">Stok Hampir Habis</div>
            {s.lowStock.length === 0 ? (
              <div className="text-sm text-muted">Semua varian masih punya stok yang sehat.</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {s.lowStock.map((l, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <div className="truncate">
                      <div className="font-medium truncate">{l.product}</div>
                      <div className="text-xs text-muted truncate">{l.variant}</div>
                    </div>
                    <span className={`badge ${l.stock === 0 ? 'badge-danger' : 'badge-warning'}`}>{l.stock}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/admin/stok" className="btn btn-secondary !text-xs mt-4 w-full">Kelola Stok</Link>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Pesanan Terbaru</div>
            <Link href="/admin/pesanan" className="text-sm text-brand-from hover:underline">Lihat semua</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted uppercase">
                <tr><th className="py-2">Kode</th><th>Produk</th><th>Total</th><th>Status</th><th>Waktu</th></tr>
              </thead>
              <tbody>
                {s.recent.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-muted">Belum ada pesanan.</td></tr>
                ) : s.recent.map((r) => (
                  <tr key={r.code} className="border-t">
                    <td className="py-2.5 font-mono">{r.code}</td>
                    <td className="py-2.5">{r.product_name} <span className="text-muted">· {r.variant_name}</span></td>
                    <td className="py-2.5">{formatIDR(r.total)}</td>
                    <td className="py-2.5"><StatusBadge s={r.status} /></td>
                    <td className="py-2.5 text-muted text-xs">{r.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending: 'badge-warning',
    paid: 'badge-warning',
    delivered: 'badge-success',
    expired: 'badge-muted',
    canceled: 'badge-muted',
    failed: 'badge-danger',
  };
  return <span className={`badge ${map[s] || 'badge-muted'}`}>{s}</span>;
}
