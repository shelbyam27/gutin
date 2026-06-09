import { NextResponse } from 'next/server';
import { clearSessionCookie, readSession } from '@/lib/auth';
import { logAudit } from '@/lib/db';
import { getRequestIp } from '@/lib/guard';

export async function POST() {
  const s = readSession();
  if (s) logAudit(s.id, 'logout', '', getRequestIp());
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
