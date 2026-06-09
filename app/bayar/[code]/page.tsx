import { getDb } from '@/lib/db';
import { getSetting, formatIDR } from '@/lib/settings';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import QrisPay from '@/components/QrisPay';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { OrderRow } from '@/lib/delivery';

export const dynamic = 'force-dynamic';

function loadOrder(code: string): OrderRow | null {
  return (getDb()
    .prepare('SELECT * FROM orders WHERE code = ?')
    .get(code) as OrderRow | undefined) ?? null;
}

export default function PayPage({ params }: { params: { code: string } }) {
  const order = loadOrder(params.code);
  if (!order) notFound();

  const brand = getSetting('brand_name') || 'GutInc Store';
  const wa = getSetting('whatsapp_contact') || '';

  if (order.status === 'delivered' || order.status === 'paid') {
    return (
      <>
        <Navbar brand={brand} />
        <div className="container-page py-12 max-w-xl mx-auto text-center">
          <div className="card p-8">
            <div className="font-semibold text-success">Pembayaran sudah diterima.</div>
            <Link href={`/pesanan/${order.code}`} className="btn btn-primary mt-4">
              Lihat Pesanan
            </Link>
          </div>
        </div>
        <Footer brand={brand} whatsapp={wa} />
      </>
    );
  }

  return (
    <>
      <Navbar brand={brand} />
      <div className="container-page py-8 max-w-xl mx-auto">
        <Link href="/" className="text-sm text-muted hover:text-text inline-flex items-center gap-1.5 mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.4" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          Kembali
        </Link>
        <QrisPay
          code={order.code}
          paymentNumber={order.payment_number || ''}
          expiresAt={order.expires_at}
          amount={order.total}
          productName={order.product_name}
          variantName={order.variant_name}
          formatted={formatIDR(order.total)}
        />
      </div>
      <Footer brand={brand} whatsapp={wa} />
    </>
  );
}
