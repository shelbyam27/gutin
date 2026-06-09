interface Bucket {
  count: number;
  resetAt: number;
  lockUntil?: number;
}

const buckets = new Map<string, Bucket>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCK_MS = 30 * 60 * 1000;
const LOGIN_MAX = 6;

const ORDER_WINDOW_MS = 60 * 1000;
const ORDER_MAX = 10;

const STATUS_WINDOW_MS = 60 * 1000;
const STATUS_MAX = 60;

function cleanup(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) {
    if (b.resetAt < now && (!b.lockUntil || b.lockUntil < now)) buckets.delete(k);
  }
}

export interface RateResult {
  ok: boolean;
  retryAfter: number;
  message?: string;
}

export function rateLogin(ip: string): RateResult {
  const now = Date.now();
  cleanup(now);
  const key = `login:${ip}`;
  const b = buckets.get(key);
  if (b?.lockUntil && b.lockUntil > now) {
    return { ok: false, retryAfter: Math.ceil((b.lockUntil - now) / 1000), message: 'Terlalu banyak percobaan. Coba lagi nanti.' };
  }
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  if (b.count > LOGIN_MAX) {
    b.lockUntil = now + LOGIN_LOCK_MS;
    return { ok: false, retryAfter: Math.ceil(LOGIN_LOCK_MS / 1000), message: 'Akun dikunci sementara karena terlalu banyak percobaan login.' };
  }
  return { ok: true, retryAfter: 0 };
}

export function clearLoginBucket(ip: string) {
  buckets.delete(`login:${ip}`);
}

export function rateOrder(ip: string): RateResult {
  const now = Date.now();
  const key = `order:${ip}`;
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + ORDER_WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  if (b.count > ORDER_MAX) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000), message: 'Terlalu banyak permintaan. Tunggu sebentar.' };
  }
  return { ok: true, retryAfter: 0 };
}

export function rateStatus(ip: string): RateResult {
  const now = Date.now();
  const key = `status:${ip}`;
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + STATUS_WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  if (b.count > STATUS_MAX) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}
