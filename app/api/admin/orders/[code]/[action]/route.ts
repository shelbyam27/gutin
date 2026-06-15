import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { adminApiGuard } from '@/lib/guard';
import { getTransactionDetail, simulatePayment, cancelTransaction } from '@/lib/pakasir';
import { finalizeOrder, markOrderPaid, getOrderByCode, deliverFromWrTransaction } from '@/lib/delivery';
import { wrFindTransaction } from '@/lib/warungrebahan';
import { sendDeliveryMail } from '@/lib/mailer';
import { getSetting } from '@/lib/settings';

type Action = 'check-status' | 'simulate' | 'finalize' | 'resend-email' | 'cancel' | 'manual-deliver' | 'refetch-wr';

function buildOrderUrl(code: string): string {
  const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  if (base) return `${base}/pesanan/${code}`;
  return `/pesanan/${code}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string; action: string } },
) {
  const g = adminApiGuard(req); if (g) return g;
  const { code, action } = params;
  const order = getOrderByCode(code);
  if (!order) return NextResponse.json({ error: 'Order tidak ditemukan.' }, { status: 404 });

  try {
    switch (action as Action) {
      case 'check-status': {
        const detail = await getTransactionDetail(order.code, order.amount);
        if (detail?.status === 'completed') {
          markOrderPaid(order.code);
          const r = await finalizeOrder(order.code);
          return NextResponse.json({ ok: true, message: `Status di Pakasir: completed. Hasil delivery: ${r.status}.` });
        }
        return NextResponse.json({ ok: true, message: `Status di Pakasir: ${detail?.status || 'unknown'}.` });
      }

      case 'simulate': {
        await simulatePayment(order.code, order.amount);
        return NextResponse.json({ ok: true, message: 'Simulasi pembayaran terkirim. Webhook seharusnya akan dipanggil oleh Pakasir.' });
      }

      case 'finalize': {
        const r = await finalizeOrder(order.code);
        return NextResponse.json({ ok: true, message: `Hasil: ${r.status}.` });
      }

      case 'resend-email': {
        if (!order.delivered_content) {
          return NextResponse.json({ error: 'Pesanan belum punya kredensial yang dikirim.' }, { status: 400 });
        }
        const brand = getSetting('brand_name') || 'Toko Digital';
        await sendDeliveryMail({
          to: order.email,
          brandName: brand,
          orderCode: order.code,
          productName: order.product_name,
          variantName: order.variant_name,
          total: order.total,
          credential: order.delivered_content,
          orderUrl: buildOrderUrl(order.code),
        });
        return NextResponse.json({ ok: true, message: `Email berhasil dikirim ulang ke ${order.email}.` });
      }

      case 'cancel': {
        try { await cancelTransaction(order.code, order.amount); } catch (e) {
          console.warn('cancel pakasir gagal:', (e as Error).message);
        }
        getDb().prepare(`UPDATE orders SET status = 'canceled' WHERE id = ?`).run(order.id);
        return NextResponse.json({ ok: true, message: 'Pesanan dibatalkan.' });
      }

      case 'manual-deliver': {
        const body = await req.json().catch(() => ({} as any));
        const credential = String(body?.credential || '').trim();
        if (!credential) return NextResponse.json({ error: 'Kredensial wajib diisi.' }, { status: 400 });
        const db = getDb();
        db.transaction(() => {
          db.prepare(
            `UPDATE orders SET status = 'delivered',
             paid_at = COALESCE(paid_at, datetime('now')),
             delivered_at = datetime('now'),
             delivered_content = ? WHERE id = ?`,
          ).run(credential, order.id);
        })();
        const brand = getSetting('brand_name') || 'Toko Digital';
        try {
          await sendDeliveryMail({
            to: order.email, brandName: brand, orderCode: order.code,
            productName: order.product_name, variantName: order.variant_name,
            total: order.total, credential, orderUrl: buildOrderUrl(order.code),
          });
        } catch (e) {
          return NextResponse.json({ ok: true, message: `Tersimpan, tapi email gagal: ${(e as Error).message}` });
        }
        return NextResponse.json({ ok: true, message: 'Akun berhasil dikirim manual + email terkirim.' });
      }

      case 'refetch-wr': {
        if (!order.wr_order_id) {
          return NextResponse.json({ error: 'Order ini tidak punya wr_order_id (bukan order WR).' }, { status: 400 });
        }
        const td = await wrFindTransaction(order.wr_order_id);
        if (!td) {
          return NextResponse.json({ error: 'Transaksi tidak ditemukan di Warung Rebahan.' }, { status: 404 });
        }
        const ok = await deliverFromWrTransaction(td, { force: true });
        return NextResponse.json({
          ok: true,
          message: ok
            ? 'Detail akun berhasil diambil ulang dari WR & email dikirim.'
            : 'Transaksi belum punya account_details di WR (status: ' + (td.status || 'unknown') + ').',
        });
      }

      default:
        return NextResponse.json({ error: 'Aksi tidak dikenal.' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
