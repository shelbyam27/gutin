'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

const ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: 'home' },
  { href: '/admin/produk', label: 'Produk', icon: 'box' },
  { href: '/admin/stok', label: 'Stok Akun', icon: 'layers' },
  { href: '/admin/flash-sale', label: 'Flash Sale', icon: 'flash' },
  { href: '/admin/pesanan', label: 'Pesanan', icon: 'cart' },
  { href: '/admin/settings', label: 'Pengaturan', icon: 'gear' },
];

export default function Sidebar({ brand, username }: { brand: string; username: string }) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <aside className="border-r bg-surface md:w-60 md:fixed md:inset-y-0 md:flex md:flex-col">
      <div className="px-5 h-16 flex items-center border-b">
        <Link href="/" className="font-bold flex items-center gap-2">
          <span className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-white"
                style={{ background: 'linear-gradient(135deg, rgb(var(--brand-from)), rgb(var(--brand-to)))' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M5 7h14M5 12h10M5 17h7" />
            </svg>
          </span>
          <span className="truncate">{brand}</span>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1 text-sm">
        {ITEMS.map((it) => {
          const active = it.href === '/admin' ? path === '/admin' : path?.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-btn transition ${
                active
                  ? 'text-white'
                  : 'text-muted hover:text-text hover:bg-surface-2'
              }`}
              style={
                active
                  ? { background: 'linear-gradient(135deg, rgb(var(--brand-from)), rgb(var(--brand-to)))' }
                  : undefined
              }
            >
              <Icon name={it.icon} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t">
        <div className="flex items-center gap-2 px-2 py-1 mb-2 text-xs text-muted">
          <div className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center font-semibold text-text">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="truncate">{username}</div>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
        <button onClick={logout} className="btn btn-secondary w-full !text-xs">Logout</button>
      </div>
    </aside>
  );
}

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'home':
      return <svg {...common}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>;
    case 'box':
      return <svg {...common}><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /></svg>;
    case 'layers':
      return <svg {...common}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>;
    case 'cart':
      return <svg {...common}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>;
    case 'gear':
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
    case 'flash':
      return <svg {...common}><path d="M13 2L3 14h7l-1 8 11-14h-7l1-6z" /></svg>;
    default:
      return null;
  }
}
