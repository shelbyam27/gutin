import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { adminApiGuard } from '@/lib/guard';

const Patch = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  category: z.string().min(1).optional(),
  short_desc: z.string().optional(),
  long_desc: z.string().optional(),
  image: z.string().optional(),
  brand_color: z.string().optional(),
  is_active: z.number().int().min(0).max(1).optional(),
  sort_order: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const g = adminApiGuard(req); if (g) return g;
  const id = Number(params.id);
  const body = Patch.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message || 'Bad input' }, { status: 400 });

  const fields = Object.entries(body.data).filter(([, v]) => v !== undefined);
  if (fields.length === 0) return NextResponse.json({ ok: true });

  const db = getDb();

  if (body.data.image !== undefined) {
    const current = db.prepare('SELECT image FROM products WHERE id = ?').get(id) as { image: string | null } | undefined;
    const incoming = body.data.image ?? '';
    if ((current?.image || '') !== incoming) {
      fields.push(['image_locked', 1] as [string, any]);
    }
  }

  const set = fields.map(([k]) => `${k} = ?`).join(', ');
  const values = fields.map(([, v]) => v as any);
  db.prepare(`UPDATE products SET ${set} WHERE id = ?`).run(...values, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const g = adminApiGuard(req); if (g) return g;
  const id = Number(params.id);
  const db = getDb();
  const used = db.prepare(
    `SELECT COUNT(*) AS n FROM orders o JOIN variants v ON v.id = o.variant_id WHERE v.product_id = ?`,
  ).get(id) as { n: number };
  if (used.n > 0) {
    return NextResponse.json({ error: 'Produk pernah dipesan, tidak bisa dihapus. Nonaktifkan saja.' }, { status: 409 });
  }
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
