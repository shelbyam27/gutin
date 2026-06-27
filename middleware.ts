import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROD = process.env.NODE_ENV === 'production';

// CSP: strict by default. Inline styles diizinkan karena React/Tailwind sering inject
// style attribute (mis. brand_color, animasi). Inline scripts ditolak — Next.js
// menggunakan nonce/external bundle. img-src data: untuk QR code yang di-render canvas
// dan kemudian ke <img src="data:...">.
// Kalau ada error CSP di console (gambar produk ke-block, dll), tambahin host-nya
// di `imgSrc` di bawah.
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'", // 'unsafe-inline' karena Next 14 masih emit inline bootstrap
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join('; ');

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-DNS-Prefetch-Control', 'off');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  res.headers.set('Content-Security-Policy', CSP_DIRECTIVES);

  if (PROD) {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  const path = req.nextUrl.pathname;
  if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|favicon.svg|robots.txt).*)',
  ],
};
