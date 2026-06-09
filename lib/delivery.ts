import { getDb } from './db';
import { getSetting } from './settings';
import { sendDeliveryMail } from './mailer';

export interface OrderRow {
  id: number;
  code: string;
  variant_id: number;
  product_name: string;
  variant_name: string;
  amount: number;
  fee: number;
  total: number;
  email: string;
  whatsapp: string | null;
  status: string;
  payment_method: string;
  payment_number: string | null;
  expires_at: string | null;
  paid_at: string | null;
  delivered_at: string | null;
  delivered_content: string | null;
  flash_sale_id: number | null;
  created_at: string;
}

export function getOrderByCode(code: string): OrderRow | null {
  return (getDb()
    .prepare('SELECT * FROM orders WHERE code = ?')
    .get(code) as OrderRow | undefined) ?? null;
}

export function countAvailableStock(variantId: number): number {
  const r = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM credentials WHERE variant_id = ? AND status = 'available'`,
    )
    .get(variantId) as { n: number };
  return r.n;
}

function buildOrderUrl(code: string): string {
  const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  if (base) return `${base}/pesanan/${code}`;
  return `/pesanan/${code}`;
}

export async function finalizeOrder(code: string): Promise<{
  status: 'already_delivered' | 'delivered' | 'paid_no_stock' | 'not_found';
}> {
  const db = getDb();
  const order = getOrderByCode(code);
  if (!order) return { status: 'not_found' };

  if (order.status === 'delivered') return { status: 'already_delivered' };

  const tx = db.transaction(() => {
    const fresh = db
      .prepare('SELECT * FROM orders WHERE id = ?')
      .get(order.id) as OrderRow;
    if (fresh.status === 'delivered') return { delivered: false, content: null };

    const cred = db
      .prepare(
        `SELECT id, content FROM credentials
         WHERE variant_id = ? AND status = 'available'
         ORDER BY id ASC LIMIT 1`,
      )
      .get(fresh.variant_id) as { id: number; content: string } | undefined;

    if (!cred) {
      db.prepare(
        `UPDATE orders SET status = 'paid', paid_at = COALESCE(paid_at, datetime('now')) WHERE id = ?`,
      ).run(fresh.id);
      return { delivered: false, content: null };
    }

    db.prepare(
      `UPDATE credentials SET status = 'sold', order_id = ?, sold_at = datetime('now') WHERE id = ?`,
    ).run(fresh.id, cred.id);
    db.prepare(
      `UPDATE orders SET status = 'delivered', paid_at = COALESCE(paid_at, datetime('now')),
       delivered_at = datetime('now'), delivered_content = ? WHERE id = ?`,
    ).run(cred.content, fresh.id);

    return { delivered: true, content: cred.content };
  });

  const result = tx();

  const brandName = getSetting('brand_name') || 'Toko Digital';
  try {
    await sendDeliveryMail({
      to: order.email,
      brandName,
      orderCode: order.code,
      productName: order.product_name,
      variantName: order.variant_name,
      total: order.total,
      credential: result.content,
      orderUrl: buildOrderUrl(order.code),
    });
  } catch (e) {
    console.error('Gagal kirim email delivery:', (e as Error).message);
  }

  return result.delivered
    ? { status: 'delivered' }
    : { status: 'paid_no_stock' };
}

export function markOrderPaid(code: string) {
  getDb()
    .prepare(
      `UPDATE orders SET status = 'paid', paid_at = COALESCE(paid_at, datetime('now'))
       WHERE code = ? AND status = 'pending'`,
    )
    .run(code);
}
