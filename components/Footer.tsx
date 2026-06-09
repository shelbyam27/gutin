import Link from 'next/link';

export default function Footer({
  brand,
  whatsapp,
}: {
  brand: string;
  whatsapp: string;
}) {
  const wa = whatsapp ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}` : '#';
  return (
    <footer className="border-t mt-24">
      <div className="container-page py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-white"
                  style={{ background: 'linear-gradient(135deg, rgb(var(--brand-from)), rgb(var(--brand-to)))' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M5 7h14M5 12h10M5 17h7" />
              </svg>
            </span>
            {brand}
          </div>
          <p className="text-sm text-muted mt-3 max-w-sm">
            Marketplace produk digital premium. Aman, instan, dan kami garansi selama masa aktif akun.
          </p>
        </div>

        <div>
          <div className="font-semibold mb-3">Belanja</div>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/#produk" className="hover:text-text">Semua Produk</Link></li>
            <li><Link href="/#cara-order" className="hover:text-text">Cara Order</Link></li>
            <li><Link href="/cek" className="hover:text-text">Cek Transaksi</Link></li>
          </ul>
        </div>

        <div>
          <div className="font-semibold mb-3">Bantuan</div>
          <ul className="space-y-2 text-sm text-muted">
            <li><a href={wa} target="_blank" rel="noopener noreferrer" className="hover:text-text">WhatsApp Admin</a></li>
            <li><Link href="/#faq" className="hover:text-text">FAQ</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container-page py-5 text-xs text-muted flex flex-col sm:flex-row gap-2 justify-between">
          <div>© {new Date().getFullYear()} {brand}. Semua hak dilindungi.</div>
          <div>Pembayaran diproses oleh Pakasir · QRIS / E-Wallet / VA</div>
        </div>
      </div>
    </footer>
  );
}
