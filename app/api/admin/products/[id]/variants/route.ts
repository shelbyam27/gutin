import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { adminApiGuard } from '@/lib/guard';

const Body = z.object({
  name: z.string().min(1),
  duration_label: z.string().optional().default(''),
  price: z.number().int().positive(),
  description: z.string().optional().default(''),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const g = adminApiGuard(req); if (g) return g;
  const productId = Number(params.id);
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message || 'Bad input' }, { status: 400 });
  const r = getDb().prepare(
    `INSERT INTO variants (product_id, name, duration_label, price, description, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
  ).run(productId, body.data.name, body.data.duration_label, body.data.price, body.data.description);
  return NextResponse.json({ id: Number(r.lastInsertRowid) });
}
