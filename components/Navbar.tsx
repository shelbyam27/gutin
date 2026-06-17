'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Beranda', match: 'exact' as const },
  { href: '/#produk', label: 'Produk', match: 'hash' as const },
  { href: '/#cara-order', label: 'Cara Order', match: 'hash' as const },
  { href: '/cek', label: 'Cek Transaksi', match: 'prefix' as const },
  { href: '/#faq', label: 'FAQ', match: 'hash' as const },
];

export default function Navbar({ brand }: { brand: string }) {
  const path = usePathname() || '/';

  function isActive(href: string, match: 'exact' | 'prefix' | 'hash'): boolean {
    if (match === 'exact') return path === href;
    if (match === 'prefix') return path.startsWith(href);
    return false;
  }

  return (
    <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/75 border-b-2 border-ink">
      <div className="container-page flex items-center h-16 gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-extrabold text-lg tracking-tight"
        >
          <span
            className="inline-flex w-9 h-9 items-center justify-center text-ink"
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
          <span>{brand}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1.5 ml-6 text-sm font-bold">
          {NAV.map((item) => {
            const active = isActive(item.href, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active ? 'nav-link-active' : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/#produk"
            className="btn btn-primary !py-2 !px-4 text-sm hidden sm:inline-flex"
          >
            Mulai Belanja
          </Link>
        </div>
      </div>
    </header>
  );
}
