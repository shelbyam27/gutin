import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { changeAdminPassword } from '@/lib/auth';
import { adminApiGuard } from '@/lib/guard';
import { readSession } from '@/lib/auth';

const Body = z.object({ password: z.string().min(8) });

export async function POST(req: NextRequest) {
  const g = adminApiGuard(req); if (g) return g;
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: 'Password minimal 8 karakter.' }, { status: 400 });
  const sess = readSession();
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  changeAdminPassword(sess.id, body.data.password);
  return NextResponse.json({ ok: true });
}
