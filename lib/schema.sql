PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  short_desc TEXT,
  long_desc TEXT,
  image TEXT,
  brand_color TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  source TEXT DEFAULT 'manual',
  wr_id TEXT,
  last_synced_at TEXT,
  image_locked INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  duration_label TEXT,
  price INTEGER NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  discount_price INTEGER,
  discount_label TEXT,
  discount_until TEXT,
  source TEXT DEFAULT 'manual',
  wr_id TEXT,
  cost_price INTEGER,
  margin_mode TEXT,
  margin_value INTEGER,
  wr_stock INTEGER,
  last_synced_at TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'available',
  order_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  sold_at TEXT,
  FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cred_pool ON credentials(variant_id, status);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  variant_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  fee INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT,
  status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'qris',
  payment_number TEXT,
  expires_at TEXT,
  paid_at TEXT,
  delivered_at TEXT,
  delivered_content TEXT,
  flash_sale_id INTEGER,
  wr_order_id TEXT,
  wr_status TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_changed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

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
