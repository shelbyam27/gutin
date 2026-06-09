import { getDb } from '@/lib/db';
import { getSetting, formatIDR } from '@/lib/settings';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CredentialList from '@/components/CredentialList';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { OrderRow } from '@/lib/delivery';

export const dynamic = 'force-dynamic';

function loadOrder(code: string): OrderRow | null {
  return (getDb()
    .prepare('SELECT * FROM orders WHERE code = ?')
    .get(code) as OrderRow | undefined) ?? null;
}

export default function OrderPage({ params }: { params: { code: string } }) {
  const order = loadOrder(params.code);
  if (!order) notFound();

  const brand = getSetting('brand_name') || 'GutInc Store';
  const wa = getSetting('whatsapp_contact') || '';
  const waLink = wa
    ? `https://wa.me/${wa.replace(/[^0-9]/g, '')}?text=Halo+admin%2C+saya+butuh+bantuan+terkait+pesanan+${order.code}`
    : '#';

  const isDone = order.status === 'delivered';
  const isPaid = order.status === 'paid';
  const isPending = order.status === 'pending';

  return (
    <>
      <Navbar brand={brand} />
      <div className="container-page py-8 max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-muted hover:text-text inline-flex items-center gap-1.5 mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.4" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          Beranda
        </Link>

        <div className="card p-6 sm:p-8">
          {isDone && (
            <div className="text-center pb-6 border-b">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                   style={{ background: 'rgba(34,197,94,.15)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                     stroke="rgb(var(--success))" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div className="font-bold text-xl mt-3">Pembayaran Berhasil</div>
              <div className="text-sm text-muted mt-1">Akun kamu sudah aktif dan siap digunakan.</div>
            </div>
          )}

          {isPaid && (
            <div className="text-center pb-6 border-b">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                   style={{ background: 'rgba(234,179,8,.15)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                     stroke="rgb(var(--warning))" strokeWidth="2.4" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
              </div>
              <div className="font-bold text-xl mt-3">Pembayaran Diterima</div>
              <div className="text-sm text-muted mt-1">
                Stok sedang diisi admin. Akun akan dikirim via email maksimal 1×24 jam.
              </div>
            </div>
          )}

          {isPending && (
            <div className="text-center pb-6 border-b">
              <div className="font-bold text-xl">Menunggu Pembayaran</div>
              <Link href={`/bayar/${order.code}`} className="btn btn-primary mt-3">
                Bayar Sekarang
              </Link>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <Field label="ID Transaksi" value={order.code} mono />
            <Field label="Tanggal" value={order.created_at} />
            <Field label="Produk" value={order.product_name} />
            <Field label="Paket" value={order.variant_name} />
            <Field label="Email" value={order.email} />
            <Field label="Total" value={formatIDR(order.total)} />
          </div>

          {isDone && order.delivered_content && (
            <div className="mt-6">
              <div className="font-semibold mb-3">Detail Akun</div>
              <CredentialList content={order.delivered_content} />
              <p className="text-xs text-muted mt-3">
                Detail juga sudah dikirim ke <span className="font-semibold">{order.email}</span>.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              Hubungi Admin (WhatsApp)
            </a>
            <Link href="/" className="btn btn-secondary">Belanja Lagi</Link>
          </div>
        </div>
      </div>
      <Footer brand={brand} whatsapp={wa} />
    </>
  );
}

function Field({
  label, value, mono,
}: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-btn bg-surface-2 p-3">
      <div className="text-[11px] text-muted uppercase tracking-wide">{label}</div>
      <div className={`text-sm font-medium ${mono ? 'font-mono' : ''} mt-0.5 break-all`}>{value}</div>
    </div>
  );
}
