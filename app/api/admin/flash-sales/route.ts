import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { adminApiGuard } from '@/lib/guard';

const Body = z.object({
  variant_id: z.number().int().positive(),
  flash_price: z.number().int().min(500),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
  max_qty: z.number().int().positive().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const g = adminApiGuard(req); if (g) return g;
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message || 'Bad input' }, { status: 400 });
  }
  const { variant_id, flash_price, starts_at, ends_at, max_qty } = body.data;

  const start = Date.parse(starts_at);
  const end = Date.parse(ends_at);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return NextResponse.json({ error: 'Format tanggal tidak valid.' }, { status: 400 });
  }
  if (end <= start) {
    return NextResponse.json({ error: 'Waktu berakhir harus setelah waktu mulai.' }, { status: 400 });
  }

  const db = getDb();
  const variant = db.prepare('SELECT id, price, is_active FROM variants WHERE id = ?').get(variant_id) as
    | { id: number; price: number; is_active: number }
    | undefined;
  if (!variant || !variant.is_active) {
    return NextResponse.json({ error: 'Varian tidak ditemukan / nonaktif.' }, { status: 404 });
  }
  if (flash_price >= variant.price) {
    return NextResponse.json({ error: 'Harga flash sale harus lebih kecil dari harga normal.' }, { status: 400 });
  }

  const r = db.prepare(
    `INSERT INTO flash_sales (variant_id, flash_price, starts_at, ends_at, max_qty, sold_qty, is_active)
     VALUES (?, ?, ?, ?, ?, 0, 1)`,
  ).run(variant_id, flash_price, new Date(start).toISOString(), new Date(end).toISOString(), max_qty ?? null);

  return NextResponse.json({ id: Number(r.lastInsertRowid) });
}
