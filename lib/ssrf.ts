/**
 * SSRF guard: tolak URL yang mengarah ke localhost, private network, atau
 * link-local. Dipakai untuk outbound fetch yang URL-nya berasal dari config
 * yang bisa diubah admin (notifier_url, wr_base_url, dll).
 *
 * Catatan: ini cek berdasarkan hostname literal. DNS rebinding mitigation
 * (resolve dulu, cek IP) tidak diimplement di sini karena fetch() akan resolve
 * sendiri pada saat call. Untuk threat-model yang ada (admin compromised),
 * literal-host check sudah cukup mengurangi blast radius.
 */
const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata',
  '0.0.0.0',
]);

function ipIsBlocked(ip: string): boolean {
  if (!ip) return false;
  if (ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0') return true;
  if (/^127\./.test(ip)) return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (/^169\.254\./.test(ip)) return true; // AWS/GCP metadata
  if (/^100\.64\./.test(ip)) return true; // CGNAT
  if (/^0\./.test(ip)) return true;
  // IPv6
  if (/^::1$/.test(ip)) return true;
  if (/^fe80:/i.test(ip)) return true;
  if (/^fc/i.test(ip) || /^fd/i.test(ip)) return true;
  if (/^::ffff:127\./i.test(ip)) return true;
  if (/^::ffff:10\./i.test(ip)) return true;
  if (/^::ffff:169\.254\./i.test(ip)) return true;
  return false;
}

export function assertSafeOutboundUrl(raw: string, ctx = 'URL'): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${ctx} tidak valid.`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${ctx} harus pakai http(s)://, bukan ${url.protocol}`);
  }
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) {
    throw new Error(`${ctx} mengarah ke host internal yang diblokir: ${host}`);
  }
  // Strip IPv6 brackets if present
  const bare = host.replace(/^\[|\]$/g, '');
  if (ipIsBlocked(bare)) {
    throw new Error(`${ctx} mengarah ke alamat internal yang diblokir: ${bare}`);
  }
  return url;
}

export function isSafeOutboundUrl(raw: string): boolean {
  try {
    assertSafeOutboundUrl(raw);
    return true;
  } catch {
    return false;
  }
}
