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
            COALESCE(SUM(CASE WHEN c.status = 'available' THEN 1 ELSE 0 END), 0) AS stock,
            COALESCE(SUM(CASE WHEN c.status = 'sold' THEN 1 ELSE 0 END), 0) AS sold
     FROM variants v LEFT JOIN credentials c ON c.variant_id = v.id
     WHERE v.product_id = ? GROUP BY v.id ORDER BY v.price ASC`,
  ).all(id) as VariantRow[];

  return (
    <AdminShell>
      <ProductEditor product={product} variants={variants} />
    </AdminShell>
  );
}
