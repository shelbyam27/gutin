import { getDb } from './db';
import { getSetting } from './settings';
import {
  wrProducts,
  wrScrapeImages,
  applyMargin,
  readPriceOpts,
  readDefaultMargin,
  type MarginConfig,
} from './warungrebahan';

declare global {
  // eslint-disable-next-line no-var
  var __wrSync: {
    timer: NodeJS.Timeout | null;
    lastRunAt: number;
    lastResult: SyncResult | null;
    inFlight: boolean;
    lastIntervalMs: number | null;
  } | undefined;
}

export interface SyncResult {
  ranAt: string;
  ok: boolean;
  message?: string;
  updated?: number;
  stale?: number;
  imagesUpdated?: number;
  durationMs?: number;
}

function state() {
  if (!global.__wrSync) {
    global.__wrSync = { timer: null, lastRunAt: 0, lastResult: null, inFlight: false, lastIntervalMs: null };
  }
  return global.__wrSync!;
}

export function getSyncState() {
  const s = state();
  return {
    lastRunAt: s.lastRunAt,
    lastResult: s.lastResult,
    running: s.inFlight,
    intervalMs: s.lastIntervalMs,
  };
}

function readConfig() {
  const enabled = getSetting('wr_auto_sync_enabled') !== 'false';
  const minutes = Math.max(1, Number(getSetting('wr_auto_sync_interval_minutes') || '15') || 15);
  const apiKey = getSetting('wr_api_key').trim();
  return { enabled, minutes, apiKey };
}

export async function runWrSync(): Promise<SyncResult> {
  const s = state();
  if (s.inFlight) {
    return { ranAt: new Date().toISOString(), ok: false, message: 'sync sudah jalan, di-skip' };
  }
  s.inFlight = true;
  const start = Date.now();
  try {
    const { apiKey } = readConfig();
    if (!apiKey) {
      const r: SyncResult = { ranAt: new Date().toISOString(), ok: false, message: 'WR API key kosong' };
      s.lastResult = r; s.lastRunAt = Date.now();
      return r;
    }

    const [remoteList, imageMap] = await Promise.all([wrProducts(), wrScrapeImages()]);

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

    let updated = 0, stale = 0, imagesUpdated = 0;
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
      ).all() as Array<{ id: number; wr_id: string; image: string | null; image_locked: number | null }>;
      for (const p of wrProductsLocal) {
        if (p.image_locked) continue;
        const img = imageMap[p.wr_id];
        if (img && img !== p.image) {
          db.prepare(`UPDATE products SET image = ?, last_synced_at = ? WHERE id = ?`).run(img, now, p.id);
          imagesUpdated++;
        }
      }
    });
    tx();

    const r: SyncResult = {
      ranAt: new Date().toISOString(),
      ok: true,
      updated, stale, imagesUpdated,
      durationMs: Date.now() - start,
    };
    s.lastResult = r;
    s.lastRunAt = Date.now();
    return r;
  } catch (e) {
    const r: SyncResult = {
      ranAt: new Date().toISOString(),
      ok: false,
      message: (e as Error).message.slice(0, 200),
      durationMs: Date.now() - start,
    };
    s.lastResult = r;
    s.lastRunAt = Date.now();
    return r;
  } finally {
    s.inFlight = false;
  }
}

export function ensureWrScheduler() {
  if (process.env.WR_DISABLE_SCHEDULER === '1') return;
  const s = state();
  const cfg = readConfig();
  const targetMs = cfg.enabled && cfg.apiKey ? cfg.minutes * 60_000 : null;

  if (targetMs === s.lastIntervalMs && (s.timer || !targetMs)) return;

  if (s.timer) {
    clearInterval(s.timer);
    s.timer = null;
  }
  s.lastIntervalMs = targetMs;
  if (!targetMs) return;

  s.timer = setInterval(() => {
    void runWrSync();
  }, targetMs);
  if (typeof s.timer.unref === 'function') s.timer.unref();

  if (Date.now() - s.lastRunAt > targetMs) {
    void runWrSync();
  }
}

export async function maybeRunSyncIfStale(): Promise<void> {
  const s = state();
  const cfg = readConfig();
  if (!cfg.enabled || !cfg.apiKey) return;
  const intervalMs = cfg.minutes * 60_000;
  if (Date.now() - s.lastRunAt < intervalMs) return;
  if (s.inFlight) return;
  await runWrSync();
}
