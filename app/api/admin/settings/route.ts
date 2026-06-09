import { NextRequest, NextResponse } from 'next/server';
import { setSetting } from '@/lib/settings';
import { adminApiGuard } from '@/lib/guard';

const ALLOWED = new Set([
  'brand_name', 'brand_tagline', 'whatsapp_contact',
  'pakasir_project', 'pakasir_api_key', 'pakasir_webhook_secret',
  'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from',
]);

export async function POST(req: NextRequest) {
  const g = adminApiGuard(req); if (g) return g;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED.has(k)) continue;
    setSetting(k, String(v ?? ''));
  }
  return NextResponse.json({ ok: true });
}
