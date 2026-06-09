import { allSettings } from '@/lib/settings';
import SettingsClient from '@/components/admin/SettingsClient';
import AdminShell from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

const KEYS = [
  'brand_name', 'brand_tagline', 'whatsapp_contact',
  'pakasir_project', 'pakasir_api_key', 'pakasir_webhook_secret',
  'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from',
] as const;

export default function AdminSettingsPage() {
  const all = allSettings();
  const initial: any = {};
  for (const k of KEYS) initial[k] = all[k] ?? '';
  if (!initial.smtp_secure) initial.smtp_secure = 'false';
  if (!initial.smtp_port) initial.smtp_port = '587';

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
