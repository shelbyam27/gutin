import { getDb } from '@/lib/db';
import { formatIDR } from '@/lib/settings';
import Link from 'next/link';
import ProductsClient from '@/components/admin/ProductsClient';
import AdminShell from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

interface Row {
  id: number;
  slug: string;
  name: string;
  category: string;
  is_active: number;
  variants: number;
  stock: number;
  min_price: number;
}

function loadRows(): Row[] {
  return getDb().prepare(
    `SELECT p.id, p.slug, p.name, p.category, p.is_active,
            COUNT(DISTINCT v.id) AS variants,
            COALESCE(SUM(CASE WHEN c.status = 'available' THEN 1 ELSE 0 END), 0) AS stock,
            COALESCE(MIN(v.price), 0) AS min_price
     FROM products p
     LEFT JOIN variants v ON v.product_id = p.id
     LEFT JOIN credentials c ON c.variant_id = v.id
     GROUP BY p.id ORDER BY p.sort_order ASC, p.id ASC`,
  ).all() as Row[];
}

export default function AdminProductsPage() {
  const rows = loadRows();
  return (
    <AdminShell>
      <div className="container-page py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Produk</h1>
            <p className="text-sm text-muted">Kelola katalog dan harga.</p>
          </div>
        </div>

        <ProductsClient />

        <div className="card p-0 overflow-hidden mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted bg-surface-2">
                <tr>
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Mulai</th>
                  <th className="px-4 py-3">Varian</th>
                  <th className="px-4 py-3">Stok</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted">Belum ada produk.</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{r.name} <span className="text-muted text-xs">/{r.slug}</span></td>
                    <td className="px-4 py-3 text-muted">{r.category}</td>
                    <td className="px-4 py-3">{formatIDR(r.min_price)}</td>
                    <td className="px-4 py-3">{r.variants}</td>
                    <td className="px-4 py-3">{r.stock}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${r.is_active ? 'badge-success' : 'badge-muted'}`}>
                        {r.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/produk/${r.id}`} className="btn btn-secondary !py-1.5 !text-xs">Edit</Link>
                    </td>
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
