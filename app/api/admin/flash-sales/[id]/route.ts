import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { adminApiGuard } from '@/lib/guard';

const Patch = z.object({
  flash_price: z.number().int().min(500).optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  max_qty: z.number().int().positive().nullable().optional(),
  is_active: z.number().int().min(0).max(1).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const g = adminApiGuard(req); if (g) return g;
  const id = Number(params.id);
  const body = Patch.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message || 'Bad input' }, { status: 400 });
  }

  const db = getDb();
  const current = db.prepare(
    `SELECT fs.*, v.price AS variant_price FROM flash_sales fs JOIN variants v ON v.id = fs.variant_id WHERE fs.id = ?`,
  ).get(id) as { id: number; variant_price: number; starts_at: string; ends_at: string } | undefined;
  if (!current) return NextResponse.json({ error: 'Tidak ditemukan.' }, { status: 404 });

  const data: any = { ...body.data };
  if (data.flash_price != null && data.flash_price >= current.variant_price) {
    return NextResponse.json({ error: 'Harga flash sale harus lebih kecil dari harga normal varian.' }, { status: 400 });
  }
  if (data.starts_at) {
    const t = Date.parse(data.starts_at);
    if (Number.isNaN(t)) return NextResponse.json({ error: 'Tanggal mulai tidak valid.' }, { status: 400 });
    data.starts_at = new Date(t).toISOString();
  }
  if (data.ends_at) {
    const t = Date.parse(data.ends_at);
    if (Number.isNaN(t)) return NextResponse.json({ error: 'Tanggal berakhir tidak valid.' }, { status: 400 });
    data.ends_at = new Date(t).toISOString();
  }
  const start = Date.parse(data.starts_at || current.starts_at);
  const end = Date.parse(data.ends_at || current.ends_at);
  if (end <= start) {
    return NextResponse.json({ error: 'Waktu berakhir harus setelah waktu mulai.' }, { status: 400 });
  }

  const fields = Object.entries(data).filter(([, v]) => v !== undefined);
  if (fields.length === 0) return NextResponse.json({ ok: true });
  const set = fields.map(([k]) => `${k} = ?`).join(', ');
  const values = fields.map(([, v]) => v as any);
  db.prepare(`UPDATE flash_sales SET ${set} WHERE id = ?`).run(...values, id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const g = adminApiGuard(req); if (g) return g;
  const id = Number(params.id);
  const db = getDb();
  const used = db.prepare('SELECT COUNT(*) AS n FROM orders WHERE flash_sale_id = ?').get(id) as { n: number };
  if (used.n > 0) {
    db.prepare('UPDATE flash_sales SET is_active = 0 WHERE id = ?').run(id);
    return NextResponse.json({ ok: true, deactivated: true, message: 'Flash sale pernah dipakai pesanan, dinonaktifkan saja.' });
  }
  db.prepare('DELETE FROM flash_sales WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
