import { NextRequest, NextResponse } from 'next/server';
import { adminApiGuard } from '@/lib/guard';
import { getDb } from '@/lib/db';
import {
  wrProducts,
  applyMargin,
  readPriceOpts,
  readDefaultMargin,
  wrScrapeImages,
  type MarginConfig,
} from '@/lib/warungrebahan';

export async function POST(req: NextRequest) {
  const g = adminApiGuard(req); if (g) return g;
  let remoteList;
  let imageMap: Record<string, string> = {};
  try {
    [remoteList, imageMap] = await Promise.all([wrProducts(), wrScrapeImages()]);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  const variantMap = new Map<string, { cost: number; stock: number }>();
  for (const p of remoteList) {
    for (const v of p.variants || []) variantMap.set(v.id, { cost: Math.round(v.price), stock: v.stock });
  }

  const db = getDb();
  const variants = db.prepare(
    `SELECT id, wr_id, cost_price, margin_mode, margin_value FROM variants
     WHERE source = 'wr' AND wr_id IS NOT NULL`,
  ).all() as Array<{ id: number; wr_id: string; cost_price: number | null; margin_mode: string | null; margin_value: number | null }>;

  const priceOpts = readPriceOpts();
  const defaults = readDefaultMargin();
  const now = new Date().toISOString();

  let updated = 0;
  let stale = 0;
  let imagesUpdated = 0;
  const tx = db.transaction(() => {
    for (const v of variants) {
      const remote = variantMap.get(v.wr_id);
      if (!remote) {
        db.prepare(`UPDATE variants SET wr_stock = 0, is_active = 0, last_synced_at = ? WHERE id = ?`).run(now, v.id);
        stale++;
        continue;
      }
      const margin: MarginConfig = {
        mode: (v.margin_mode === 'fixed' ? 'fixed' : 'percent'),
        value: v.margin_value ?? defaults.value,
      };
      const finalPrice = applyMargin(remote.cost, margin, priceOpts);
      db.prepare(
        `UPDATE variants SET cost_price = ?, price = ?, wr_stock = ?, last_synced_at = ?
         WHERE id = ?`,
      ).run(remote.cost, finalPrice, remote.stock, now, v.id);
      updated++;
    }

    const wrProductsLocal = db.prepare(
      `SELECT id, wr_id, image, image_locked FROM products WHERE source = 'wr' AND wr_id IS NOT NULL`,
    ).all() as Array<{ id: number; wr_id: string; image: string | null; image_locked: number }>;
    for (const p of wrProductsLocal) {
      if (p.image_locked) continue;
      const img = imageMap[p.wr_id];
      if (img && img !== p.image) {
        db.prepare(`UPDATE products SET image = ?, last_synced_at = ? WHERE id = ?`).run(img, now, p.id);
        imagesUpdated++;
      }
    }
  });

  try {
    tx();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated, stale, images_updated: imagesUpdated });
}
