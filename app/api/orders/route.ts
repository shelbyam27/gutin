import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { getDb } from '@/lib/db';
import { createTransaction } from '@/lib/pakasir';
import { countAvailableStock } from '@/lib/delivery';
import { getVariantPriced, effectivePrice, getActiveFlashSale } from '@/lib/pricing';
import { rateOrder } from '@/lib/ratelimit';
import { getIp, checkSameOrigin } from '@/lib/security';
import { notifyOrder, buildPayload } from '@/lib/notifier';

const Body = z.object({
  variantId: z.number().int().positive(),
  email: z.string().email().max(120),
  whatsapp: z.string().max(20).optional().default(''),
});

function genCode(): string {
  const d = new Date();
  const ymd =
    String(d.getFullYear()).slice(-2) +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
  const rnd = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `INV-${ymd}-${rnd}`;
}

export async function POST(req: NextRequest) {
  if (!checkSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const ip = getIp(req);
  const limit = rateOrder(ip);
  if (!limit.ok) {
    return NextResponse.json(
      { error: limit.message || 'Terlalu banyak permintaan.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body harus JSON.' }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Input tidak valid.' },
      { status: 400 },
    );
  }
  const { variantId, email, whatsapp } = parsed.data;

  const db = getDb();
  const variant = getVariantPriced(variantId);
  if (!variant || !variant.is_active) {
    return NextResponse.json({ error: 'Varian tidak tersedia.' }, { status: 404 });
  }
  const productRow = db
    .prepare('SELECT name, is_active FROM products WHERE id = ?')
    .get(variant.product_id) as { name: string; is_active: number } | undefined;
  if (!productRow || !productRow.is_active) {
    return NextResponse.json({ error: 'Produk tidak tersedia.' }, { status: 404 });
  }
  if (countAvailableStock(variant.id) <= 0) {
    return NextResponse.json({ error: 'Stok varian habis.' }, { status: 409 });
  }

  const flash = getActiveFlashSale(variant.id);
  const priced = effectivePrice(variant, flash);
  if (priced.effective < 500) {
    return NextResponse.json({ error: 'Harga minimum Rp500.' }, { status: 400 });
  }

  let flashSaleId: number | null = null;
  if (flash && priced.effective === flash.flash_price) {
    const claim = db
      .prepare(
        `UPDATE flash_sales SET sold_qty = sold_qty + 1
         WHERE id = ? AND is_active = 1
           AND datetime(starts_at) <= datetime('now')
           AND datetime(ends_at) > datetime('now')
           AND (max_qty IS NULL OR sold_qty < max_qty)`,
      )
      .run(flash.id);
    if (claim.changes === 0) {
      return NextResponse.json({ error: 'Slot flash sale baru saja habis. Coba muat ulang halaman.' }, { status: 409 });
    }
    flashSaleId = flash.id;
  }

  const code = genCode();

  let pakasirData;
  try {
    pakasirData = await createTransaction('qris', code, priced.effective);
  } catch (e) {
    if (flashSaleId) {
      db.prepare('UPDATE flash_sales SET sold_qty = sold_qty - 1 WHERE id = ?').run(flashSaleId);
    }
    const msg = (e as Error).message || '';
    console.error('[orders] Pakasir createTransaction error:', msg);
    const hint = /belum dikonfigurasi/i.test(msg)
      ? 'Pakasir belum dikonfigurasi. Admin perlu isi project & API key di Pengaturan.'
      : 'Gagal membuat transaksi pembayaran.';
    return NextResponse.json({ error: hint, detail: msg.slice(0, 200) }, { status: 502 });
  }

  db.prepare(
    `INSERT INTO orders (code, variant_id, product_name, variant_name, amount, fee, total,
                         email, whatsapp, status, payment_method, payment_number, expires_at, flash_sale_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'qris', ?, ?, ?)`,
  ).run(
    code,
    variant.id,
    productRow.name,
    variant.name,
    pakasirData.amount,
    pakasirData.fee || 0,
    pakasirData.total_payment || pakasirData.amount,
    email,
    whatsapp || null,
    pakasirData.payment_number,
    pakasirData.expired_at || null,
    flashSaleId,
  );

  notifyOrder(buildPayload('order.created', {
    code,
    product_name: productRow.name,
    variant_name: variant.name,
    amount: pakasirData.amount,
    fee: pakasirData.fee || 0,
    total: pakasirData.total_payment || pakasirData.amount,
    email,
    whatsapp: whatsapp || null,
    status: 'pending',
    payment_method: 'qris',
    created_at: new Date().toISOString(),
  }));

  return NextResponse.json({ code });
}
