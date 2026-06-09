import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendTestMail } from '@/lib/mailer';
import { adminApiGuard } from '@/lib/guard';

const Body = z.object({ to: z.string().email() });

export async function POST(req: NextRequest) {
  const g = adminApiGuard(req); if (g) return g;
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: 'Email tidak valid.' }, { status: 400 });
  try {
    await sendTestMail(body.data.to);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
