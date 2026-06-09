'use client';

import { useMemo, useState } from 'react';
import ProductCard, { ProductCardData } from './ProductCard';
import CategoryChips from './CategoryChips';

export default function ProductGrid({ products }: { products: ProductCardData[] }) {
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== 'all' && p.category !== cat) return false;
      if (qq && !p.name.toLowerCase().includes(qq)) return false;
      return true;
    });
  }, [products, cat, q]);

  return (
    <div>
      <div className="flex flex-col gap-4 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <CategoryChips active={cat} onChange={setCat} />
        <div className="relative sm:w-72">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari produk..."
            className="input !pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          Tidak ada produk yang cocok dengan filter ini.
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.slug} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
