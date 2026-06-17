import { getDb } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PurchaseCard, { VariantPurchase } from '@/components/PurchaseCard';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { effectivePrice, getActiveFlashSale, type VariantPriced } from '@/lib/pricing';
import { formatIDR } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface ProductRow {
  id: number;
  slug: string;
  name: string;
  category: string;
  short_desc: string | null;
  long_desc: string | null;
  image: string | null;
  brand_color: string | null;
}

interface RawVariant extends VariantPriced {
  stock: number;
}

function loadProduct(slug: string): { p: ProductRow; variants: VariantPurchase[] } | null {
  const db = getDb();
  const p = db
    .prepare(
      `SELECT id, slug, name, category, short_desc, long_desc, image, brand_color
       FROM products WHERE slug = ? AND is_active = 1`,
    )
    .get(slug) as ProductRow | undefined;
  if (!p) return null;
  const variants = db
    .prepare(
      `SELECT v.id, v.product_id, v.name, v.duration_label, v.price, v.description, v.is_active,
              v.discount_price, v.discount_label, v.discount_until,
              CASE WHEN v.source = 'wr' THEN COALESCE(v.wr_stock, 0)
                   ELSE COALESCE((SELECT COUNT(*) FROM credentials c WHERE c.variant_id = v.id AND c.status = 'available'), 0)
              END AS stock
       FROM variants v
       WHERE v.product_id = ? AND v.is_active = 1
       ORDER BY v.price ASC`,
    )
    .all(p.id) as RawVariant[];

  const now = Date.now();
  const mapped: VariantPurchase[] = variants.map((v) => {
    const flash = getActiveFlashSale(v.id, now);
    const e = effectivePrice(v, flash, now);
    return {
      id: v.id,
      name: v.name,
      duration_label: v.duration_label,
      price: e.effective,
      original_price: e.original,
      badge: e.badge,
      flash_ends_at: e.flashEndsAt,
      flash_slots_left: e.flashSlotsLeft,
      stock: v.stock,
    };
  });

  return { p, variants: mapped };
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const data = loadProduct(params.slug);
  if (!data) notFound();
  const { p, variants } = data;
  const brand = getSetting('brand_name') || 'GutInc Store';
  const wa = getSetting('whatsapp_contact') || '';
  const minPrice = variants.length ? Math.min(...variants.map((v) => v.price)) : 0;

  return (
    <>
      <Navbar brand={brand} />
      <div className="container-page py-8">
        <nav className="text-sm text-muted mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-text">Beranda</Link>
          <span>/</span>
          <Link href={`/#produk`} className="hover:text-text">Produk</Link>
          <span>/</span>
          <span className="text-text">{p.name}</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          <div className="space-y-5">
            <div className="card-brutal overflow-hidden">
              <div className="aspect-[16/9] flex items-center justify-center bg-surface-2 border-b-2 border-ink">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-32 h-32 object-contain" />
                ) : (
                  <span className="text-7xl font-extrabold text-muted">{p.name.charAt(0)}</span>
                )}
              </div>
              <div className="p-6">
                <span className="badge badge-muted uppercase tracking-wide">{p.category}</span>
                <h1 className="text-2xl sm:text-3xl font-extrabold mt-3 tracking-tight">{p.name}</h1>
                <p className="text-muted mt-2">{p.short_desc}</p>
              </div>
            </div>

            <div className="card-brutal p-6">
              <h2 className="font-extrabold mb-3 text-lg">Deskripsi Produk</h2>
              <p className="text-sm leading-relaxed text-muted whitespace-pre-line">
                {p.long_desc || p.short_desc || 'Tidak ada deskripsi.'}
              </p>
            </div>

            <div className="card-brutal p-6">
              <h2 className="font-extrabold mb-3 text-lg">Penting Sebelum Order</h2>
              <ul className="text-sm text-muted space-y-2 list-disc pl-5">
                <li>Akun dikirim otomatis ke email & ditampilkan di halaman pesanan setelah pembayaran lunas.</li>
                <li>Pastikan email yang kamu masukkan benar dan aktif.</li>
                <li>Jangan ganti password / data akun. Garansi hangus jika diubah.</li>
                <li>Klaim garansi via WhatsApp admin selama masa aktif.</li>
              </ul>
            </div>
          </div>

          <div>
            <div className="lg:sticky lg:top-24 space-y-4">
              <PurchaseCard variants={variants} />
              {!variants.some((v) => v.stock > 0) && (
                <div className="card-brutal p-4 text-sm text-warning font-semibold">
                  Stok kosong sementara. Cek lagi nanti atau hubungi admin.
                </div>
              )}
              <div className="text-center text-xs text-muted">
                Mulai dari{' '}
                <span className="text-brand font-extrabold">{formatIDR(minPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer brand={brand} whatsapp={wa} />
    </>
  );
}
