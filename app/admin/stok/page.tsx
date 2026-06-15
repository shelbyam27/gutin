import { getDb } from '@/lib/db';
import StockClient, { VariantStock } from '@/components/admin/StockClient';
import AdminShell from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

function loadVariants(): VariantStock[] {
  return getDb().prepare(
    `SELECT v.id, p.name AS product_name, v.name AS variant_name, v.price,
            COALESCE(SUM(CASE WHEN c.status = 'available' THEN 1 ELSE 0 END), 0) AS stock,
            COALESCE(SUM(CASE WHEN c.status = 'sold' THEN 1 ELSE 0 END), 0) AS sold
     FROM variants v JOIN products p ON p.id = v.product_id
     LEFT JOIN credentials c ON c.variant_id = v.id
     WHERE v.is_active = 1 AND COALESCE(v.source, 'manual') != 'wr'
     GROUP BY v.id ORDER BY p.sort_order ASC, p.id ASC, v.price ASC`,
  ).all() as VariantStock[];
}

export default function AdminStockPage() {
  const variants = loadVariants();
  return (
    <AdminShell>
      <div className="container-page py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Stok Akun</h1>
          <p className="text-sm text-muted">Tambah atau bersihkan kredensial per varian.</p>
        </div>
        <StockClient variants={variants} />
      </div>
    </AdminShell>
  );
}
