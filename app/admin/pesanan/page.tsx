import { getDb } from '@/lib/db';
import OrdersClient, { OrderListRow } from '@/components/admin/OrdersClient';
import AdminShell from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

function loadOrders(): OrderListRow[] {
  return getDb().prepare(
    `SELECT code, product_name, variant_name, total, email, status, created_at
     FROM orders ORDER BY id DESC LIMIT 500`,
  ).all() as OrderListRow[];
}

export default function AdminOrdersPage() {
  const orders = loadOrders();
  return (
    <AdminShell>
      <div className="container-page py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Pesanan</h1>
          <p className="text-sm text-muted">Lihat status & kelola pesanan masuk.</p>
        </div>
        <OrdersClient orders={orders} />
      </div>
    </AdminShell>
  );
}
