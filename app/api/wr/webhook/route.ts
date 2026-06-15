import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getSetting } from '@/lib/settings';
import { wrFindTransaction } from '@/lib/warungrebahan';
import { deliverFromWrTransaction } from '@/lib/delivery';
import { getDb } from '@/lib/db';

function timingEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export async function POST(req: NextRequest) {
  const apiKey = getSetting('wr_api_key').trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'WR API key belum diset' }, { status: 503 });
  }

  const raw = await req.text();
  const signature = req.headers.get('x-rebahan-signature') || req.headers.get('X-Rebahan-Signature') || '';
  const expected = crypto.createHmac('sha256', apiKey).update(raw).digest('hex');
  if (!signature || !timingEqual(signature, expected)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const event = String(payload?.event || '');
  const data = payload?.data || {};
  const wrOrderId = String(data?.order_id || '').trim();
  if (!wrOrderId) return NextResponse.json({ ok: true, ignored: true });

  const db = getDb();
  const order = db.prepare('SELECT id, status FROM orders WHERE wr_order_id = ?').get(wrOrderId) as
    | { id: number; status: string }
    | undefined;

  if (event === 'order.processing') {
    if (order) db.prepare(`UPDATE orders SET wr_status = 'processing' WHERE id = ?`).run(order.id);
    return NextResponse.json({ ok: true });
  }

  if (event === 'order.failed') {
    if (order) db.prepare(`UPDATE orders SET wr_status = 'failed' WHERE id = ?`).run(order.id);
    return NextResponse.json({ ok: true });
  }

  if (event === 'order.completed') {
    try {
      const td = await wrFindTransaction(wrOrderId);
      if (!td) return NextResponse.json({ ok: true, deferred: true });
      await deliverFromWrTransaction(td);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, event });
}
