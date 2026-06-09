import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { getTransactionDetail } from '@/lib/pakasir';
import { finalizeOrder, markOrderPaid } from '@/lib/delivery';
import type { OrderRow } from '@/lib/delivery';
import crypto from 'node:crypto';

function timingEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const secretConfigured = getSetting('pakasir_webhook_secret').trim();
  if (secretConfigured) {
    const url = new URL(req.url);
    const tokenInUrl = url.searchParams.get('secret') || '';
    const tokenInHeader = req.headers.get('x-webhook-secret') || '';
    const provided = tokenInHeader || tokenInUrl;
    if (!provided || !timingEqual(provided, secretConfigured)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const orderId = String(body?.order_id || '').trim();
  const amount = Number(body?.amount || 0);
  const project = String(body?.project || '').trim();
  const status = String(body?.status || '').trim();
  if (!orderId || !amount || !/^[A-Z0-9-]{8,40}$/.test(orderId)) {
    return NextResponse.json({ error: 'Payload tidak valid' }, { status: 400 });
  }

  const expectedProject = getSetting('pakasir_project').trim();
  if (expectedProject && project && project !== expectedProject) {
    return NextResponse.json({ error: 'Project mismatch' }, { status: 400 });
  }

  const db = getDb();
  const order = db
    .prepare('SELECT * FROM orders WHERE code = ?')
    .get(orderId) as OrderRow | undefined;
  if (!order) {
    return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
  }
  if (order.amount !== amount && order.total !== amount) {
    return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
  }

  if (status !== 'completed') {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const detail = await getTransactionDetail(order.code, order.amount);
    if (detail?.status !== 'completed') {
      return NextResponse.json({ ok: true, deferred: true });
    }
  } catch (e) {
    console.warn('[webhook] re-check gagal:', (e as Error).message);
    return NextResponse.json({ ok: true, deferred: true });
  }

  markOrderPaid(order.code);
  const result = await finalizeOrder(order.code);

  return NextResponse.json({ ok: true, result: result.status });
}
