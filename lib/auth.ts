import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { getDb } from './db';

const COOKIE_NAME = 'gut_admin';
const MAX_AGE = 60 * 60 * 8;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET wajib di-set minimal 32 karakter di production.');
    }
    return 'dev-only-insecure-secret-change-me-please-and-make-it-long-enough';
  }
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

interface SessionPayload {
  id: number;
  u: string;
  iat: number;
  exp: number;
  pcv: string;
}

export function createSessionCookie(adminId: number, username: string, passwordChangedAt: string | null): string {
  const now = Math.floor(Date.now() / 1000);
  const data: SessionPayload = {
    id: adminId,
    u: username,
    iat: now,
    exp: now + MAX_AGE,
    pcv: pcvHash(passwordChangedAt),
  };
  const b64 = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = sign(b64);
  return `${b64}.${sig}`;
}

function pcvHash(pca: string | null): string {
  return crypto.createHash('sha256').update(pca || 'never').digest('base64url').slice(0, 12);
}

export function readSession(): { id: number; username: string } | null {
  const c = cookies().get(COOKIE_NAME);
  if (!c?.value) return null;
  const [b64, sig] = c.value.split('.');
  if (!b64 || !sig) return null;
  const expected = sign(b64);
  let expectedBuf: Buffer;
  let sigBuf: Buffer;
  try {
    expectedBuf = Buffer.from(expected);
    sigBuf = Buffer.from(sig);
  } catch {
    return null;
  }
  if (expectedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expectedBuf, sigBuf)) {
    return null;
  }
  let data: SessionPayload;
  try {
    data = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!data?.id || !data?.u || !data?.exp) return null;
  if (Math.floor(Date.now() / 1000) > data.exp) return null;

  const admin = getDb()
    .prepare('SELECT id, username, password_changed_at FROM admins WHERE id = ?')
    .get(data.id) as { id: number; username: string; password_changed_at: string | null } | undefined;
  if (!admin) return null;
  if (admin.username !== data.u) return null;
  if (data.pcv !== pcvHash(admin.password_changed_at)) return null;

  return { id: admin.id, username: admin.username };
}

export function setSessionCookie(value: string) {
  cookies().set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export function verifyAdminLogin(
  username: string,
  password: string,
): { id: number; username: string; password_changed_at: string | null } | null {
  const row = getDb()
    .prepare('SELECT id, username, password_hash, password_changed_at FROM admins WHERE username = ?')
    .get(username) as
    | { id: number; username: string; password_hash: string; password_changed_at: string | null }
    | undefined;
  if (!row) {
    bcrypt.compareSync(password, '$2a$12$abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcd');
    return null;
  }
  if (!bcrypt.compareSync(password, row.password_hash)) return null;
  return { id: row.id, username: row.username, password_changed_at: row.password_changed_at };
}

export function changeAdminPassword(adminId: number, newPassword: string) {
  const hash = bcrypt.hashSync(newPassword, 12);
  getDb()
    .prepare("UPDATE admins SET password_hash = ?, password_changed_at = datetime('now') WHERE id = ?")
    .run(hash, adminId);
}
