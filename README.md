# GutInc — Toko Produk Digital

Website jualan produk digital (Netflix, Spotify, ChatGPT, dll) dengan integrasi pembayaran QRIS Pakasir embed (tanpa redirect), auto-delivery akun ke pembeli via halaman + email, dashboard admin lengkap, fitur diskon per varian, dan flash sale terjadwal.

## Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Database**: SQLite via `better-sqlite3` (file-based, gampang deploy)
- **UI**: Tailwind CSS + CSS variables untuk dark/light mode hand-coded
- **Pembayaran**: Pakasir QRIS (raw QR string di-render client-side, tanpa redirect)
- **Email**: SMTP via Nodemailer
- **Auth**: HMAC-signed session cookie + bcrypt (12 rounds)

## Quick Start

```powershell
npm install
copy .env.example .env
# edit .env, isi SESSION_SECRET dengan string random minimal 32 karakter
npm run dev
```

Buka `http://localhost:3000`. Saat boot pertama:

- Folder `data/store.db` otomatis dibuat
- 8 produk demo + 16 varian + 80 stok dummy ter-seed
- 1 admin di-generate, password 16 char dicetak di terminal — **simpan baik-baik**

## Akses Admin

Login admin di `/admin/login` (URL ini sengaja **tidak ditampilkan di mana pun publik** — Navbar, Footer, atau homepage). Tambahan proteksi:

- Header `X-Robots-Tag: noindex, nofollow` di semua route admin
- `robots.txt` blokir crawler dari `/admin`, `/api/admin`, `/bayar`, `/pesanan`, `/cek`
- Login rate limit: 6 percobaan / 15 menit per IP, lock 30 menit kalau lewat
- Constant-time password compare untuk anti timing attack
- Session cookie auto-invalidate begitu password diganti
- CSRF protection via `Origin` header check di semua admin mutation

## Konfigurasi Awal

Buka `Admin → Pengaturan` (`/admin/settings`):

1. **Brand**: nama toko, tagline, kontak WhatsApp
2. **Pakasir**: project slug + API key. Set juga **Webhook Secret** (random 24 char) untuk anti-spoof.
3. **SMTP**: host/port/user/pass/from
4. **Akun Admin**: ganti password default

Klik **Tes Koneksi** (Pakasir) dan **Tes Kirim Email** (SMTP) untuk verifikasi.

## Webhook Pakasir

URL webhook ada di halaman Settings setelah `PUBLIC_BASE_URL` di-set. Format:

```
https://domain.com/api/pakasir/webhook?secret=<webhook_secret>
```

Webhook diverifikasi dengan:

- Constant-time secret compare
- Validasi format `order_id` (regex)
- Validasi project & amount cocok dengan DB
- Re-call `transactiondetail` Pakasir sebelum delivery (anti-spoof)

Untuk dev, pakai ngrok: `ngrok http 3000`, set webhook URL di dashboard Pakasir ke URL ngrok.

## Fitur Pricing

### Diskon per Varian

Di **Admin → Produk → Edit → Varian**, klik tombol **Diskon** per baris:

- **Harga Diskon** — wajib < harga normal
- **Label** — bebas, mis. "Promo", "Hemat 30%"
- **Berlaku Sampai** — opsional, datetime; expired otomatis

Tampilan publik: badge `-XX%`, harga coret + harga diskon, hint "Hemat Rp..."

### Flash Sale

Halaman dedicated di **Admin → Flash Sale**:

- Pilih varian → harga flash → jadwal mulai/akhir → max slot (opsional)
- Status: Live / Belum mulai / Berakhir / Slot habis
- Slot di-claim atomically (race-safe), auto-rollback kalau order expired/canceled
- Banner countdown muncul di homepage, badge di kartu produk + product detail
- Flash sale prioritas lebih tinggi dari diskon biasa

## Stok Akun

Admin → Stok Akun → pilih varian → tempel daftar akun di textarea (1 baris = 1 akun).

Format yang otomatis di-parse jadi card per field:
```
email:user@x.com|password:abc123|profile:Anak1
```

## Flow Pembelian

1. User klik produk → pilih varian → isi email/WA → klik Beli
2. Server validasi varian, stok, dan price (effective price = max(flash sale, discount, normal))
3. Insert order + claim flash slot atomically → call Pakasir `transactioncreate/qris` → simpan raw QRIS string
4. Halaman `/bayar/{code}` render QR dari string itu pakai library `qrcode` (canvas, offline)
5. Client polling `/api/orders/{code}/status` tiap 3 detik (rate-limited 60/menit)
6. Pakasir kirim webhook saat lunas → server verify → ambil 1 stok FIFO → kirim email + update DB
7. Halaman polling lihat `delivered` → redirect ke `/pesanan/{code}` dengan kredensial visible

## Security Summary

| Layer | Proteksi |
|---|---|
| Network | Security headers via middleware (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS di prod) |
| Auth | Bcrypt 12 rounds, HMAC-signed session, password-changed-version cookie, 8 jam lifetime |
| Rate limit | Login 6/15min + 30min lock, Order 10/min, Status poll 60/min |
| CSRF | Origin/Referer same-host check di semua admin mutation + login + create order |
| Input | Zod schema validation, format regex untuk order code |
| SQL | Prepared statements semua, SQLite WAL + foreign keys ON |
| Webhook | Constant-time secret check + re-verify ke Pakasir source-of-truth |
| Audit | Tabel `admin_audit` log login success/fail/logout dengan IP |
| Discovery | Admin URL gak diumbar publik, robots.txt + noindex meta |

## Deployment

### Self-host (VPS, Railway, Hetzner)

```powershell
npm run build
# Pastikan SESSION_SECRET random 32+ char
$env:SESSION_SECRET="..."
$env:PUBLIC_BASE_URL="https://domain.com"
$env:NODE_ENV="production"
npm start
```

Pastikan folder `data/` writable.

### cPanel / shared hosting Node

Upload semua kecuali `node_modules`, lalu di Node app manager:
- Set start command: `npm start`
- Set environment variables (`SESSION_SECRET`, `PUBLIC_BASE_URL`, `NODE_ENV=production`)
- Run `npm install --omit=dev`

## Reset Penuh

Hapus `data/store.db*` lalu `npm run dev` — sistem akan re-seed dari awal.

Migrasi database otomatis lewat `PRAGMA user_version`, jadi update versi gak perlu drop tabel.
