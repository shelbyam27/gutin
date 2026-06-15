'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatIDR } from '@/lib/format';
import type { OrderRow } from '@/lib/delivery';

export default function OrderDetailClient({ order }: { order: OrderRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [credentialInput, setCredentialInput] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function call(action: string, body?: unknown) {
    setBusy(action); setMsg(null);
    try {
      const r = await fetch(`/api/admin/orders/${order.code}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Gagal');
      setMsg({ kind: 'ok', text: d?.message || 'Berhasil.' });
      router.refresh();
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message });
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Kode" value={order.code} mono />
        <Field label="Status" value={order.status} />
        <Field label="Produk" value={`${order.product_name} · ${order.variant_name}`} />
        <Field label="Total" value={formatIDR(order.total)} />
        <Field label="Email" value={order.email} />
        <Field label="WhatsApp" value={order.whatsapp || '-'} />
        <Field label="Dibuat" value={order.created_at} />
        <Field label="Lunas" value={order.paid_at || '-'} />
        <Field label="Dikirim" value={order.delivered_at || '-'} />
        <Field label="Pakasir Order ID" value={order.code} mono />
      </div>

      {order.delivered_content && (
        <div className="card p-4">
          <div className="text-xs uppercase text-muted mb-2">Akun yang Dikirim</div>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all">{order.delivered_content}</pre>
        </div>
      )}

      {msg && (
        <div className={`text-sm rounded-btn px-3 py-2 ${msg.kind === 'ok' ? 'bg-success/10 text-success border border-success/30' : 'bg-danger/10 text-danger border border-danger/30'}`}>
          {msg.text}
        </div>
      )}

      <div className="card p-5 space-y-3">
        <div className="font-semibold">Aksi Cepat</div>
        <div className="flex flex-wrap gap-2">
          {order.status === 'pending' && (
            <button onClick={() => call('check-status')} disabled={busy === 'check-status'} className="btn btn-secondary">
              {busy === 'check-status' ? 'Mengecek...' : 'Cek Status di Pakasir'}
            </button>
          )}
          {order.status === 'pending' && (
            <button onClick={() => call('simulate')} disabled={busy === 'simulate'} className="btn btn-secondary">
              {busy === 'simulate' ? '...' : 'Simulasi Pembayaran (Sandbox)'}
            </button>
          )}
          {order.status === 'paid' && (
            <button onClick={() => call('finalize')} disabled={busy === 'finalize'} className="btn btn-primary">
              {busy === 'finalize' ? 'Memproses...' : 'Coba Kirim Akun Lagi'}
            </button>
          )}
          {order.status === 'delivered' && (
            <button onClick={() => call('resend-email')} disabled={busy === 'resend-email'} className="btn btn-secondary">
              {busy === 'resend-email' ? '...' : 'Kirim Ulang Email'}
            </button>
          )}
          {order.wr_order_id && (
            <button onClick={() => call('refetch-wr')} disabled={busy === 'refetch-wr'} className="btn btn-secondary">
              {busy === 'refetch-wr' ? '...' : 'Refetch Detail dari WR'}
            </button>
          )}
          {(order.status === 'pending' || order.status === 'paid') && (
            <button onClick={() => call('cancel')} disabled={busy === 'cancel'} className="btn btn-danger">
              {busy === 'cancel' ? '...' : 'Batalkan'}
            </button>
          )}
        </div>
      </div>

      {(order.status === 'paid' || order.status === 'pending') && (
        <div className="card p-5 space-y-3">
          <div className="font-semibold">Kirim Akun Manual</div>
          <p className="text-xs text-muted">
            Pakai kalau stok kosong saat lunas. Tempel di sini, sistem akan kirim email + tandai delivered.
          </p>
          <textarea rows={4} className="textarea font-mono text-xs"
                    placeholder="email:akun@x.com|password:xyz|profile:Profile 1"
                    value={credentialInput} onChange={(e) => setCredentialInput(e.target.value)} />
          <button onClick={() => call('manual-deliver', { credential: credentialInput })}
                  disabled={busy === 'manual-deliver' || !credentialInput.trim()} className="btn btn-primary">
            {busy === 'manual-deliver' ? '...' : 'Kirim Manual'}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-btn bg-surface-2 p-3">
      <div className="text-[11px] text-muted uppercase tracking-wide">{label}</div>
      <div className={`text-sm font-medium ${mono ? 'font-mono' : ''} mt-0.5 break-all`}>{value}</div>
    </div>
  );
}
