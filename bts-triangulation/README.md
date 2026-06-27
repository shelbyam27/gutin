# BTS Triangulation Tool

Implementasi praktis dari konsep yang dijelaskan di
[blog.tegalsec.org — Methode Melacak Ponsel: Triangulating with BTS](https://blog.tegalsec.org/methode-melacak-ponsel-triangulating-with-bts-for-swift-recovery/).

Artikel aslinya berhenti di teori (penulis menolak share kode karena alasan
etis/legal). Tool ini menyediakan implementasi matematikanya — tapi **hanya
untuk data BTS yang Anda akses secara sah** (HP sendiri, lab penelitian,
data publik OpenCellID, atau wewenang resmi).

> ⚠️ **Etika / legal**
> Data lokasi serving cell milik orang lain hanya boleh diakses operator atau
> aparat penegak hukum dengan dasar hukum. Jangan pakai tool ini untuk
> men-stalk orang. Repo ini untuk edukasi (memahami cara kerja jaringan
> selular) dan untuk Anda sendiri (cek HP/IoT device Anda).

---

## Cara kerja

1. **Input** — daftar observasi serving cell + neighbor cell:
   `MCC` (kode negara), `MNC` (operator), `LAC/TAC` (area), `CID` (cell ID),
   plus salah satu indikator jarak:
   - `ta` (Timing Advance) — paling akurat. GSM: 1 step ≈ 550 m, LTE: 1 step ≈ 78 m.
   - `rssi` (dBm) — diestimasi dengan log-distance path-loss (n=3.5).

2. **Resolve BTS → koordinat** dengan urutan prioritas:
   1. `lat`/`lon` inline di JSON (offline mode).
   2. [OpenCellID](https://opencellid.org) — gratis, perlu API key.
   3. Cache lokal `cache/cells.json`.

3. **Trilateration** — weighted non-linear least-squares
   (`scipy.optimize.least_squares`, Levenberg-Marquardt) minimasi
   `Σ wᵢ · (‖p − pᵢ‖ − dᵢ)²`. Inisial guess: weighted centroid.

4. **Output** — koordinat fix + radius akurasi (RMS residual) + peta Leaflet
   (`map.html`) dengan lingkaran jarak tiap tower.

---

## Instalasi

```bash
pip install -r requirements.txt
```

(Opsional) daftar di https://opencellid.org → ambil API key:

```bash
export OCID_API_KEY=YOUR_KEY     # Linux/Mac
$env:OCID_API_KEY="YOUR_KEY"     # PowerShell
```

## Pemakaian

```bash
python cli.py sample_input.json
```

Buka `map.html` di browser untuk melihat hasil.

## Bagaimana mendapatkan input data (cara legal)

Untuk HP Anda sendiri:

| Platform | Cara |
|---|---|
| **Android (root / dev mode)** | Dial `*#*#4636#*#*` → Phone Information. Atau `adb shell dumpsys telephony.registry`. Apps: *NetMonster*, *Cellular-Z*, *G-NetTrack Lite*. |
| **iOS** | Dial `*3001#12345#*` (Field Test Mode). |
| **USB modem / Raspberry Pi + GSM HAT** | AT command: `AT+CREG=2` lalu `AT+CREG?` (LAC/CID), `AT+CSQ` (RSSI), `AT+CENG?` pada modul Quectel/SIMCom (neighbor cells + TA). |
| **SDR (RTL-SDR + grgsm_livemon)** | Hanya yang broadcast publik. Jangan decode trafik orang lain. |

## Schema input

```json
[
  {
    "mcc": 510,            // wajib — kode negara (510 = Indonesia)
    "mnc": 10,             // wajib — kode operator (10 = Telkomsel)
    "lac": 1001,           // wajib — Location Area Code (atau TAC di LTE)
    "cid": 12345,          // wajib — Cell ID
    "radio": "lte",        // gsm | umts | lte | nr
    "rssi": -78,           // opsional, dBm
    "ta": 3,               // opsional, timing advance
    "lat": -6.20,          // opsional, koordinat tower jika sudah tahu
    "lon": 106.81,
    "range_m": 1500        // opsional, hint radius coverage
  }
]
```

Minimal 3 cell observation untuk fix 2D yang stabil.

## File

```
bts-triangulation/
├── bts_locate.py      # core: resolve + trilateration math
├── cli.py             # CLI entrypoint
├── sample_input.json  # contoh input (4 BTS di Jakarta)
├── requirements.txt
├── README.md          # ini
└── cache/cells.json   # auto-generated cache OpenCellID
```

## Batasan akurasi

- Outdoor urban dengan 3+ TA-equipped LTE cells: **±50–200 m**.
- Hanya RSSI: **±300 m – 2 km** (multipath, fading, obstruksi).
- Single cell: hanya bisa kasih radius coverage (km-an).

## Referensi

- TegalSec — [Methode Melacak Ponsel](https://blog.tegalsec.org/methode-melacak-ponsel-triangulating-with-bts-for-swift-recovery/)
- [Worldwide Cellular Tower Data Triangulation](https://x-it.medium.com/worldwide-cellular-tower-data-triangulation-for-cell-phone-location-tracking-3c912da78de1)
- 3GPP TS 45.010 — Timing Advance (GSM)
- 3GPP TS 36.213 §4.2.3 — TA on LTE
- [OpenCellID API docs](https://wiki.opencellid.org/wiki/API)
