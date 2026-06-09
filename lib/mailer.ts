import nodemailer from 'nodemailer';
import { getSetting } from './settings';
import { formatIDR } from './settings';

interface MailContent {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function buildTransport() {
  const host = getSetting('smtp_host');
  const portStr = getSetting('smtp_port') || '587';
  const user = getSetting('smtp_user');
  const pass = getSetting('smtp_pass');
  const secure = getSetting('smtp_secure') === 'true';
  if (!host || !user) throw new Error('SMTP belum dikonfigurasi.');
  return nodemailer.createTransport({
    host,
    port: parseInt(portStr, 10),
    secure,
    auth: { user, pass },
  });
}

function fromAddress(): string {
  const f = getSetting('smtp_from');
  if (f) return f;
  const u = getSetting('smtp_user');
  return u || 'no-reply@example.com';
}

export async function sendMail(c: MailContent): Promise<void> {
  const t = buildTransport();
  await t.sendMail({
    from: fromAddress(),
    to: c.to,
    subject: c.subject,
    html: c.html,
    text: c.text,
  });
}

export async function sendTestMail(to: string): Promise<void> {
  const brand = getSetting('brand_name') || 'Toko Digital';
  await sendMail({
    to,
    subject: `[Tes] SMTP ${brand} bekerja`,
    html: `<p>Halo,</p><p>Konfigurasi SMTP <b>${escapeHtml(brand)}</b> berjalan normal. Email akan dikirim ke pembeli setiap pembayaran berhasil.</p>`,
    text: `SMTP ${brand} bekerja normal.`,
  });
}

interface DeliveryArgs {
  to: string;
  brandName: string;
  orderCode: string;
  productName: string;
  variantName: string;
  total: number;
  credential: string | null;
  orderUrl: string;
}

export async function sendDeliveryMail(a: DeliveryArgs): Promise<void> {
  const fields = a.credential ? parseCredential(a.credential) : [];
  const credBlock = a.credential
    ? `<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:16px 0;width:100%;border:1px solid #e6e8ee;border-radius:10px;overflow:hidden">
        ${fields
          .map(
            (f) => `
        <tr>
          <td style="background:#f6f7fb;padding:10px 14px;color:#5b6573;font-size:13px;width:38%;border-bottom:1px solid #e6e8ee">${escapeHtml(f.label)}</td>
          <td style="padding:10px 14px;font-family:Menlo,Consolas,monospace;font-size:14px;color:#0f172a;border-bottom:1px solid #e6e8ee">${escapeHtml(f.value)}</td>
        </tr>`,
          )
          .join('')}
      </table>`
    : `<p style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;padding:12px 14px;border-radius:10px;margin:16px 0">
        Pembayaran kamu sudah kami terima, tapi stok untuk produk ini lagi habis. Admin akan kirim akun secara manual maksimal 1×24 jam. Kalau urgent, hubungi WhatsApp di halaman pesanan.
      </p>`;

  const html = `
  <div style="font-family:Segoe UI,Roboto,Arial,sans-serif;background:#f6f7fb;padding:24px;color:#0f172a">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e8ee">
      <div style="padding:20px 24px;background:linear-gradient(135deg,#6366f1,#06b6d4);color:#fff">
        <div style="font-size:13px;opacity:.85">${escapeHtml(a.brandName)}</div>
        <div style="font-size:20px;font-weight:700;margin-top:4px">Pesanan ${escapeHtml(a.orderCode)} berhasil!</div>
      </div>
      <div style="padding:20px 24px">
        <p style="margin:0 0 12px">Terima kasih sudah belanja. Berikut detail akun yang kamu beli:</p>
        <div style="font-size:14px;color:#5b6573">Produk</div>
        <div style="font-weight:600;margin-bottom:8px">${escapeHtml(a.productName)} — ${escapeHtml(a.variantName)}</div>
        <div style="font-size:14px;color:#5b6573">Total Pembayaran</div>
        <div style="font-weight:600;margin-bottom:12px">${escapeHtml(formatIDR(a.total))}</div>
        ${credBlock}
        <p style="margin:14px 0 0;color:#5b6573;font-size:13px">Simpan email ini sebagai bukti. Buka halaman pesanan kapan saja:</p>
        <p style="margin:8px 0 0"><a href="${escapeAttr(a.orderUrl)}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600">Buka Halaman Pesanan</a></p>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #e6e8ee;font-size:12px;color:#8a93a6">Email ini dikirim otomatis oleh sistem. Jangan balas.</div>
    </div>
  </div>`;

  await sendMail({
    to: a.to,
    subject: `[${a.brandName}] Pesanan ${a.orderCode} — ${a.productName}`,
    html,
    text: `Pesanan ${a.orderCode} berhasil. Buka ${a.orderUrl} untuk melihat detail.`,
  });
}

export function parseCredential(
  raw: string,
): Array<{ label: string; value: string }> {
  return raw
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf(':');
      if (idx === -1) return { label: 'Detail', value: part };
      return {
        label: capitalize(part.slice(0, idx).trim()),
        value: part.slice(idx + 1).trim(),
      };
    });
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string) {
  return escapeHtml(s);
}
