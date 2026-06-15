import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(process.cwd(), 'data', 'store.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

function migrate(db: Database.Database) {
  const v = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;

  if (v < 1) {
    const cols = (db.prepare('PRAGMA table_info(variants)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!cols.includes('discount_price')) db.exec('ALTER TABLE variants ADD COLUMN discount_price INTEGER');
    if (!cols.includes('discount_label')) db.exec('ALTER TABLE variants ADD COLUMN discount_label TEXT');
    if (!cols.includes('discount_until')) db.exec('ALTER TABLE variants ADD COLUMN discount_until TEXT');

    const oCols = (db.prepare('PRAGMA table_info(orders)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!oCols.includes('flash_sale_id')) db.exec('ALTER TABLE orders ADD COLUMN flash_sale_id INTEGER');

    const aCols = (db.prepare('PRAGMA table_info(admins)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!aCols.includes('password_changed_at')) db.exec('ALTER TABLE admins ADD COLUMN password_changed_at TEXT');

    db.exec(`
      CREATE TABLE IF NOT EXISTS flash_sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        variant_id INTEGER NOT NULL,
        flash_price INTEGER NOT NULL,
        starts_at TEXT NOT NULL,
        ends_at TEXT NOT NULL,
        max_qty INTEGER,
        sold_qty INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_flash_window ON flash_sales(is_active, ends_at);

      CREATE TABLE IF NOT EXISTS admin_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER,
        action TEXT NOT NULL,
        detail TEXT,
        ip TEXT,
        at TEXT DEFAULT (datetime('now'))
      );
      PRAGMA user_version = 1;
    `);
  }

  if (v < 2) {
    const pCols = (db.prepare('PRAGMA table_info(products)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!pCols.includes('source')) db.exec("ALTER TABLE products ADD COLUMN source TEXT DEFAULT 'manual'");
    if (!pCols.includes('wr_id')) db.exec('ALTER TABLE products ADD COLUMN wr_id TEXT');
    if (!pCols.includes('last_synced_at')) db.exec('ALTER TABLE products ADD COLUMN last_synced_at TEXT');

    const vCols = (db.prepare('PRAGMA table_info(variants)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!vCols.includes('source')) db.exec("ALTER TABLE variants ADD COLUMN source TEXT DEFAULT 'manual'");
    if (!vCols.includes('wr_id')) db.exec('ALTER TABLE variants ADD COLUMN wr_id TEXT');
    if (!vCols.includes('cost_price')) db.exec('ALTER TABLE variants ADD COLUMN cost_price INTEGER');
    if (!vCols.includes('margin_mode')) db.exec('ALTER TABLE variants ADD COLUMN margin_mode TEXT');
    if (!vCols.includes('margin_value')) db.exec('ALTER TABLE variants ADD COLUMN margin_value INTEGER');
    if (!vCols.includes('wr_stock')) db.exec('ALTER TABLE variants ADD COLUMN wr_stock INTEGER');
    if (!vCols.includes('last_synced_at')) db.exec('ALTER TABLE variants ADD COLUMN last_synced_at TEXT');
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_variants_wr_id ON variants(wr_id) WHERE wr_id IS NOT NULL');

    const oCols = (db.prepare('PRAGMA table_info(orders)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!oCols.includes('wr_order_id')) db.exec('ALTER TABLE orders ADD COLUMN wr_order_id TEXT');
    if (!oCols.includes('wr_status')) db.exec('ALTER TABLE orders ADD COLUMN wr_status TEXT');
    db.exec('CREATE INDEX IF NOT EXISTS idx_orders_wr ON orders(wr_order_id)');

    db.exec('PRAGMA user_version = 2;');
  }
}

function init(db: Database.Database) {
  const schemaPath = path.join(process.cwd(), 'lib', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  migrate(db);
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_variants_wr_id ON variants(wr_id) WHERE wr_id IS NOT NULL');
  db.exec('CREATE INDEX IF NOT EXISTS idx_orders_wr ON orders(wr_order_id)');

  const adminRow = db
    .prepare('SELECT COUNT(*) AS n FROM admins')
    .get() as { n: number };

  if (adminRow.n === 0) {
    const password = randomPassword(16);
    const hash = bcrypt.hashSync(password, 12);
    db.prepare('INSERT INTO admins (username, password_hash, password_changed_at) VALUES (?, ?, datetime(\'now\'))').run(
      'admin',
      hash,
    );
    console.log('\n========================================');
    console.log('  Admin pertama dibuat:');
    console.log('  username : admin');
    console.log('  password : ' + password);
    console.log('  Simpan kredensial ini, ganti setelah login.');
    console.log('========================================\n');
  }

  const settingDefaults: Record<string, string> = {
    brand_name: 'GutInc Store',
    brand_tagline: 'Premium digital, harga ramah kantong.',
    whatsapp_contact: '6281234567890',
    pakasir_project: '',
    pakasir_api_key: '',
    pakasir_webhook_secret: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: 'false',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    wr_api_key: '',
    wr_base_url: 'https://warungrebahan.com/api/v1',
    wr_default_margin_mode: 'percent',
    wr_default_margin_value: '15',
    wr_min_margin_rp: '1000',
    wr_round_to: '500',
    notifier_url: '',
    notifier_secret: '',
    notifier_events: 'order.created,order.paid,order.delivered,order.failed',
  };
  const ins = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
  );
  for (const [k, v] of Object.entries(settingDefaults)) ins.run(k, v);

  const prodRow = db
    .prepare('SELECT COUNT(*) AS n FROM products')
    .get() as { n: number };
  if (prodRow.n === 0) seedDemo(db);
}

function seedDemo(db: Database.Database) {
  const products = [
    {
      slug: 'netflix-premium',
      name: 'Netflix Premium',
      category: 'streaming',
      short_desc: 'Nonton serial & film 4K UHD, tanpa iklan.',
      long_desc:
        'Akun Netflix Premium kualitas 4K Ultra HD + HDR. Bisa nonton di berbagai device. Garansi penuh selama masa aktif.',
      image: null,
      brand_color: '#e50914',
    },
    {
      slug: 'spotify-premium',
      name: 'Spotify Premium',
      category: 'music',
      short_desc: 'Musik tanpa iklan, kualitas tinggi, offline mode.',
      long_desc:
        'Spotify Premium individual / family. Dengerin lagu apa aja tanpa iklan, skip unlimited, download buat offline.',
      image: null,
      brand_color: '#1db954',
    },
    {
      slug: 'chatgpt-plus',
      name: 'ChatGPT Plus',
      category: 'ai',
      short_desc: 'Akses GPT-5 / model premium dari OpenAI.',
      long_desc:
        'ChatGPT Plus dengan akses ke model premium, image generation, lebih banyak limit dibanding free tier.',
      image: null,
      brand_color: '#10a37f',
    },
    {
      slug: 'claude-pro',
      name: 'Claude Pro',
      category: 'ai',
      short_desc: 'Asisten AI dari Anthropic, limit besar.',
      long_desc:
        'Claude Pro dengan akses prioritas, limit pesan jauh lebih besar, dan akses ke fitur Projects.',
      image: null,
      brand_color: '#cc785c',
    },
    {
      slug: 'youtube-premium',
      name: 'YouTube Premium',
      category: 'streaming',
      short_desc: 'YouTube tanpa iklan + YouTube Music.',
      long_desc:
        'YouTube Premium full akses: tanpa iklan, background play, YouTube Music Premium.',
      image: null,
      brand_color: '#ff0033',
    },
    {
      slug: 'canva-pro',
      name: 'Canva Pro',
      category: 'design',
      short_desc: 'Desain pro: jutaan template & elemen premium.',
      long_desc:
        'Canva Pro buat tim kreator: brand kit, magic resize, background remover, jutaan asset premium.',
      image: null,
      brand_color: '#00c4cc',
    },
    {
      slug: 'capcut-pro',
      name: 'CapCut Pro',
      category: 'design',
      short_desc: 'Edit video pro: efek & template premium.',
      long_desc:
        'CapCut Pro fitur lengkap: stiker premium, efek transisi, voice clone, AI tools.',
      image: null,
      brand_color: '#1a1a1a',
    },
    {
      slug: 'disney-plus-hotstar',
      name: 'Disney+ Hotstar',
      category: 'streaming',
      short_desc: 'Marvel, Star Wars, Disney, sport live.',
      long_desc:
        'Disney+ Hotstar Premium: nonton film Disney/Marvel/Star Wars + tayangan eksklusif lokal.',
      image: null,
      brand_color: '#0c4ea4',
    },
  ];

  const variantTemplate = (price1m: number, price3m: number) => [
    { name: '1 Bulan Sharing', duration_label: '30 Hari', price: price1m },
    { name: '3 Bulan Sharing', duration_label: '90 Hari', price: price3m },
  ];

  const variantsByProduct: Record<string, Array<{ name: string; duration_label: string; price: number }>> = {
    'netflix-premium': variantTemplate(35000, 90000),
    'spotify-premium': variantTemplate(15000, 39000),
    'chatgpt-plus': variantTemplate(75000, 200000),
    'claude-pro': variantTemplate(80000, 215000),
    'youtube-premium': variantTemplate(18000, 49000),
    'canva-pro': variantTemplate(12000, 30000),
    'capcut-pro': variantTemplate(15000, 38000),
    'disney-plus-hotstar': variantTemplate(20000, 55000),
  };

  const insProd = db.prepare(
    `INSERT INTO products (slug, name, category, short_desc, long_desc, image, brand_color, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insVar = db.prepare(
    `INSERT INTO variants (product_id, name, duration_label, price, description)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const insCred = db.prepare(
    `INSERT INTO credentials (variant_id, content) VALUES (?, ?)`,
  );

  products.forEach((p, idx) => {
    const r = insProd.run(
      p.slug,
      p.name,
      p.category,
      p.short_desc,
      p.long_desc,
      p.image,
      p.brand_color,
      idx,
    );
    const productId = Number(r.lastInsertRowid);
    const variants = variantsByProduct[p.slug] ?? variantTemplate(20000, 50000);
    variants.forEach((v) => {
      const vr = insVar.run(productId, v.name, v.duration_label, v.price, '');
      const variantId = Number(vr.lastInsertRowid);
      for (let i = 1; i <= 5; i++) {
        insCred.run(
          variantId,
          `email:demo${productId}_${variantId}_${i}@mail.com|password:Demo#${productId}${variantId}${i}|profile:Profile ${i}`,
        );
      }
    });
  });

  console.log('Data demo berhasil di-seed (8 produk, 16 varian, 80 stok dummy).');
}

function randomPassword(n: number) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  const arr = new Uint32Array(n);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < n; i++) arr[i] = Math.floor(Math.random() * 0xffffffff);
  }
  for (let i = 0; i < n; i++) out += chars[arr[i] % chars.length];
  return out;
}

export function getDb(): Database.Database {
  if (!global.__db) {
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    init(db);
    global.__db = db;
  }
  return global.__db;
}

export function logAudit(adminId: number | null, action: string, detail: string, ip: string) {
  try {
    getDb()
      .prepare('INSERT INTO admin_audit (admin_id, action, detail, ip) VALUES (?, ?, ?, ?)')
      .run(adminId, action, detail.slice(0, 500), ip);
  } catch (e) {
    console.warn('audit log gagal:', (e as Error).message);
  }
}
