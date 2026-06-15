import AdminShell from '@/components/admin/AdminShell';
import WrImporterClient from '@/components/admin/WrImporterClient';
import { allSettings } from '@/lib/settings';
import { getDb } from '@/lib/db';
import { ensureWrScheduler, getSyncState } from '@/lib/wrScheduler';

export const dynamic = 'force-dynamic';

interface ImportedRow {
  variant_id: number;
  product_id: number;
  product_name: string;
  variant_name: string;
  wr_variant_id: string;
  cost_price: number | null;
  price: number;
  margin_mode: string | null;
  margin_value: number | null;
  wr_stock: number | null;
  last_synced_at: string | null;
  is_active: number;
}

export default function AdminWrPage() {
  const s = allSettings();
  const configured = !!s.wr_api_key;

  const imported = configured
    ? (getDb().prepare(
        `SELECT v.id AS variant_id, v.product_id, p.name AS product_name, v.name AS variant_name,
                v.wr_id AS wr_variant_id, v.cost_price, v.price, v.margin_mode, v.margin_value,
                v.wr_stock, v.last_synced_at, v.is_active
         FROM variants v JOIN products p ON p.id = v.product_id
         WHERE v.source = 'wr'
         ORDER BY p.name ASC, v.price ASC`,
      ).all() as ImportedRow[])
    : [];

  const defaults = {
    mode: (s.wr_default_margin_mode || 'percent') as 'percent' | 'fixed',
    value: Number(s.wr_default_margin_value || '15') || 0,
    minMargin: Number(s.wr_min_margin_rp || '0') || 0,
    roundTo: Number(s.wr_round_to || '500') || 500,
  };

  ensureWrScheduler();
  const sync = {
    enabled: s.wr_auto_sync_enabled !== 'false',
    intervalMinutes: Math.max(1, Number(s.wr_auto_sync_interval_minutes || '15') || 15),
    state: getSyncState(),
  };

  return (
    <AdminShell>
      <div className="container-page py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Import Produk dari Warung Rebahan</h1>
          <p className="text-sm text-muted">Pilih produk &amp; varian dari supplier, atur margin per varian, lalu impor langsung jadi katalog kamu.</p>
        </div>
        <WrImporterClient configured={configured} imported={imported} defaults={defaults} sync={sync} />
      </div>
    </AdminShell>
  );
}
