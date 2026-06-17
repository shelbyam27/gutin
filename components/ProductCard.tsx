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
  const hasDiscount = p.original_min_price > p.min_price;
  const pct = hasDiscount
    ? Math.round(
        ((p.original_min_price - p.min_price) / p.original_min_price) * 100,
      )
    : 0;

  return (
    <Link
      href={`/produk/${p.slug}`}
      className="card-brutal card-brutal-hover overflow-hidden flex flex-col group bg-surface"
    >
      <div className="aspect-square relative flex items-center justify-center bg-surface-2 border-b-2 border-ink">
        {p.image ? (
          <img
            src={p.image}
            alt={p.name}
            className="relative w-1/2 h-1/2 object-contain"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="text-4xl font-extrabold text-muted">
            {p.name.charAt(0)}
          </span>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {p.badge && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide"
              style={{
                background: "rgb(var(--accent))",
                color: "rgb(var(--ink))",
                border: "1.5px solid rgb(var(--ink))",
              }}
            >
              {p.badge.toUpperCase()}
            </span>
          )}
          {hasDiscount && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold"
              style={{
                background: "#fff",
                color: "rgb(var(--danger))",
                border: "1.5px solid rgb(var(--ink))",
              }}
            >
              -{pct}%
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold"
            style={{
              background: p.total_stock > 0 ? "#fff" : "rgb(var(--ink))",
              color: p.total_stock > 0 ? "rgb(var(--ink))" : "#fff",
              border: "1.5px solid rgb(var(--ink))",
            }}
          >
            {p.total_stock > 0 ? `Stok ${p.total_stock}` : "Habis"}
          </span>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="text-[11px] text-muted uppercase tracking-widest font-bold">
          {categoryLabel(p.category)}
        </div>
        <div className="font-extrabold mt-1 line-clamp-1">{p.name}</div>
        <div className="text-xs text-muted line-clamp-2 mt-1 min-h-[2.25rem]">
          {p.short_desc}
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-[11px] text-muted font-semibold">Mulai</div>
            <div className="font-extrabold text-brand text-lg leading-none">
              {formatIDR(p.min_price)}
            </div>
            {hasDiscount && (
              <div className="text-[11px] text-muted line-through">
                {formatIDR(p.original_min_price)}
              </div>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-ink px-2.5 py-1.5 rounded-md border-2 border-ink group-hover:bg-accent transition-colors">
            Beli <span aria-hidden>→</span>
          </span>
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
