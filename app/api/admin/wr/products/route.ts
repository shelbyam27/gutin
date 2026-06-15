import { NextRequest, NextResponse } from 'next/server';
import { adminApiGuard } from '@/lib/guard';
import { getDb } from '@/lib/db';
import { wrProducts, applyMargin, readDefaultMargin, readPriceOpts, wrScrapeImages } from '@/lib/warungrebahan';

export async function POST(req: NextRequest) {
  const g = adminApiGuard(req); if (g) return g;
  try {
    const [products, images] = await Promise.all([wrProducts(), wrScrapeImages()]);
    const db = getDb();
    const imported = db.prepare(
      'SELECT wr_id FROM variants WHERE wr_id IS NOT NULL',
    ).all() as Array<{ wr_id: string }>;
    const importedSet = new Set(imported.map((r) => r.wr_id));
    const margin = readDefaultMargin();
    const priceOpts = readPriceOpts();

    const enriched = products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      image: images[p.id] || null,
      variants: (p.variants || []).map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price,
        duration: v.duration,
        type: v.type,
        warranty: v.warranty,
        stock: v.stock,
        terms: v.terms,
        delivery_terms: v.delivery_terms,
        suggested_price: applyMargin(v.price, margin, priceOpts),
        imported: importedSet.has(v.id),
      })),
    }));

    return NextResponse.json({
      ok: true,
      products: enriched,
      default_margin: margin,
      price_opts: priceOpts,
      images_found: Object.keys(images).length,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
