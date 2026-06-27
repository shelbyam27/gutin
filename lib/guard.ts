import { redirect, notFound } from 'next/navigation';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { readSession } from './auth';
import { checkSameOrigin } from './security';
import type { NextRequest } from 'next/server';

const TRUST_MODE = (process.env.TRUST_PROXY || 'auto').toLowerCase();

export function requireAdmin() {
  const s = readSession();
  if (!s) {
    redirect('/admin/login');
  }
  return s;
}

export function requireAdminOr404() {
  const s = readSession();
  if (!s) notFound();
  return s;
}

export function adminApiGuard(req?: NextRequest | Request): NextResponse | null {
  const s = readSession();
  if (!s) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (req) {
    const method = req.method.toUpperCase();
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      if (!checkSameOrigin(req)) {
        return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
      }
    }
  }
  return null;
}

export function getRequestIp(): string {
  // Server component context — sinkron dengan logic di lib/security.ts (getIp).
  // Pada server-actions/SSR, header asli dari TCP socket tidak terekspos via headers(),
  // jadi mau-tak-mau kita harus baca dari header. Pada production di belakang Cloudflare,
  // set TRUST_PROXY=cloudflare untuk pakai CF-Connecting-IP.
  const h = headers();
  if (TRUST_MODE === 'cloudflare' || TRUST_MODE === 'any' || TRUST_MODE === 'auto') {
    const cf = h.get('cf-connecting-ip');
    if (cf) return cf.trim();
  }
  if (TRUST_MODE === 'any') {
    const xff = h.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    const real = h.get('x-real-ip');
    if (real) return real;
  }
  return '0.0.0.0';
}
