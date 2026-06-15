import { NextRequest, NextResponse } from 'next/server';
import { adminApiGuard } from '@/lib/guard';
import { getDb } from '@/lib/db';
import { wrFindTransaction } from '@/lib/warungrebahan';
import { deliverFromWrTransaction } from '@/lib/delivery';

export async function POST(req: NextRequest) {
  const g = adminApiGuard(req); if (g) return g;

  const url = new URL(req.url);
  const onlyBroken = url.searchParams.get('only') !== 'all';
  const limitRaw = Number(url.searchParams.get('limit') || '50');
  const limit = Math.min(200, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 50));

  const db = getDb();
  const rows = db.prepare(
    `SELECT code, delivered_content FROM orders
     WHERE wr_order_id IS NOT NULL
       AND status = 'delivered'
     ORDER BY id DESC LIMIT ?`,
  ).all(limit) as Array<{ code: string; delivered_content: string | null }>;

  const targets = onlyBroken
    ? rows.filter((r) => !r.delivered_content || /\[object Object\]|label:|value:/i.test(r.delivered_content))
    : rows;

  const results: Array<{ code: string; status: string; message?: string }> = [];
  for (const r of targets) {
    const fresh = db.prepare('SELECT wr_order_id FROM orders WHERE code = ?').get(r.code) as { wr_order_id: string | null } | undefined;
    const wrId = fresh?.wr_order_id;
    if (!wrId) { results.push({ code: r.code, status: 'skip', message: 'no wr_order_id' }); continue; }
    try {
      const td = await wrFindTransaction(wrId);
      if (!td) { results.push({ code: r.code, status: 'skip', message: 'not found in WR' }); continue; }
      const ok = await deliverFromWrTransaction(td, { force: true });
      results.push({ code: r.code, status: ok ? 'recovered' : 'no_details' });
    } catch (e) {
      results.push({ code: r.code, status: 'error', message: (e as Error).message.slice(0, 120) });
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: rows.length,
    targeted: targets.length,
    recovered: results.filter((r) => r.status === 'recovered').length,
    results,
  });
}
