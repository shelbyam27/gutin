import './globals.css';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import { getSetting } from '@/lib/settings';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export function generateMetadata(): Metadata {
  const brand = (() => {
    try {
      return getSetting('brand_name') || 'GutInc Store';
    } catch {
      return 'GutInc Store';
    }
  })();
  const tag = (() => {
    try {
      return getSetting('brand_tagline') || 'Premium digital, harga ramah kantong.';
    } catch {
      return 'Premium digital, harga ramah kantong.';
    }
  })();
  return {
    title: { default: brand, template: `%s · ${brand}` },
    description: tag,
    icons: { icon: '/favicon.svg' },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={jakarta.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
