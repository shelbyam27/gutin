import { allSettings } from '@/lib/settings';
import SettingsClient from '@/components/admin/SettingsClient';
import AdminShell from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

const KEYS = [
  'brand_name', 'brand_tagline', 'whatsapp_contact',
  'pakasir_project', 'pakasir_api_key', 'pakasir_webhook_secret',
  'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from',
  'wr_api_key', 'wr_base_url',
  'wr_default_margin_mode', 'wr_default_margin_value',
  'wr_min_margin_rp', 'wr_round_to', 'wr_test_mode',
  'notifier_url', 'notifier_secret', 'notifier_events',
] as const;

export default function AdminSettingsPage() {
  const all = allSettings();
  const initial: any = {};
  for (const k of KEYS) initial[k] = all[k] ?? '';
  if (!initial.smtp_secure) initial.smtp_secure = 'false';
  if (!initial.smtp_port) initial.smtp_port = '587';
  if (!initial.wr_base_url) initial.wr_base_url = 'https://warungrebahan.com/api/v1';
  if (!initial.wr_default_margin_mode) initial.wr_default_margin_mode = 'percent';
  if (!initial.wr_default_margin_value) initial.wr_default_margin_value = '15';
  if (!initial.wr_min_margin_rp) initial.wr_min_margin_rp = '1000';
  if (!initial.wr_round_to) initial.wr_round_to = '500';
  if (!initial.wr_test_mode) initial.wr_test_mode = 'false';
  if (!initial.notifier_events) initial.notifier_events = 'order.created,order.paid,order.delivered,order.failed';

  return (
    <AdminShell>
      <div className="container-page py-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Pengaturan</h1>
          <p className="text-sm text-muted">Brand, gateway pembayaran, email, dan akun admin.</p>
        </div>
        <SettingsClient initial={initial} baseUrl={process.env.PUBLIC_BASE_URL || ''} />
      </div>
    </AdminShell>
  );
}
