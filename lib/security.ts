import { NextRequest } from 'next/server';

export function getIp(req: NextRequest | Request): string {
  const h = req.headers;
  const xff = h.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = h.get('x-real-ip');
  if (real) return real;
  return '0.0.0.0';
}

export function checkSameOrigin(req: NextRequest | Request): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');
  if (!host) return false;

  if (origin) {
    try {
      const u = new URL(origin);
      return u.host === host;
    } catch {
      return false;
    }
  }
  if (referer) {
    try {
      const u = new URL(referer);
      return u.host === host;
    } catch {
      return false;
    }
  }
  return false;
}
