import { getDb } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import OrderDetailClient from '@/components/admin/OrderDetailClient';
import AdminShell from '@/components/admin/AdminShell';
import type { OrderRow } from '@/lib/delivery';

export const dynamic = 'force-dynamic';

export default function AdminOrderDetail({ params }: { params: { code: string } }) {
  const order = getDb().prepare('SELECT * FROM orders WHERE code = ?').get(params.code) as OrderRow | undefined;
  if (!order) notFound();
  return (
    <AdminShell>
      <div className="container-page py-8">
        <Link href="/admin/pesanan" className="text-sm text-muted hover:text-text inline-flex items-center gap-1.5 mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.4" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          Daftar Pesanan
        </Link>
        <h1 className="text-2xl font-bold mb-6">Detail Pesanan</h1>
        <OrderDetailClient order={order} />
      </div>
    </AdminShell>
  );
}
