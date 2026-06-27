import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminLogin, createSessionCookie, setSessionCookie } from '@/lib/auth';
import { rateLogin, clearLoginBucket, rateLoginUsername, clearLoginUsernameBucket } from '@/lib/ratelimit';
import { checkSameOrigin, getIp } from '@/lib/security';
import { logAudit } from '@/lib/db';

const Body = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  if (!checkSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const ip = getIp(req);

  const limit = rateLogin(ip);
  if (!limit.ok) {
    return NextResponse.json(
      { error: limit.message || 'Terlalu banyak percobaan.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Input tidak valid.' }, { status: 400 });
  }

  // Second layer: rate-limit per-username supaya brute force satu akun tetap di-cap
  // walau attacker bisa rotate IP/spoof XFF dari berbagai source.
  const userLimit = rateLoginUsername(parsed.data.username);
  if (!userLimit.ok) {
    return NextResponse.json(
      { error: userLimit.message || 'Akun di-throttle.' },
      { status: 429, headers: { 'Retry-After': String(userLimit.retryAfter) } },
    );
  }

  await new Promise((r) => setTimeout(r, 250 + Math.random() * 250));

  const ok = await verifyAdminLogin(parsed.data.username, parsed.data.password);
  if (!ok) {
    logAudit(null, 'login_failed', `username=${parsed.data.username.slice(0, 32)}`, ip);
    return NextResponse.json(
      { error: 'Kredensial tidak valid.' },
      { status: 401 },
    );
  }

  clearLoginBucket(ip);
  clearLoginUsernameBucket(parsed.data.username);
  const cookie = createSessionCookie(ok.id, ok.username, ok.password_changed_at);
  setSessionCookie(cookie);
  logAudit(ok.id, 'login_success', `username=${ok.username}`, ip);
  return NextResponse.json({ ok: true });
}
