import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { adminApiGuard } from '@/lib/guard';

const Patch = z.object({
  name: z.string().min(1).optional(),
  duration_label: z.string().nullable().optional(),
  price: z.number().int().positive().optional(),
  description: z.string().nullable().optional(),
  is_active: z.number().int().min(0).max(1).optional(),
  discount_price: z.number().int().nullable().optional(),
  discount_label: z.string().max(40).nullable().optional(),
  discount_until: z.string().nullable().optional(),
  margin_mode: z.enum(['percent', 'fixed']).nullable().optional(),
  margin_value: z.number().int().min(0).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const g = adminApiGuard(req); if (g) return g;
  const id = Number(params.id);
  const body = Patch.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message || 'Bad input' }, { status: 400 });
  const allowed = ['name', 'duration_label', 'price', 'description', 'is_active', 'discount_price', 'discount_label', 'discount_until', 'margin_mode', 'margin_value'];
  const fields = Object.entries(body.data).filter(([k, v]) => allowed.includes(k) && v !== undefined);
  if (fields.length === 0) return NextResponse.json({ ok: true });

  if (body.data.discount_price !== undefined && body.data.discount_price !== null) {
    const variant = getDb().prepare('SELECT price FROM variants WHERE id = ?').get(id) as { price: number } | undefined;
    if (variant && body.data.discount_price >= variant.price) {
      return NextResponse.json({ error: 'Harga diskon harus lebih kecil dari harga normal.' }, { status: 400 });
    }
    if (body.data.discount_price < 500) {
      return NextResponse.json({ error: 'Harga diskon minimal Rp500.' }, { status: 400 });
    }
  }

  const set = fields.map(([k]) => `${k} = ?`).join(', ');
  const values = fields.map(([, v]) => v as any);
  getDb().prepare(`UPDATE variants SET ${set} WHERE id = ?`).run(...values, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const g = adminApiGuard(req); if (g) return g;
  const id = Number(params.id);
  const db = getDb();
  const used = db.prepare('SELECT COUNT(*) AS n FROM orders WHERE variant_id = ?').get(id) as { n: number };
  if (used.n > 0) {
    return NextResponse.json({ error: 'Varian pernah dipesan. Nonaktifkan saja.' }, { status: 409 });
  }
  db.prepare('DELETE FROM variants WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
