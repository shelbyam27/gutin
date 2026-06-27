import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { changeAdminPassword, verifyAdminPassword, readSession, clearSessionCookie } from '@/lib/auth';
import { adminApiGuard } from '@/lib/guard';
import { logAudit } from '@/lib/db';
import { getIp } from '@/lib/security';

const Body = z.object({
  current_password: z.string().min(1, 'Password lama wajib diisi.'),
  password: z.string().min(12, 'Password baru minimal 12 karakter.').max(200),
});

export async function POST(req: NextRequest) {
  const g = adminApiGuard(req); if (g) return g;
  const sess = readSession();
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Bad input' }, { status: 400 });
  }
  const { current_password, password } = parsed.data;

  if (current_password === password) {
    return NextResponse.json({ error: 'Password baru harus berbeda dari yang lama.' }, { status: 400 });
  }

  const ok = await verifyAdminPassword(sess.id, current_password);
  if (!ok) {
    logAudit(sess.id, 'change_password_failed', `wrong_current`, getIp(req));
    // Small jitter supaya nggak bisa probe valid current password via timing.
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 200));
    return NextResponse.json({ error: 'Password lama salah.' }, { status: 403 });
  }

  await changeAdminPassword(sess.id, password);
  logAudit(sess.id, 'change_password_success', `username=${sess.username}`, getIp(req));

  // Session cookie carries pcv (password-changed version) — clear it so the user
  // must log in again with the new password. All other sessions for this admin
  // are auto-invalidated by the pcv mismatch in readSession().
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
