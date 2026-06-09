'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SettingsForm {
  brand_name: string;
  brand_tagline: string;
  whatsapp_contact: string;
  pakasir_project: string;
  pakasir_api_key: string;
  pakasir_webhook_secret: string;
  smtp_host: string;
  smtp_port: string;
  smtp_secure: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
}

export default function SettingsClient({ initial, baseUrl }: { initial: SettingsForm; baseUrl: string }) {
  const [s, setS] = useState<SettingsForm>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [pwd1, setPwd1] = useState(''); const [pwd2, setPwd2] = useState('');
  const router = useRouter();

  function f<K extends keyof SettingsForm>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setS((p) => ({ ...p, [k]: e.target.value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy('save'); setMsg(null);
    try {
      const r = await fetch('/api/admin/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s),
      });
      if (!r.ok) throw new Error('Gagal simpan');
      setMsg({ kind: 'ok', text: 'Pengaturan tersimpan.' });
      router.refresh();
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    } finally { setBusy(null); }
  }

  async function testSmtp() {
    const to = prompt('Kirim email tes ke alamat:');
    if (!to) return;
    setBusy('smtp'); setMsg(null);
    try {
      const r = await fetch('/api/admin/test-smtp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Gagal');
      setMsg({ kind: 'ok', text: `Email tes terkirim ke ${to}.` });
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    } finally { setBusy(null); }
  }

  async function testPakasir() {
    setBusy('pakasir'); setMsg(null);
    try {
      const r = await fetch('/api/admin/test-pakasir', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Gagal');
      setMsg({ kind: 'ok', text: 'Konfigurasi Pakasir valid (dummy transaksi sukses).' });
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    } finally { setBusy(null); }
  }

  async function changePassword() {
    if (pwd1 !== pwd2) { setMsg({ kind: 'err', text: 'Password tidak sama.' }); return; }
    if (pwd1.length < 8) { setMsg({ kind: 'err', text: 'Minimal 8 karakter.' }); return; }
    setBusy('pwd');
    try {
      const r = await fetch('/api/admin/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd1 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Gagal');
      setMsg({ kind: 'ok', text: 'Password diperbarui.' });
      setPwd1(''); setPwd2('');
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    } finally { setBusy(null); }
  }

  const webhookUrl = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/api/pakasir/webhook${s.pakasir_webhook_secret ? `?secret=${encodeURIComponent(s.pakasir_webhook_secret)}` : ''}`
    : 'Set PUBLIC_BASE_URL di .env';

  return (
    <form onSubmit={save} className="space-y-6">
      {msg && (
        <div className={`text-sm rounded-btn px-3 py-2 ${msg.kind === 'ok' ? 'bg-success/10 text-success border border-success/30' : 'bg-danger/10 text-danger border border-danger/30'}`}>
          {msg.text}
        </div>
      )}

      <Section title="Brand">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label">Nama Brand</label><input className="input" value={s.brand_name} onChange={f('brand_name')} /></div>
          <div><label className="label">Tagline</label><input className="input" value={s.brand_tagline} onChange={f('brand_tagline')} /></div>
          <div className="sm:col-span-2"><label className="label">WhatsApp Kontak (62...)</label><input className="input font-mono" placeholder="6281234567890" value={s.whatsapp_contact} onChange={f('whatsapp_contact')} /></div>
        </div>
      </Section>

      <Section title="Pakasir Payment Gateway"
               action={<button type="button" onClick={testPakasir} disabled={busy === 'pakasir'} className="btn btn-secondary !text-xs">{busy === 'pakasir' ? 'Mengecek...' : 'Tes Koneksi'}</button>}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label">Project Slug</label><input className="input" value={s.pakasir_project} onChange={f('pakasir_project')} /></div>
          <div><label className="label">API Key</label><input type="password" className="input font-mono" value={s.pakasir_api_key} onChange={f('pakasir_api_key')} /></div>
          <div className="sm:col-span-2"><label className="label">Webhook Secret (opsional)</label><input className="input font-mono" placeholder="Kosongkan kalau tidak pakai verifikasi" value={s.pakasir_webhook_secret} onChange={f('pakasir_webhook_secret')} /></div>
          <div className="sm:col-span-2 rounded-btn bg-surface-2 p-3 text-xs">
            <div className="text-muted mb-1">URL Webhook (set di dashboard Pakasir):</div>
            <div className="font-mono break-all">{webhookUrl}</div>
          </div>
        </div>
      </Section>

      <Section title="Email SMTP"
               action={<button type="button" onClick={testSmtp} disabled={busy === 'smtp'} className="btn btn-secondary !text-xs">{busy === 'smtp' ? '...' : 'Tes Kirim Email'}</button>}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label">Host</label><input className="input" placeholder="smtp.gmail.com" value={s.smtp_host} onChange={f('smtp_host')} /></div>
          <div><label className="label">Port</label><input className="input" placeholder="587" value={s.smtp_port} onChange={f('smtp_port')} /></div>
          <div>
            <label className="label">Secure</label>
            <select className="select" value={s.smtp_secure} onChange={f('smtp_secure')}>
              <option value="false">false (STARTTLS, port 587)</option>
              <option value="true">true (SSL, port 465)</option>
            </select>
          </div>
          <div><label className="label">From Address</label><input className="input" placeholder="GutInc Store &lt;noreply@gut.id&gt;" value={s.smtp_from} onChange={f('smtp_from')} /></div>
          <div><label className="label">User</label><input className="input" value={s.smtp_user} onChange={f('smtp_user')} /></div>
          <div><label className="label">Password / App Password</label><input type="password" className="input font-mono" value={s.smtp_pass} onChange={f('smtp_pass')} /></div>
        </div>
      </Section>

      <Section title="Akun Admin">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label">Password Baru</label><input type="password" className="input" value={pwd1} onChange={(e) => setPwd1(e.target.value)} /></div>
          <div><label className="label">Konfirmasi</label><input type="password" className="input" value={pwd2} onChange={(e) => setPwd2(e.target.value)} /></div>
        </div>
        <button type="button" onClick={changePassword} disabled={busy === 'pwd' || !pwd1 || !pwd2} className="btn btn-secondary mt-3">
          {busy === 'pwd' ? '...' : 'Ubah Password'}
        </button>
      </Section>

      <div className="flex justify-end">
        <button type="submit" disabled={busy === 'save'} className="btn btn-primary">{busy === 'save' ? 'Menyimpan...' : 'Simpan Pengaturan'}</button>
      </div>
    </form>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold">{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}
