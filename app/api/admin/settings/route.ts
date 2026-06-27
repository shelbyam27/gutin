import { NextRequest, NextResponse } from 'next/server';
import { setSetting } from '@/lib/settings';
import { adminApiGuard } from '@/lib/guard';
import { ensureWrScheduler } from '@/lib/wrScheduler';
import { assertSafeOutboundUrl } from '@/lib/ssrf';

const ALLOWED = new Set([
  'brand_name', 'brand_tagline', 'whatsapp_contact',
  'pakasir_project', 'pakasir_api_key', 'pakasir_webhook_secret',
  'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from',
  'wr_api_key', 'wr_base_url',
  'wr_default_margin_mode', 'wr_default_margin_value',
  'wr_min_margin_rp', 'wr_round_to', 'wr_test_mode',
  'wr_auto_sync_enabled', 'wr_auto_sync_interval_minutes',
  'notifier_url', 'notifier_secret', 'notifier_events',
]);

// Field yang harus lolos SSRF check sebelum disimpan.
const URL_FIELDS = new Set(['wr_base_url', 'notifier_url']);

export async function POST(req: NextRequest) {
  const g = adminApiGuard(req); if (g) return g;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // Validasi URL fields sebelum nyimpan apapun (all-or-nothing).
  for (const k of URL_FIELDS) {
    if (k in body) {
      const v = String(body[k] ?? '').trim();
      if (v) {
        try {
          assertSafeOutboundUrl(v, k);
        } catch (e) {
          return NextResponse.json({ error: (e as Error).message }, { status: 400 });
        }
      }
    }
  }

  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED.has(k)) continue;
    setSetting(k, String(v ?? ''));
  }
  try { ensureWrScheduler(); } catch {}
  return NextResponse.json({ ok: true });
}
