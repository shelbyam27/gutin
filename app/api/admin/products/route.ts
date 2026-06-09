import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { adminApiGuard } from '@/lib/guard';

const Body = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'slug harus a-z 0-9 -'),
  category: z.string().min(1),
  short_desc: z.string().optional().default(''),
  long_desc: z.string().optional().default(''),
  image: z.string().optional().default(''),
  brand_color: z.string().optional().default('#6366f1'),
});

export async function POST(req: NextRequest) {
  const g = adminApiGuard(req);
  if (g) return g;
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message || 'Bad input' }, { status: 400 });
  const db = getDb();
  const exists = db.prepare('SELECT id FROM products WHERE slug = ?').get(body.data.slug);
  if (exists) return NextResponse.json({ error: 'Slug sudah dipakai.' }, { status: 409 });
  const order = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM products').get() as { m: number }).m + 1;
  const r = db.prepare(
    `INSERT INTO products (slug, name, category, short_desc, long_desc, image, brand_color, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
  ).run(body.data.slug, body.data.name, body.data.category, body.data.short_desc, body.data.long_desc, body.data.image, body.data.brand_color, order);
  return NextResponse.json({ id: Number(r.lastInsertRowid) });
}
