import { getDb } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";
import FaqAccordion from "@/components/FaqAccordion";
import FlashSaleBanner from "@/components/FlashSaleBanner";
import Link from "next/link";
import type { ProductCardData } from "@/components/ProductCard";
import {
  effectivePrice,
  getActiveFlashSale,
  type VariantPriced,
} from "@/lib/pricing";

export const dynamic = "force-dynamic";

interface RawProduct {
  id: number;
  slug: string;
  name: string;
  category: string;
  short_desc: string | null;
  image: string | null;
  brand_color: string | null;
}

interface RawVariant extends VariantPriced {
  stock: number;
}

function loadProducts(): ProductCardData[] {
  const db = getDb();
  const products = db
    .prepare(
      `SELECT p.id, p.slug, p.name, p.category, p.short_desc, p.image, p.brand_color
       FROM products p WHERE p.is_active = 1
       ORDER BY p.sort_order ASC, p.id ASC`,
    )
    .all() as RawProduct[];

  const out: ProductCardData[] = [];
  const now = Date.now();
  for (const p of products) {
    const variants = db
      .prepare(
        `SELECT v.id, v.product_id, v.name, v.duration_label, v.price, v.description, v.is_active,
                v.discount_price, v.discount_label, v.discount_until,
                CASE WHEN v.source = 'wr' THEN COALESCE(v.wr_stock, 0)
                     ELSE COALESCE((SELECT COUNT(*) FROM credentials c WHERE c.variant_id = v.id AND c.status = 'available'), 0)
                END AS stock
         FROM variants v
         WHERE v.product_id = ? AND v.is_active = 1`,
      )
      .all(p.id) as RawVariant[];

    if (variants.length === 0) continue;

    let minEff = Infinity;
    let minOrig = Infinity;
    let badge: string | null = null;
    let flashEndsAt: string | null = null;
    let totalStock = 0;

    for (const v of variants) {
      totalStock += v.stock;
      const flash = getActiveFlashSale(v.id, now);
      const e = effectivePrice(v, flash, now);
      if (e.effective < minEff) {
        minEff = e.effective;
        minOrig = e.original;
        badge = e.badge;
        flashEndsAt = e.flashEndsAt;
      }
    }

    out.push({
      slug: p.slug,
      name: p.name,
      category: p.category,
      short_desc: p.short_desc,
      image: p.image,
      brand_color: p.brand_color,
      min_price: minEff === Infinity ? 0 : minEff,
      original_min_price: minOrig === Infinity ? 0 : minOrig,
      total_stock: totalStock,
      badge,
      flash_ends_at: flashEndsAt,
    });
  }
  return out;
}

function loadActiveFlashSales() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT fs.id, fs.flash_price, fs.starts_at, fs.ends_at, fs.max_qty, fs.sold_qty,
              v.id AS variant_id, v.name AS variant_name, v.price AS original_price,
              p.slug AS product_slug, p.name AS product_name, p.brand_color
       FROM flash_sales fs
       JOIN variants v ON v.id = fs.variant_id
       JOIN products p ON p.id = v.product_id
       WHERE fs.is_active = 1
         AND datetime(fs.starts_at) <= datetime('now')
         AND datetime(fs.ends_at) > datetime('now')
         AND (fs.max_qty IS NULL OR fs.sold_qty < fs.max_qty)
         AND v.is_active = 1 AND p.is_active = 1
       ORDER BY fs.ends_at ASC LIMIT 6`,
    )
    .all() as Array<{
    id: number;
    flash_price: number;
    starts_at: string;
    ends_at: string;
    max_qty: number | null;
    sold_qty: number;
    variant_id: number;
    variant_name: string;
    original_price: number;
    product_slug: string;
    product_name: string;
    brand_color: string | null;
  }>;
  return rows;
}

export default function HomePage() {
  const brand = getSetting("brand_name") || "GutInc Store";
  const tag =
    getSetting("brand_tagline") || "Premium digital, harga ramah kantong.";
  const wa = getSetting("whatsapp_contact") || "";
  const products = loadProducts();
  const flashSales = loadActiveFlashSales();

  const totalStock = products.reduce((a, b) => a + b.total_stock, 0);

  const stats = [
    { v: "< 1 mnt", l: "Pengiriman" },
    { v: "99.9%", l: "Uptime Order" },
    { v: "Garansi", l: "Masa Aktif" },
    { v: "QRIS, VA & E-Wallet", l: "Pembayaran" },
  ];

  return (
    <>
      <Navbar brand={brand} />

      {/* HERO — cobalt blue full-bleed */}
      <section className="hero-cobalt relative overflow-hidden">
        <div className="container-page py-16 sm:py-24 text-center text-white relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/25 text-xs font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent))] animate-pulse" />
            {totalStock}+ stok siap kirim hari ini
          </div>

          <h1 className="font-extrabold tracking-tight leading-[1.05] text-4xl sm:text-6xl">
            Toko digital{" "}
            <span className="inline-block whitespace-nowrap">
              yang <span className="highlight-yellow">simpel</span>
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-white/85 max-w-xl mx-auto leading-relaxed">
            Streaming, musik, AI, desain — semua premium. Bayar sekali via QRIS,
            akun langsung dikirim otomatis ke email kamu. Mulai Rp1.000.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link href="#produk" className="btn btn-primary">
              Mulai Belanja <span aria-hidden>→</span>
            </Link>
            <Link href="#produk" className="btn btn-hero-secondary">
              Lihat Produk
            </Link>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="container-page -mt-10 sm:-mt-12 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((s) => (
            <div
              key={s.l}
              className="card-brutal px-4 py-5 text-center"
            >
              <div className="font-extrabold text-base sm:text-lg leading-tight">
                {s.v}
              </div>
              <div className="text-[11px] sm:text-xs text-muted uppercase tracking-wider font-bold mt-1.5">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {flashSales.length > 0 && (
        <section className="container-page pt-10">
          <FlashSaleBanner items={flashSales} />
        </section>
      )}

      {/* PRODUCT GRID */}
      <section id="produk" className="container-page py-16 scroll-mt-24">
        <div className="text-center mb-10">
          <div className="inline-block px-3 py-1 bg-accent border-2 border-ink rounded-md text-xs font-extrabold uppercase tracking-wider mb-4">
            Katalog
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Butuh akun apa hari ini?
          </h2>
          <p className="text-muted text-sm sm:text-base mt-3 max-w-md mx-auto">
            Semua akun premium, harga ramah kantong, garansi penuh.
          </p>
        </div>
        <ProductGrid products={products} />
      </section>

      {/* HOW TO ORDER */}
      <section id="cara-order" className="container-page py-16 scroll-mt-24">
        <div className="text-center mb-12">
          <div className="inline-block px-3 py-1 bg-accent border-2 border-ink rounded-md text-xs font-extrabold uppercase tracking-wider mb-4">
            3 Langkah
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Cara order, cuma butuh 1 menit
          </h2>
          <p className="text-muted mt-3">
            Dari klik ke akun aktif, otomatis tanpa nunggu admin.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              n: "01",
              t: "Pilih Produk",
              d: "Pilih layanan favoritmu dan paket yang cocok dengan kebutuhan.",
            },
            {
              n: "02",
              t: "Bayar QRIS",
              d: "Scan QRIS dengan e-wallet/m-banking. Tanpa redirect, tanpa repot.",
            },
            {
              n: "03",
              t: "Akun Terkirim",
              d: "Akun muncul di halaman pesanan & dikirim ke email kamu otomatis.",
            },
          ].map((s) => (
            <div key={s.n} className="card-brutal card-brutal-hover p-6">
              <div className="step-number">{s.n}</div>
              <div className="font-extrabold text-lg mt-5">{s.t}</div>
              <p className="text-sm text-muted mt-2 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES STRIP */}
      <section className="container-page py-12">
        <div className="grid md:grid-cols-4 gap-4">
          {[
            {
              t: "Proses Otomatis",
              d: "Akun langsung dikirim setelah pembayaran lunas.",
              icon: (
                <path d="M13 2L3 14h7v8l10-12h-7V2z" />
              ),
            },
            {
              t: "Garansi Aktif",
              d: "Aman selama masa langganan, ganti kalau bermasalah.",
              icon: (
                <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
              ),
            },
            {
              t: "Pembayaran Aman",
              d: "QRIS resmi, semua e-wallet & bank Indonesia.",
              icon: (
                <>
                  <rect x="3" y="6" width="18" height="13" rx="2" />
                  <path d="M3 10h18" />
                </>
              ),
            },
            {
              t: "Support Cepat",
              d: "Tim siap bantu via WhatsApp setiap saat.",
              icon: (
                <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" />
              ),
            },
          ].map((f) => (
            <div key={f.t} className="card-brutal card-brutal-hover p-5">
              <div className="feature-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {f.icon}
                </svg>
              </div>
              <div className="font-extrabold mt-3">{f.t}</div>
              <div className="text-sm text-muted mt-1.5 leading-relaxed">
                {f.d}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container-page py-16 scroll-mt-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-block px-3 py-1 bg-accent border-2 border-ink rounded-md text-xs font-extrabold uppercase tracking-wider mb-4">
              FAQ
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Pertanyaan yang sering ditanya
            </h2>
            <p className="text-muted mt-3">
              Belum yakin? Cek dulu jawaban-jawaban ini.
            </p>
          </div>
          <FaqAccordion
            items={[
              {
                q: "Berapa lama akun dikirim setelah bayar?",
                a: "Otomatis dalam hitungan detik. Sistem akan langsung tampilkan akun di halaman pesanan dan mengirim ke email kamu begitu pembayaran lunas.",
              },
              {
                q: "Pembayaran apa saja yang didukung?",
                a: "Semua e-wallet (GoPay, OVO, DANA, ShopeePay, LinkAja, dll), m-banking, dan QRIS dari bank manapun. Tanpa redirect ke halaman luar.",
              },
              {
                q: "Kalau akun bermasalah gimana?",
                a: "Garansi penuh selama masa aktif. Hubungi admin via WhatsApp, kami akan ganti akun baru dalam waktu singkat.",
              },
              {
                q: "Apakah aman beli di sini?",
                a: "Aman. Data pembayaran diproses oleh gateway resmi, data kamu tidak kami simpan selain email & nomor WA untuk pengiriman akun.",
              },
            ]}
          />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="container-page pb-20">
        <div className="cta-block text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Siap mulai? Pilih akun favoritmu sekarang.
          </h2>
          <p className="text-white/80 mt-3 text-sm sm:text-base">
            Tanpa registrasi, tanpa drama. Cuma email + WA buat kirim akun.
          </p>
          <div className="mt-6">
            <Link href="#produk" className="btn btn-primary">
              Lihat Semua Produk <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer brand={brand} whatsapp={wa} />
    </>
  );
}
