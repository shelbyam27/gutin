import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getTransactionDetail } from '@/lib/pakasir';
import { finalizeOrder, markOrderPaid } from '@/lib/delivery';
import type { OrderRow } from '@/lib/delivery';
import { rateStatus } from '@/lib/ratelimit';
import { getIp } from '@/lib/security';

const lastPakasirCheck = new Map<string, number>();
const POLL_PAKASIR_INTERVAL_MS = 10_000;

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } },
) {
  const ip = getIp(req);
  const limit = rateStatus(ip);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Terlalu banyak request' }, { status: 429 });
  }

  const code = params.code;
  if (!/^INV-\d{6}-[A-F0-9]{8,16}$/.test(code)) {
    return NextResponse.json({ error: 'Kode tidak valid.' }, { status: 400 });
  }

  const db = getDb();
  let order = db
    .prepare('SELECT * FROM orders WHERE code = ?')
    .get(code) as OrderRow | undefined;

  if (!order) {
    return NextResponse.json({ error: 'Tidak ditemukan.' }, { status: 404 });
  }

  if (order.status === 'pending') {
    if (order.expires_at && new Date(order.expires_at).getTime() < Date.now()) {
      db.prepare(`UPDATE orders SET status = 'expired' WHERE id = ?`).run(order.id);
      if (order.flash_sale_id) {
        db.prepare('UPDATE flash_sales SET sold_qty = MAX(0, sold_qty - 1) WHERE id = ?').run(order.flash_sale_id);
      }
      order = { ...order, status: 'expired' };
    } else {
      const last = lastPakasirCheck.get(code) || 0;
      if (Date.now() - last > POLL_PAKASIR_INTERVAL_MS) {
        lastPakasirCheck.set(code, Date.now());
        try {
          const detail = await getTransactionDetail(order.code, order.amount);
          if (detail?.status === 'completed') {
            markOrderPaid(order.code);
            await finalizeOrder(order.code);
            order = (db
              .prepare('SELECT * FROM orders WHERE code = ?')
              .get(code) as OrderRow) || order;
          } else if (detail?.status === 'canceled') {
            db.prepare(`UPDATE orders SET status = 'canceled' WHERE id = ?`).run(order.id);
            order = { ...order, status: 'canceled' };
          }
        } catch {
          /* webhook is primary path */
        }
      }
    }
  }

  if (order.status === 'paid') {
    await finalizeOrder(order.code);
    order = (db
      .prepare('SELECT * FROM orders WHERE code = ?')
      .get(code) as OrderRow) || order;
  }

  return NextResponse.json({
    code: order.code,
    status: order.status,
    expires_at: order.expires_at,
  });
}
