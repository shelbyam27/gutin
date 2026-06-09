import { NextRequest, NextResponse } from 'next/server';
import { getTransactionDetail } from '@/lib/pakasir';
import { adminApiGuard } from '@/lib/guard';

export async function POST(req: NextRequest) {
  const g = adminApiGuard(req); if (g) return g;
  try {
    await getTransactionDetail('PROBE-' + Date.now(), 1);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = (e as Error).message;
    if (/404|not.*found|tidak ditemukan/i.test(msg)) {
      return NextResponse.json({ ok: true, note: 'Endpoint Pakasir merespon. Project & API key valid (transaksi probe tidak ditemukan, ini wajar).' });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
