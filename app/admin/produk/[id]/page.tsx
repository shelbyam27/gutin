import { getDb } from '@/lib/db';
import { notFound } from 'next/navigation';
import ProductEditor from '@/components/admin/ProductEditor';
import AdminShell from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

interface Product {
  id: number;
  slug: string;
  name: string;
  category: string;
  short_desc: string | null;
  long_desc: string | null;
  image: string | null;
  brand_color: string | null;
  is_active: number;
  sort_order: number;
  source: string | null;
  wr_id: string | null;
  last_synced_at: string | null;
}

interface VariantRow {
  id: number;
  name: string;
  duration_label: string | null;
  price: number;
  description: string | null;
  is_active: number;
  discount_price: number | null;
  discount_label: string | null;
  discount_until: string | null;
  source: string | null;
  wr_id: string | null;
  cost_price: number | null;
  margin_mode: string | null;
  margin_value: number | null;
  wr_stock: number | null;
  stock: number;
  sold: number;
}

export default function AdminProductEdit({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product | undefined;
  if (!product) notFound();

  const variants = db.prepare(
    `SELECT v.id, v.name, v.duration_label, v.price, v.description, v.is_active,
            v.discount_price, v.discount_label, v.discount_until,
            v.source, v.wr_id, v.cost_price, v.margin_mode, v.margin_value, v.wr_stock,
            CASE WHEN v.source = 'wr' THEN COALESCE(v.wr_stock, 0)
                 ELSE COALESCE((SELECT COUNT(*) FROM credentials c WHERE c.variant_id = v.id AND c.status = 'available'), 0)
            END AS stock,
            COALESCE((SELECT COUNT(*) FROM credentials c WHERE c.variant_id = v.id AND c.status = 'sold'), 0) AS sold
     FROM variants v
     WHERE v.product_id = ? ORDER BY v.price ASC`,
  ).all(id) as VariantRow[];

  return (
    <AdminShell>
      <ProductEditor product={product} variants={variants} />
    </AdminShell>
  );
}
