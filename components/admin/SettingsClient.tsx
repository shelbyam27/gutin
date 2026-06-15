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
  wr_api_key: string;
  wr_base_url: string;
  wr_default_margin_mode: string;
  wr_default_margin_value: string;
  wr_min_margin_rp: string;
  wr_round_to: string;
  notifier_url: string;
  notifier_secret: string;
  notifier_events: string;
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

  async function testWr() {
    setBusy('wr'); setMsg(null);
    try {
      const save = await fetch('/api/admin/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wr_api_key: s.wr_api_key, wr_base_url: s.wr_base_url }),
      });
      if (!save.ok) throw new Error('Gagal simpan API key sebelum tes.');
      const r = await fetch('/api/admin/wr/balance', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Gagal');
      const bal = Number(d?.balance ?? 0);
      setMsg({ kind: 'ok', text: `Warung Rebahan terhubung. Saldo: Rp ${bal.toLocaleString('id-ID')}` });
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    } finally { setBusy(null); }
  }

  async function testNotifier() {
    setBusy('notifier'); setMsg(null);
    try {
      const save = await fetch('/api/admin/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifier_url: s.notifier_url, notifier_secret: s.notifier_secret, notifier_events: s.notifier_events }),
      });
      if (!save.ok) throw new Error('Gagal simpan webhook URL sebelum tes.');
      const r = await fetch('/api/admin/test-notifier', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Gagal');
      setMsg({ kind: 'ok', text: 'Test notifikasi terkirim. Cek tujuan webhook kamu.' });
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    } finally { setBusy(null); }
  }

  function toggleEvent(ev: string) {
    const cur = new Set(s.notifier_events.split(',').map((x) => x.trim()).filter(Boolean));
    if (cur.has(ev)) cur.delete(ev); else cur.add(ev);
    setS((p) => ({ ...p, notifier_events: Array.from(cur).join(',') }));
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

      <Section title="Warung Rebahan API"
               action={<button type="button" onClick={testWr} disabled={busy === 'wr'} className="btn btn-secondary !text-xs">{busy === 'wr' ? 'Mengecek...' : 'Tes Koneksi & Saldo'}</button>}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className="label">API Key</label><input type="password" className="input font-mono" placeholder="Generate di dashboard Warung Rebahan → API Settings" value={s.wr_api_key} onChange={f('wr_api_key')} /></div>
          <div className="sm:col-span-2"><label className="label">Base URL</label><input className="input font-mono text-xs" value={s.wr_base_url} onChange={f('wr_base_url')} /></div>
          <div>
            <label className="label">Margin Default — Mode</label>
            <select className="select" value={s.wr_default_margin_mode} onChange={f('wr_default_margin_mode')}>
              <option value="percent">Persentase (%)</option>
              <option value="fixed">Nominal Rupiah (+Rp)</option>
            </select>
          </div>
          <div>
            <label className="label">Margin Default — Nilai</label>
            <input type="number" className="input" value={s.wr_default_margin_value} onChange={f('wr_default_margin_value')} />
            <p className="text-[11px] text-muted mt-1">{s.wr_default_margin_mode === 'percent' ? 'Contoh: 15 berarti +15% di atas harga modal.' : 'Contoh: 5000 berarti +Rp5.000 per varian.'}</p>
          </div>
          <div>
            <label className="label">Margin Minimum (Rp)</label>
            <input type="number" className="input" value={s.wr_min_margin_rp} onChange={f('wr_min_margin_rp')} />
            <p className="text-[11px] text-muted mt-1">Selisih minimum harga jual − modal. Pakai 0 kalau ga perlu.</p>
          </div>
          <div>
            <label className="label">Pembulatan ke Kelipatan (Rp)</label>
            <input type="number" className="input" value={s.wr_round_to} onChange={f('wr_round_to')} />
            <p className="text-[11px] text-muted mt-1">Mis. 500 → harga akan dibulatkan ke atas per Rp500.</p>
          </div>
          <div className="sm:col-span-2 rounded-btn bg-surface-2 p-3 text-xs">
            <div className="text-muted mb-1">URL Webhook (set di dashboard Warung Rebahan):</div>
            <div className="font-mono break-all">{baseUrl ? `${baseUrl.replace(/\/$/, '')}/api/wr/webhook` : 'Set PUBLIC_BASE_URL di .env'}</div>
            <div className="text-muted mt-2">Signature divalidasi pakai API key sebagai HMAC-SHA256 secret (header <code className="font-mono">X-Rebahan-Signature</code>).</div>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <a href="/admin/wr" className="btn btn-primary !text-xs">Buka Importer Produk →</a>
          </div>
        </div>
      </Section>

      <Section title="Notifikasi Webhook (Order Events)"
               action={<button type="button" onClick={testNotifier} disabled={busy === 'notifier' || !s.notifier_url} className="btn btn-secondary !text-xs">{busy === 'notifier' ? 'Mengirim...' : 'Tes Kirim'}</button>}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Webhook URL</label>
            <input className="input font-mono text-xs" placeholder="https://discord.com/api/webhooks/... atau endpoint custom kamu" value={s.notifier_url} onChange={f('notifier_url')} />
            <p className="text-[11px] text-muted mt-1">Discord webhook auto-format jadi embed cantik. Telegram pakai format <code className="font-mono">https://api.telegram.org/bot&lt;TOKEN&gt;/sendMessage?chat_id=&lt;ID&gt;</code>. URL lain dapet JSON raw + header <code className="font-mono">X-Notifier-Signature</code>.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Secret (HMAC SHA-256, opsional)</label>
            <input type="password" className="input font-mono" placeholder="Kosongkan kalau Discord/Telegram" value={s.notifier_secret} onChange={f('notifier_secret')} />
            <p className="text-[11px] text-muted mt-1">Cuma dipakai untuk webhook custom. Verifikasi: <code className="font-mono">hmac_sha256(secret, body)</code> = header <code className="font-mono">X-Notifier-Signature</code>.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Event yang Dikirim</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'order.created', label: 'Order Dibuat (pending)' },
                { id: 'order.paid', label: 'Pembayaran Diterima' },
                { id: 'order.delivered', label: 'Pesanan Terkirim' },
                { id: 'order.failed', label: 'Pesanan Gagal' },
              ].map((ev) => {
                const enabled = s.notifier_events.split(',').map((x) => x.trim()).includes(ev.id);
                return (
                  <label key={ev.id} className="flex items-center gap-2 text-sm border rounded-btn px-3 py-2 cursor-pointer">
                    <input type="checkbox" className="accent-brand-from" checked={enabled} onChange={() => toggleEvent(ev.id)} />
                    <span><span className="font-mono text-xs text-muted">{ev.id}</span><br />{ev.label}</span>
                  </label>
                );
              })}
            </div>
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
