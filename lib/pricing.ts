import { getDb } from './db';

export interface VariantPriced {
  id: number;
  product_id: number;
  name: string;
  duration_label: string | null;
  price: number;
  description: string | null;
  is_active: number;
  discount_price: number | null;
  discount_label: string | null;
  discount_until: string | null;
}

export interface FlashSaleRow {
  id: number;
  variant_id: number;
  flash_price: number;
  starts_at: string;
  ends_at: string;
  max_qty: number | null;
  sold_qty: number;
  is_active: number;
}

export interface EffectivePrice {
  effective: number;
  original: number;
  badge: string | null;
  flashSaleId: number | null;
  flashEndsAt: string | null;
  flashSlotsLeft: number | null;
}

function isWithin(start: string, end: string, now: number): boolean {
  const s = Date.parse(start);
  const e = Date.parse(end);
  return !Number.isNaN(s) && !Number.isNaN(e) && s <= now && now < e;
}

export function getActiveFlashSale(variantId: number, nowMs = Date.now()): FlashSaleRow | null {
  const rows = getDb()
    .prepare(
      `SELECT * FROM flash_sales
       WHERE variant_id = ? AND is_active = 1
       ORDER BY starts_at DESC`,
    )
    .all(variantId) as FlashSaleRow[];
  for (const r of rows) {
    if (!isWithin(r.starts_at, r.ends_at, nowMs)) continue;
    if (r.max_qty != null && r.sold_qty >= r.max_qty) continue;
    return r;
  }
  return null;
}

export function effectivePrice(variant: VariantPriced, flash: FlashSaleRow | null = null, nowMs = Date.now()): EffectivePrice {
  const fs = flash ?? getActiveFlashSale(variant.id, nowMs);
  if (fs && fs.flash_price < variant.price) {
    const slotsLeft = fs.max_qty != null ? Math.max(0, fs.max_qty - fs.sold_qty) : null;
    return {
      effective: fs.flash_price,
      original: variant.price,
      badge: 'Flash Sale',
      flashSaleId: fs.id,
      flashEndsAt: fs.ends_at,
      flashSlotsLeft: slotsLeft,
    };
  }
  if (
    variant.discount_price != null &&
    variant.discount_price > 0 &&
    variant.discount_price < variant.price
  ) {
    if (variant.discount_until) {
      const u = Date.parse(variant.discount_until);
      if (!Number.isNaN(u) && u <= nowMs) {
        return { effective: variant.price, original: variant.price, badge: null, flashSaleId: null, flashEndsAt: null, flashSlotsLeft: null };
      }
    }
    return {
      effective: variant.discount_price,
      original: variant.price,
      badge: variant.discount_label || 'Diskon',
      flashSaleId: null,
      flashEndsAt: variant.discount_until,
      flashSlotsLeft: null,
    };
  }
  return { effective: variant.price, original: variant.price, badge: null, flashSaleId: null, flashEndsAt: null, flashSlotsLeft: null };
}

export function getVariantPriced(id: number): VariantPriced | null {
  return (
    (getDb()
      .prepare(
        `SELECT id, product_id, name, duration_label, price, description, is_active,
                discount_price, discount_label, discount_until
         FROM variants WHERE id = ?`,
      )
      .get(id) as VariantPriced | undefined) ?? null
  );
}

export function discountPercent(original: number, effective: number): number {
  if (original <= 0 || effective >= original) return 0;
  return Math.round(((original - effective) / original) * 100);
}
