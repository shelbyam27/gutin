import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminApiGuard } from '@/lib/guard';
import { getDb } from '@/lib/db';
import {
  wrProducts,
  applyMargin,
  readDefaultMargin,
  readPriceOpts,
  slugifyWr,
  categorize,
  wrScrapeImages,
  type WrProduct,
  type WrVariant,
  type MarginConfig,
} from '@/lib/warungrebahan';

const Body = z.object({
  selections: z.array(z.object({
    productId: z.string().min(1),
    variantIds: z.array(z.string().min(1)).min(1),
    margin: z.object({
      mode: z.enum(['percent', 'fixed']).optional(),
      value: z.number().nonnegative().optional(),
    }).optional(),
  })).min(1),
});

function buildDescription(v: WrVariant): string {
  const parts: string[] = [];
  if (v.duration) parts.push(`Durasi: ${v.duration}`);
  if (v.type) parts.push(`Tipe: ${v.type}`);
  if (v.warranty) parts.push(`Garansi: ${v.warranty}`);
  if (v.terms) parts.push(`S&K: ${v.terms}`);
  if (v.delivery_terms) parts.push(`Pengiriman: ${v.delivery_terms}`);
  return parts.join('\n');
}

function variantDisplayName(v: WrVariant): string {
  if (v.type && v.duration) return `${v.type} — ${v.duration}`;
  if (v.type) return v.type;
  if (v.duration) return v.duration;
  return v.name;
}

export async function POST(req: NextRequest) {
  const g = adminApiGuard(req); if (g) return g;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Bad input' }, { status: 400 });
  }

  let remoteList: WrProduct[];
  let imageMap: Record<string, string> = {};
  try {
    [remoteList, imageMap] = await Promise.all([wrProducts(), wrScrapeImages()]);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
  const productMap = new Map(remoteList.map((p) => [p.id, p]));

  const defaultMargin = readDefaultMargin();
  const priceOpts = readPriceOpts();

  const db = getDb();
  let importedVariants = 0;
  let updatedVariants = 0;
  let createdProducts = 0;
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    for (const sel of parsed.data.selections) {
      const remote = productMap.get(sel.productId);
      if (!remote) continue;

      const margin: MarginConfig = {
        mode: sel.margin?.mode || defaultMargin.mode,
        value: sel.margin?.value != null ? sel.margin.value : defaultMargin.value,
      };

      let local = db.prepare(
        'SELECT id, slug FROM products WHERE wr_id = ?',
      ).get(sel.productId) as { id: number; slug: string } | undefined;

      const remoteImage = imageMap[sel.productId] || null;

      let productId: number;
      if (!local) {
        const slug = slugifyWr(remote.name, remote.id);
        const exists = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug) as { id: number } | undefined;
        const finalSlug = exists ? `${slug}-${Date.now().toString(36).slice(-4)}` : slug;
        const order = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM products').get() as { m: number }).m + 1;
        const r = db.prepare(
          `INSERT INTO products (slug, name, category, short_desc, long_desc, image, brand_color,
                                 sort_order, is_active, source, wr_id, last_synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'wr', ?, ?)`,
        ).run(
          finalSlug,
          remote.name,
          categorize(remote.category),
          (remote.description || '').slice(0, 180),
          remote.description || '',
          remoteImage,
          '#0063e6',
          order,
          remote.id,
          now,
        );
        productId = Number(r.lastInsertRowid);
        createdProducts++;
      } else {
        productId = local.id;
        const lockRow = db.prepare('SELECT image_locked FROM products WHERE id = ?').get(productId) as { image_locked: number } | undefined;
        const locked = !!lockRow?.image_locked;
        if (remoteImage && !locked) {
          db.prepare(
            `UPDATE products SET name = ?, category = ?, short_desc = ?, long_desc = ?, image = ?, last_synced_at = ?
             WHERE id = ?`,
          ).run(
            remote.name,
            categorize(remote.category),
            (remote.description || '').slice(0, 180),
            remote.description || '',
            remoteImage,
            now,
            productId,
          );
        } else {
          db.prepare(
            `UPDATE products SET name = ?, category = ?, short_desc = ?, long_desc = ?, last_synced_at = ?
             WHERE id = ?`,
          ).run(
            remote.name,
            categorize(remote.category),
            (remote.description || '').slice(0, 180),
            remote.description || '',
            now,
            productId,
          );
        }
      }

      for (const wrVarId of sel.variantIds) {
        const rv = remote.variants.find((x) => x.id === wrVarId);
        if (!rv) continue;
        const cost = Math.max(0, Math.round(rv.price));
        const finalPrice = applyMargin(cost, margin, priceOpts);
        const desc = buildDescription(rv);
        const dispName = variantDisplayName(rv);

        const existing = db.prepare('SELECT id FROM variants WHERE wr_id = ?').get(rv.id) as { id: number } | undefined;
        if (existing) {
          db.prepare(
            `UPDATE variants SET name = ?, duration_label = ?, price = ?, description = ?,
                                  cost_price = ?, margin_mode = ?, margin_value = ?, wr_stock = ?,
                                  last_synced_at = ?, source = 'wr'
             WHERE id = ?`,
          ).run(
            dispName,
            rv.duration || null,
            finalPrice,
            desc,
            cost,
            margin.mode,
            margin.value,
            rv.stock,
            now,
            existing.id,
          );
          updatedVariants++;
        } else {
          db.prepare(
            `INSERT INTO variants (product_id, name, duration_label, price, description, is_active,
                                   source, wr_id, cost_price, margin_mode, margin_value, wr_stock, last_synced_at)
             VALUES (?, ?, ?, ?, ?, 1, 'wr', ?, ?, ?, ?, ?, ?)`,
          ).run(
            productId,
            dispName,
            rv.duration || null,
            finalPrice,
            desc,
            rv.id,
            cost,
            margin.mode,
            margin.value,
            rv.stock,
            now,
          );
          importedVariants++;
        }
      }
    }
  });

  try {
    tx();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    created_products: createdProducts,
    imported_variants: importedVariants,
    updated_variants: updatedVariants,
  });
}
