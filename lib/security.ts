import { NextRequest } from 'next/server';

/**
 * Trust list untuk proxy yang boleh mengisi X-Forwarded-For / X-Real-IP.
 * - Set env TRUST_PROXY=cloudflare untuk pakai CF-Connecting-IP saja.
 * - Set TRUST_PROXY=any kalau yakin Node berdiri di belakang nginx terpercaya.
 * - Default: hanya trust kalau remote address ada di private/loopback range
 *   (artinya request datang dari proxy lokal, bukan internet langsung).
 */
const TRUST_MODE = (process.env.TRUST_PROXY || 'auto').toLowerCase();

function isPrivateAddr(ip: string): boolean {
  if (!ip) return false;
  if (ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0') return true;
  // IPv4 private ranges
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (/^169\.254\./.test(ip)) return true; // link-local
  // IPv6 link-local & ULA
  if (/^fe80:/i.test(ip)) return true;
  if (/^fc/i.test(ip) || /^fd/i.test(ip)) return true;
  return false;
}

function rawRemoteAddr(req: NextRequest | Request): string {
  // Next.js Edge: req.ip; Node runtime: ambil dari NEXT_RUNTIME header fallback.
  // @ts-ignore - NextRequest has .ip in some versions; safe to access.
  const direct = (req as any).ip as string | undefined;
  if (direct) return direct;
  return '';
}

function parseFirstIp(h: string | null): string {
  if (!h) return '';
  const first = h.split(',')[0].trim();
  // Strip optional port (IPv4:port). IPv6 with brackets handled separately.
  if (/^\[.+\]:\d+$/.test(first)) return first.slice(1, first.indexOf(']'));
  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(first)) return first.split(':')[0];
  return first;
}

export function getIp(req: NextRequest | Request): string {
  const h = req.headers;
  const remote = rawRemoteAddr(req);

  // Cloudflare header tidak bisa di-spoof kalau benar lewat CF — CF strip client-side CF-Connecting-IP.
  // Tapi kalau Node exposed langsung ke internet, attacker bebas set sendiri.
  // Jadi kita hanya percaya kalau:
  //   - TRUST_MODE=cloudflare → percaya CF header tanpa cek remote
  //   - TRUST_MODE=any → percaya XFF dari mana saja (tidak disarankan)
  //   - auto (default) → percaya XFF/Real-IP HANYA kalau remote dari private/loopback
  //     (artinya proxy lokal); kalau remote dari internet publik, abaikan XFF.

  if (TRUST_MODE === 'cloudflare') {
    const cf = h.get('cf-connecting-ip');
    if (cf) return cf.trim();
  }

  if (TRUST_MODE === 'any' || (TRUST_MODE === 'auto' && (remote === '' || isPrivateAddr(remote)))) {
    const cf = h.get('cf-connecting-ip');
    if (cf) return cf.trim();
    const real = h.get('x-real-ip');
    if (real) return real.trim();
    const xff = parseFirstIp(h.get('x-forwarded-for'));
    if (xff) return xff;
  }

  if (remote) return remote;
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
