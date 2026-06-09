import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ brand }: { brand: string }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-bg/80 border-b">
      <div className="container-page flex items-center h-16 gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-white"
                style={{ background: 'linear-gradient(135deg, rgb(var(--brand-from)), rgb(var(--brand-to)))' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M5 7h14M5 12h10M5 17h7" />
            </svg>
          </span>
          <span>{brand}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-6 text-sm">
          <Link href="/" className="px-3 py-2 rounded-btn hover:bg-surface-2">Beranda</Link>
          <Link href="/#produk" className="px-3 py-2 rounded-btn hover:bg-surface-2">Produk</Link>
          <Link href="/#cara-order" className="px-3 py-2 rounded-btn hover:bg-surface-2">Cara Order</Link>
          <Link href="/cek" className="px-3 py-2 rounded-btn hover:bg-surface-2">Cek Transaksi</Link>
          <Link href="/#faq" className="px-3 py-2 rounded-btn hover:bg-surface-2">FAQ</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
