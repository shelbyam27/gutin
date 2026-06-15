import Link from "next/link";
import { formatIDR } from "@/lib/format";

export interface ProductCardData {
  slug: string;
  name: string;
  category: string;
  short_desc: string | null;
  image: string | null;
  brand_color: string | null;
  min_price: number;
  original_min_price: number;
  total_stock: number;
  badge: string | null;
  flash_ends_at: string | null;
}

export default function ProductCard({ p }: { p: ProductCardData }) {
  const bg = p.brand_color || "#6366f1";
  const hasDiscount = p.original_min_price > p.min_price;
  const pct = hasDiscount
    ? Math.round(
        ((p.original_min_price - p.min_price) / p.original_min_price) * 100,
      )
    : 0;

  return (
    <Link
      href={`/produk/${p.slug}`}
      className="card card-hover overflow-hidden flex flex-col group"
    >
      <div
        className="aspect-square relative flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${bg} 0%, ${shade(bg, -25)} 100%)`,
        }}
      >
        {p.image && (
          <img
            src={p.image}
            alt={p.name}
            className="relative w-3/5 h-3/5 object-contain drop-shadow-xl"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {p.badge && (
            <span
              className="badge text-white text-[10px] tracking-wide font-bold"
              style={{
                background: "linear-gradient(135deg, #ef4444, #f97316)",
              }}
            >
              {p.badge.toUpperCase()}
            </span>
          )}
          {hasDiscount && (
            <span className="badge bg-white/95 text-danger text-[10px] font-bold">
              -{pct}%
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3">
          {p.total_stock > 0 ? (
            <span className="badge bg-white/20 text-white backdrop-blur-sm text-[10px]">
              Stok {p.total_stock}
            </span>
          ) : (
            <span className="badge bg-white/20 text-white backdrop-blur-sm text-[10px]">
              Habis
            </span>
          )}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="text-xs text-muted uppercase tracking-wide">
          {categoryLabel(p.category)}
        </div>
        <div className="font-semibold mt-1 line-clamp-1">{p.name}</div>
        <div className="text-xs text-muted line-clamp-2 mt-1 min-h-[2.25rem]">
          {p.short_desc}
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-[11px] text-muted">Mulai</div>
            <div className="font-bold gradient-text">
              {formatIDR(p.min_price)}
            </div>
            {hasDiscount && (
              <div className="text-[11px] text-muted line-through">
                {formatIDR(p.original_min_price)}
              </div>
            )}
          </div>
          <span className="text-xs font-semibold text-brand-from">Beli →</span>
        </div>
      </div>
    </Link>
  );
}

function categoryLabel(c: string): string {
  const m: Record<string, string> = {
    streaming: "Streaming",
    music: "Musik",
    ai: "AI",
    design: "Desain",
    social: "Sosmed",
    game: "Game",
    edu: "Edukasi",
    vpn: "VPN",
  };
  return m[c] || c;
}

function shade(hex: string, percent: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((x) => x + x)
          .join("")
      : h,
    16,
  );
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent) / 100;
  r = Math.round((t - r) * p) + r;
  g = Math.round((t - g) * p) + g;
  b = Math.round((t - b) * p) + b;
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
