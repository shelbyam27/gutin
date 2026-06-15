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

  return (
    <>
      <Navbar brand={brand} />

      <section className="container-page pt-12 sm:pt-16 pb-10">
        <div className="grid md:grid-cols-1 gap-10 items-center">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 chip mb-5 mx-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              {totalStock}+ stok siap kirim
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
              Premium digital,{" "}
              <span className="gradient-text">harga ramah kantong.</span>
            </h1>

            <p className="text-muted mt-5 text-base sm:text-lg max-w-lg mx-auto">
              {tag} Bayar via QRIS dalam hitungan detik, akun langsung dikirim
              ke halaman & email kamu otomatis.
            </p>

            <div className="mt-7 flex flex-wrap gap-3 justify-center">
              <Link href="#produk" className="btn btn-primary">
                Mulai Belanja
              </Link>
              <Link href="/cek" className="btn btn-secondary">
                Cek Transaksi
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm max-w-2xl mx-auto">
              {[
                { v: "10rb+", l: "Pesanan" },
                { v: "4.9/5", l: "Rating" },
                { v: "< 1 mnt", l: "Proses" },
                { v: "Garansi", l: "Penuh" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-bold text-lg gradient-text">{s.v}</div>
                  <div className="text-xs text-muted">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {flashSales.length > 0 && (
        <section className="container-page pb-8">
          <FlashSaleBanner items={flashSales} />
        </section>
      )}

      <section id="produk" className="container-page py-10 scroll-mt-24">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Pilih Produk Favorit
            </h2>
            <p className="text-muted text-sm mt-1">
              Akun premium, harga student-friendly.
            </p>
          </div>
        </div>
        <ProductGrid products={products} />
      </section>

      <section id="cara-order" className="container-page py-16 scroll-mt-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">
          Cara Order, Cuma 3 Langkah
        </h2>
        <p className="text-center text-muted mb-10">
          Dari klik ke akun aktif, kurang dari 1 menit.
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              n: "01",
              t: "Pilih Produk",
              d: "Pilih layanan favoritmu dan paket yang cocok.",
            },
            {
              n: "02",
              t: "Bayar QRIS",
              d: "Scan QRIS dengan e-wallet/m-banking. Tanpa redirect.",
            },
            {
              n: "03",
              t: "Akun Terkirim",
              d: "Akun muncul di halaman & dikirim ke email otomatis.",
            },
          ].map((s) => (
            <div key={s.n} className="card p-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, rgb(var(--brand-from)), rgb(var(--brand-to)))",
                }}
              >
                {s.n}
              </div>
              <div className="font-semibold text-lg mt-4">{s.t}</div>
              <p className="text-sm text-muted mt-2">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-10">
        <div className="grid md:grid-cols-4 gap-4">
          {[
            {
              t: "Proses Otomatis",
              d: "Akun langsung dikirim setelah pembayaran lunas.",
            },
            {
              t: "Garansi Aktif",
              d: "Aman selama masa langganan, ganti kalau bermasalah.",
            },
            {
              t: "Pembayaran Aman",
              d: "QRIS resmi, semua e-wallet & bank Indonesia.",
            },
            { t: "Support 24/7", d: "Tim siap bantu via WhatsApp kapan pun." },
          ].map((f) => (
            <div key={f.t} className="card p-5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "rgba(99,102,241,.12)" }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgb(var(--brand-from))"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div className="font-semibold mt-3">{f.t}</div>
              <div className="text-sm text-muted mt-1">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="container-page py-16 scroll-mt-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">
            Pertanyaan yang Sering Ditanya
          </h2>
          <p className="text-center text-muted mb-8">
            Belum yakin? Cek dulu jawaban-jawaban ini.
          </p>
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

      <Footer brand={brand} whatsapp={wa} />
    </>
  );
}
