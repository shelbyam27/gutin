import { redirect } from 'next/navigation';
import Link from 'next/link';
import LoginForm from '@/components/admin/LoginForm';
import ThemeToggle from '@/components/ThemeToggle';
import { readSession } from '@/lib/auth';
import { getSetting } from '@/lib/settings';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Akses Terbatas',
  robots: { index: false, follow: false, nocache: true, noarchive: true, nosnippet: true },
};

export default function AdminLogin() {
  if (readSession()) redirect('/admin');
  const brand = getSetting('brand_name') || 'GutInc Store';
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container-page h-16 flex items-center">
          <Link href="/" className="font-bold text-lg flex items-center gap-2">
            <span className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-white"
                  style={{ background: 'linear-gradient(135deg, rgb(var(--brand-from)), rgb(var(--brand-to)))' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M5 7h14M5 12h10M5 17h7" />
              </svg>
            </span>
            {brand}
          </Link>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
      </header>
      <main className="flex-1 grid place-items-center px-4 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center mb-1">Akses Terbatas</h1>
          <p className="text-sm text-muted text-center mb-6">Halaman ini hanya untuk staf yang berwenang.</p>
          <LoginForm />
          <div className="text-xs text-muted text-center mt-4">
            Lupa password? Hubungi pengelola sistem.
          </div>
        </div>
      </main>
    </div>
  );
}
