'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';

interface Props {
  code: string;
  paymentNumber: string;
  expiresAt: string | null;
  amount: number;
  productName: string;
  variantName: string;
  formatted: string;
}

type StatusBanner = {
  state: 'pending' | 'paid' | 'delivered' | 'expired' | 'failed';
  msg: string;
};

export default function QrisPay({
  code,
  paymentNumber,
  expiresAt,
  amount,
  productName,
  variantName,
  formatted,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<StatusBanner>({
    state: 'pending',
    msg: 'Menunggu pembayaran...',
  });
  const [remain, setRemain] = useState<number>(() => msUntil(expiresAt));
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!canvasRef.current || !paymentNumber) return;
    QRCode.toCanvas(canvasRef.current, paymentNumber, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    }).catch(() => {});
  }, [paymentNumber]);

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => {
      const ms = msUntil(expiresAt);
      setRemain(ms);
      if (ms <= 0) {
        setStatus({ state: 'expired', msg: 'Pembayaran kadaluarsa.' });
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(`/api/orders/${code}/status`, { cache: 'no-store' });
        if (!r.ok) return;
        const d = (await r.json()) as { status: string };
        if (!alive) return;
        if (d.status === 'delivered') {
          setStatus({ state: 'delivered', msg: 'Pembayaran berhasil! Mengarahkan ke halaman pesanan...' });
          setTimeout(() => router.push(`/pesanan/${code}`), 1200);
        } else if (d.status === 'paid') {
          setStatus({ state: 'paid', msg: 'Pembayaran diterima! Memproses akun...' });
        } else if (d.status === 'canceled' || d.status === 'expired' || d.status === 'failed') {
          setStatus({ state: 'expired', msg: 'Pesanan dibatalkan / kadaluarsa.' });
        }
      } catch {}
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [code, router]);

  function copyNumber() {
    if (!paymentNumber) return;
    navigator.clipboard.writeText(paymentNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function downloadQr() {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `qris-${code}.png`;
    a.click();
  }

  const min = Math.max(0, Math.floor(remain / 60000));
  const sec = Math.max(0, Math.floor((remain % 60000) / 1000));

  const banner =
    status.state === 'delivered' || status.state === 'paid'
      ? 'badge-success'
      : status.state === 'expired' || status.state === 'failed'
      ? 'badge-danger'
      : 'badge-warning';

  return (
    <div className="card p-6 sm:p-7">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-xs text-muted">Order ID</div>
          <div className="font-mono font-semibold">{code}</div>
        </div>
        <span className={`badge ${banner} pulse-dot`}>{statusLabel(status.state)}</span>
      </div>

      <div className="text-center">
        <div className="text-sm text-muted">Total Pembayaran</div>
        <div className="text-3xl font-extrabold gradient-text mt-1">{formatted}</div>
        {status.state === 'pending' && expiresAt && (
          <div className="text-xs text-muted mt-2">
            Bayar sebelum{' '}
            <span className="font-semibold text-warning">
              {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      <div className="my-6 flex justify-center">
        <div className="rounded-card p-4 bg-white border">
          <canvas ref={canvasRef} aria-label="QRIS" />
        </div>
      </div>

      <div className="flex gap-2 justify-center mb-5">
        <button type="button" onClick={downloadQr} className="btn btn-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Unduh QR
        </button>
        <button type="button" onClick={copyNumber} className="btn btn-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {copied ? 'Tersalin!' : 'Salin Kode QR'}
        </button>
      </div>

      <div className="rounded-btn bg-surface-2 p-4 text-sm">
        <div className="font-semibold mb-2">Detail Pesanan</div>
        <div className="flex justify-between py-1">
          <span className="text-muted">Produk</span>
          <span className="font-medium text-right">{productName}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-muted">Paket</span>
          <span className="font-medium">{variantName}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-muted">Total</span>
          <span className="font-semibold">{formatted}</span>
        </div>
      </div>

      <div className="mt-4 text-xs text-muted text-center">
        Halaman akan otomatis update saat pembayaran berhasil. Tidak perlu refresh.
      </div>
    </div>
  );
}

function msUntil(iso: string | null): number {
  if (!iso) return 15 * 60 * 1000;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return 15 * 60 * 1000;
  return t - Date.now();
}

function statusLabel(s: StatusBanner['state']): string {
  switch (s) {
    case 'delivered': return 'Pembayaran Berhasil';
    case 'paid': return 'Pembayaran Diterima';
    case 'expired': return 'Kadaluarsa';
    case 'failed': return 'Gagal';
    default: return 'Menunggu Pembayaran';
  }
}
