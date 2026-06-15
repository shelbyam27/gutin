import { NextRequest, NextResponse } from 'next/server';
import { adminApiGuard } from '@/lib/guard';
import { notifyOrder, buildPayload } from '@/lib/notifier';
import { getSetting } from '@/lib/settings';

export async function POST(req: NextRequest) {
  const g = adminApiGuard(req); if (g) return g;
  const url = getSetting('notifier_url').trim();
  if (!url) return NextResponse.json({ error: 'Webhook URL belum diisi.' }, { status: 400 });

  const sample = buildPayload('order.created', {
    code: 'INV-TEST-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    product_name: 'Test Produk',
    variant_name: '1 Bulan Sharing',
    amount: 25000,
    fee: 0,
    total: 25000,
    email: 'test@example.com',
    whatsapp: '6281234567890',
    status: 'pending',
    payment_method: 'qris',
    created_at: new Date().toISOString(),
  });

  notifyOrder(sample);
  return NextResponse.json({ ok: true });
}
