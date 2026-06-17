import Link from 'next/link';

export default function Footer({
  brand,
  whatsapp,
}: {
  brand: string;
  whatsapp: string;
}) {
  const wa = whatsapp ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}` : '#';
  const year = new Date().getFullYear();

  const payments = [
    { label: 'QRIS', tone: 'primary' as const },
    { label: 'E-Wallet', tone: 'plain' as const },
    { label: 'Virtual Account', tone: 'plain' as const },
    { label: 'M-Banking', tone: 'plain' as const },
  ];

  return (
    <footer className="border-t-2 border-ink mt-24 bg-surface-2">
      <div className="container-page py-14 grid gap-12 md:grid-cols-12">
        {/* Brand block */}
        <div className="md:col-span-5">
          <div className="flex items-center gap-2.5 font-extrabold text-lg tracking-tight">
            <span
              className="inline-flex w-10 h-10 items-center justify-center text-ink"
              style={{
                background: 'rgb(var(--accent))',
                border: '2px solid rgb(var(--ink))',
                borderRadius: 10,
                boxShadow: '3px 3px 0 0 rgb(var(--ink))',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
              >
                <path d="M5 7h14M5 12h10M5 17h7" />
              </svg>
            </span>
            {brand}
          </div>
          <p className="text-sm text-muted mt-4 max-w-sm leading-relaxed">
            Marketplace produk digital premium. Akun aktif dalam hitungan detik, kami garansi penuh selama masa langganan.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {payments.map((p) => (
              <span
                key={p.label}
                className={`payment-chip ${p.tone === 'primary' ? 'payment-chip-primary' : ''}`}
              >
                {p.label}
              </span>
            ))}
          </div>
        </div>

        {/* Belanja */}
        <div className="md:col-span-3 md:col-start-7">
          <div className="footer-heading">Belanja</div>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href="/#produk" className="footer-link">
                Semua Produk
              </Link>
            </li>
            <li>
              <Link href="/#cara-order" className="footer-link">
                Cara Order
              </Link>
            </li>
            <li>
              <Link href="/cek" className="footer-link">
                Cek Transaksi
              </Link>
            </li>
          </ul>
        </div>

        {/* Bantuan */}
        <div className="md:col-span-3">
          <div className="footer-heading">Bantuan</div>
          <ul className="space-y-2.5 text-sm">
            <li>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                WhatsApp Admin
              </a>
            </li>
            <li>
              <Link href="/#faq" className="footer-link">
                FAQ
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t-2 border-ink bg-ink text-bg">
        <div className="container-page py-4 text-xs flex flex-col sm:flex-row gap-2 justify-between items-center">
          <div>
            © {year} <strong>{brand}</strong>. Semua hak dilindungi.
          </div>
          <div className="opacity-80">
            Pembayaran diproses oleh Pakasir · QRIS / E-Wallet / VA
          </div>
        </div>
      </div>
    </footer>
  );
}
