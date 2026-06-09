import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { adminApiGuard } from '@/lib/guard';

const Body = z.object({
  items: z.array(z.string().min(3)).min(1),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const g = adminApiGuard(req); if (g) return g;
  const variantId = Number(params.id);
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message || 'Bad input' }, { status: 400 });

  const db = getDb();
  const exists = db.prepare('SELECT id FROM variants WHERE id = ?').get(variantId);
  if (!exists) return NextResponse.json({ error: 'Varian tidak ditemukan.' }, { status: 404 });

  const ins = db.prepare('INSERT INTO credentials (variant_id, content) VALUES (?, ?)');
  const tx = db.transaction((items: string[]) => {
    for (const it of items) ins.run(variantId, it);
  });
  tx(body.data.items);

  return NextResponse.json({ ok: true, added: body.data.items.length });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const g = adminApiGuard(req); if (g) return g;
  const variantId = Number(params.id);
  const url = new URL(req.url);
  const onlySold = url.searchParams.get('clearSold') === '1';
  if (!onlySold) {
    return NextResponse.json({ error: 'Hanya stok yang sudah terjual yang bisa dibersihkan via endpoint ini.' }, { status: 400 });
  }
  const r = getDb().prepare(
    `DELETE FROM credentials WHERE variant_id = ? AND status = 'sold'`,
  ).run(variantId);
  return NextResponse.json({ ok: true, removed: r.changes });
}
