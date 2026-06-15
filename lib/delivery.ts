import { getDb } from './db';
import { getSetting } from './settings';
import { sendDeliveryMail } from './mailer';
import { wrCreateOrder, wrFindTransaction, type WrTransaction } from './warungrebahan';
import { notifyOrder, buildPayload } from './notifier';

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
  wr_order_id: string | null;
  wr_status: string | null;
  created_at: string;
}

export function getOrderByCode(code: string): OrderRow | null {
  return (getDb()
    .prepare('SELECT * FROM orders WHERE code = ?')
    .get(code) as OrderRow | undefined) ?? null;
}

export function countAvailableStock(variantId: number): number {
  const db = getDb();
  const variant = db
    .prepare('SELECT source, wr_stock, is_active FROM variants WHERE id = ?')
    .get(variantId) as { source: string | null; wr_stock: number | null; is_active: number } | undefined;
  if (!variant) return 0;
  if (variant.source === 'wr') {
    return Math.max(0, Number(variant.wr_stock ?? 0));
  }
  const r = db
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

function variantSource(variantId: number): { source: string | null; wr_id: string | null } {
  const r = getDb()
    .prepare('SELECT source, wr_id FROM variants WHERE id = ?')
    .get(variantId) as { source: string | null; wr_id: string | null } | undefined;
  return r ?? { source: null, wr_id: null };
}

function unwrapLabelValue(obj: Record<string, unknown>): { label: string; value: unknown } | null {
  const labelKeys = ['label', 'name', 'field', 'title', 'key'];
  const valueKeys = ['value', 'val', 'content', 'data', 'detail'];
  let labelKey: string | null = null;
  let valueKey: string | null = null;
  for (const k of Object.keys(obj)) {
    const low = k.toLowerCase();
    if (!labelKey && labelKeys.includes(low)) labelKey = k;
    else if (!valueKey && valueKeys.includes(low)) valueKey = k;
  }
  if (!labelKey || !valueKey) return null;
  const label = obj[labelKey];
  if (typeof label !== 'string' || !label.trim()) return null;
  return { label: label.trim(), value: obj[valueKey] };
}

function flattenEntry(value: unknown, prefix = ''): Array<[string, string]> {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const s = String(value).trim();
    if (!s) return [];
    return [[prefix || 'detail', s]];
  }
  if (Array.isArray(value)) {
    const out: Array<[string, string]> = [];
    for (const item of value) {
      out.push(...flattenEntry(item, prefix));
    }
    return out;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const lv = unwrapLabelValue(obj);
    if (lv) {
      const key = prefix ? `${prefix}_${lv.label}` : lv.label;
      return flattenEntry(lv.value, key);
    }
    const out: Array<[string, string]> = [];
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}_${k}` : k;
      out.push(...flattenEntry(v, key));
    }
    return out;
  }
  return [];
}

function recordToLine(rec: Array<[string, string]>): string {
  return rec.map(([k, v]) => `${k}:${v}`).join('|');
}

function formatAccountDetails(td: WrTransaction): string {
  const acc: any = td.account_details;
  const records: Array<Array<[string, string]>> = [];

  if (!acc) {
    // empty
  } else if (Array.isArray(acc)) {
    for (const item of acc) {
      if (item == null) continue;
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed) records.push([['detail', trimmed]]);
        continue;
      }
      if (typeof item === 'object') {
        const flat = flattenEntry(item);
        if (flat.length) records.push(flat);
      }
    }
  } else if (typeof acc === 'object') {
    const flat = flattenEntry(acc);
    if (flat.length) records.push(flat);
  } else {
    const s = String(acc).trim();
    if (s) records.push([['detail', s]]);
  }

  if (records.length === 0 && Array.isArray(td.products) && td.products.length > 0) {
    for (const p of td.products) {
      const flat = flattenEntry(p);
      if (flat.length) records.push(flat);
    }
  }

  return records.map(recordToLine).join('\n');
}

function notifyFor(event: 'order.created' | 'order.paid' | 'order.delivered' | 'order.failed', o: OrderRow) {
  notifyOrder(buildPayload(event, {
    code: o.code,
    product_name: o.product_name,
    variant_name: o.variant_name,
    amount: o.amount,
    fee: o.fee,
    total: o.total,
    email: o.email,
    whatsapp: o.whatsapp,
    status: event === 'order.paid' ? 'paid' : event === 'order.delivered' ? 'delivered' : event === 'order.failed' ? 'failed' : o.status,
    payment_method: o.payment_method,
    created_at: o.created_at,
    paid_at: o.paid_at,
    delivered_at: o.delivered_at,
    wr_order_id: o.wr_order_id,
  }));
}

async function sendDelivery(order: OrderRow, content: string) {
  const brandName = getSetting('brand_name') || 'Toko Digital';
  try {
    await sendDeliveryMail({
      to: order.email,
      brandName,
      orderCode: order.code,
      productName: order.product_name,
      variantName: order.variant_name,
      total: order.total,
      credential: content,
      orderUrl: buildOrderUrl(order.code),
    });
  } catch (e) {
    console.error('Gagal kirim email delivery:', (e as Error).message);
  }
}

async function finalizeWrOrder(order: OrderRow): Promise<{
  status: 'already_delivered' | 'delivered' | 'paid_no_stock';
}> {
  const db = getDb();
  const { wr_id } = variantSource(order.variant_id);
  if (!wr_id) {
    db.prepare(`UPDATE orders SET status = 'paid', paid_at = COALESCE(paid_at, datetime('now')) WHERE id = ?`).run(order.id);
    return { status: 'paid_no_stock' };
  }

  const fresh = getOrderByCode(order.code);
  if (!fresh) return { status: 'paid_no_stock' };
  if (fresh.status === 'delivered') return { status: 'already_delivered' };

  let wrOrderId = fresh.wr_order_id;
  let immediateContent = '';

  if (!wrOrderId) {
    const claim = db.prepare(
      `UPDATE orders SET wr_status = 'creating',
         paid_at = COALESCE(paid_at, datetime('now')),
         status = CASE WHEN status = 'pending' THEN 'paid' ELSE status END
       WHERE id = ?
         AND wr_order_id IS NULL
         AND (wr_status IS NULL OR wr_status NOT IN ('creating','processing','completed'))`,
    ).run(order.id);

    if (claim.changes === 0) {
      const after = getOrderByCode(order.code);
      if (after?.status === 'delivered') return { status: 'already_delivered' };
      wrOrderId = after?.wr_order_id ?? null;
      if (!wrOrderId) return { status: 'paid_no_stock' };
    } else {
      try {
        const isTest = getSetting('wr_test_mode') === 'true';
        const result = await wrCreateOrder({ variantId: wr_id, emailInvite: order.email, isTest });
        wrOrderId = result.order_id;
        db.prepare(
          `UPDATE orders SET wr_order_id = ?, wr_status = ? WHERE id = ?`,
        ).run(wrOrderId, result.status || 'processing', order.id);
        if (result.status === 'completed' || result.payment_status === 'paid') {
          const detail = await wrFindTransaction(wrOrderId).catch(() => null);
          if (detail) immediateContent = formatAccountDetails(detail);
        }
      } catch (e) {
        console.error('[wr] gagal create order:', (e as Error).message);
        db.prepare(`UPDATE orders SET wr_status = ? WHERE id = ?`).run(
          'failed:' + (e as Error).message.slice(0, 80),
          order.id,
        );
        const failed = getOrderByCode(order.code);
        if (failed) notifyFor('order.failed', failed);
        return { status: 'paid_no_stock' };
      }
    }
  }

  if (!immediateContent && wrOrderId) {
    try {
      const detail = await wrFindTransaction(wrOrderId);
      if (detail && detail.status === 'completed') {
        immediateContent = formatAccountDetails(detail);
      }
    } catch (e) {
      console.warn('[wr] cek transaksi gagal:', (e as Error).message);
    }
  }

  if (!immediateContent) return { status: 'paid_no_stock' };

  db.prepare(
    `UPDATE orders SET status = 'delivered', delivered_at = datetime('now'),
     delivered_content = ?, wr_status = 'completed' WHERE id = ?`,
  ).run(immediateContent, order.id);

  await sendDelivery(order, immediateContent);
  const delivered = getOrderByCode(order.code);
  if (delivered) notifyFor('order.delivered', delivered);
  return { status: 'delivered' };
}

export async function finalizeOrder(code: string): Promise<{
  status: 'already_delivered' | 'delivered' | 'paid_no_stock' | 'not_found';
}> {
  const db = getDb();
  const order = getOrderByCode(code);
  if (!order) return { status: 'not_found' };

  if (order.status === 'delivered') return { status: 'already_delivered' };

  const { source } = variantSource(order.variant_id);
  if (source === 'wr') {
    return finalizeWrOrder(order);
  }

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

  if (result.delivered && result.content) {
    await sendDelivery(order, result.content);
    const delivered = getOrderByCode(order.code);
    if (delivered) notifyFor('order.delivered', delivered);
  }

  return result.delivered
    ? { status: 'delivered' }
    : { status: 'paid_no_stock' };
}

export async function deliverFromWrTransaction(td: WrTransaction, opts: { force?: boolean } = {}): Promise<boolean> {
  const db = getDb();
  const order = db
    .prepare('SELECT * FROM orders WHERE wr_order_id = ?')
    .get(td.order_id) as OrderRow | undefined;
  if (!order) return false;
  if (order.status === 'delivered' && !opts.force) return true;

  const content = formatAccountDetails(td);
  if (!content) {
    db.prepare(`UPDATE orders SET wr_status = ? WHERE id = ?`).run(td.status || 'processing', order.id);
    return false;
  }

  db.prepare(
    `UPDATE orders SET status = 'delivered', delivered_at = COALESCE(delivered_at, datetime('now')),
     delivered_content = ?, wr_status = 'completed', paid_at = COALESCE(paid_at, datetime('now'))
     WHERE id = ?`,
  ).run(content, order.id);

  await sendDelivery(order, content);
  const delivered = getOrderByCode(order.code);
  if (delivered) notifyFor('order.delivered', delivered);
  return true;
}

export function markOrderPaid(code: string) {
  const db = getDb();
  const r = db
    .prepare(
      `UPDATE orders SET status = 'paid', paid_at = COALESCE(paid_at, datetime('now'))
       WHERE code = ? AND status = 'pending'`,
    )
    .run(code);
  if (r.changes > 0) {
    const fresh = getOrderByCode(code);
    if (fresh) notifyFor('order.paid', fresh);
  }
}
