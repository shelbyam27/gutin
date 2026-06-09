import { getDb } from '@/lib/db';
import AdminShell from '@/components/admin/AdminShell';
import FlashSaleClient, { FlashSaleRow, VariantOption } from '@/components/admin/FlashSaleClient';

export const dynamic = 'force-dynamic';

function loadRows(): FlashSaleRow[] {
  return getDb().prepare(
    `SELECT fs.id, fs.variant_id, p.name AS product_name, v.name AS variant_name,
            v.price AS original_price, fs.flash_price, fs.starts_at, fs.ends_at,
            fs.max_qty, fs.sold_qty, fs.is_active
     FROM flash_sales fs
     JOIN variants v ON v.id = fs.variant_id
     JOIN products p ON p.id = v.product_id
     ORDER BY fs.id DESC`,
  ).all() as FlashSaleRow[];
}

function loadVariants(): VariantOption[] {
  const rows = getDb().prepare(
    `SELECT v.id, p.name || ' — ' || v.name AS label, v.price
     FROM variants v JOIN products p ON p.id = v.product_id
     WHERE v.is_active = 1 AND p.is_active = 1
     ORDER BY p.sort_order ASC, p.id ASC, v.price ASC`,
  ).all() as VariantOption[];
  return rows;
}

export default function AdminFlashSalePage() {
  const rows = loadRows();
  const variants = loadVariants();
  return (
    <AdminShell>
      <div className="container-page py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Flash Sale</h1>
          <p className="text-sm text-muted">Promo waktu terbatas — bisa pakai batas slot atau cuma jendela waktu.</p>
        </div>
        <FlashSaleClient initial={rows} variants={variants} />
      </div>
    </AdminShell>
  );
}
