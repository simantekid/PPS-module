# PPS Module

Express module buat integrasi ke H2H API PT. Erajaya Swasembada (PPS) — nyokong 2
kategori: **Top Up Game** (Direct Top Up) dan **Pulsa/Voucher** (SELL). Strukturnya
ngikutin pola `lapakgaming-module-express`. Detail perbandingan & keputusan teknis
ada di `PPS_INTEGRATION_NOTES.md`.

## Setup

```bash
npm install
cp .env.example .env   # isi PPS_USER, PPS_PASSWORD, IRS_CALLBACK_URL
npm run dev
```

Project ini otomatis bikin `pps.db` (SQLite, `node:sqlite`) di root folder pas
pertama kali dijalankan — sama kayak `orders.db` di module LapakGaming.

## Endpoint (prefix `/api`)

### 1. Get Gamelist
```
GET /api/gamelist
```
Proxy ke PPS Get Gamelist — buat tau product code yang valid + field (`userid`/
`zoneid`/`server`) yang dibutuhin tiap game.

### 2. Create Transaksi (SELL atau Top Up, tergantung idtrx)
```
GET /api/trx?kode=<kode>&tujuan=<tujuan>&idtrx=<idtrx>
```
Alternatif: `POST /api/trx` dengan body JSON `{ "idtrx", "tujuan", "kode" }`.

Satu endpoint buat 2 tipe transaksi — **prefix `idtrx` yang nentuin** ini dianggap
SELL (pulsa/voucher) atau Direct Top Up (game), lihat `src/lib/trxType.ts`
(placeholder sementara: `SL-` = SELL, `TP-` = TOPUP, **belum final**, nunggu
konfirmasi pola asli dari tim IRS).

- **SELL**: `tujuan` = nomor tujuan (mdn), `kode` = produk/voucher code. Langsung
  dikirim apa adanya, gak ada split.
- **TOPUP**: `tujuan` di-split pake delimiter **`|`** sesuai jumlah & urutan `fields`
  yang dibutuhin product code itu (dibaca dari Get Gamelist, dicache). Contoh produk
  yang butuh userid+zoneid: `tujuan=123456789|1234`. Produk yang gak butuh field
  (`fields: []`) gak perlu apa-apa di `tujuan`.

### 3. Cek Status
```
GET /api/trx_status?idtrx=<idtrx>
```
Generik buat 2 tipe transaksi — PPS pake `StatusTrx` yang sama buat polling
SELL maupun Direct Top Up.

### 4. Inquiry PLN
```
GET /api/inquiry-pln?customer_no=<customer_no>
```
Alternatif: `POST /api/inquiry-pln` dengan body JSON `{ "customer_no" }`. Proxy ke PPS
Inquiry PLN — verifikasi nomor pelanggan listrik (balikin `meterNumber`, `customerName`,
`subscriberID`, `electricityTariff`) sebelum SELL produk PLN.

### 5. Callback dari PPS (bukan dari IRS)
```
GET /api/callback/trx?serveridtrx=...&clientnotrx=...&status=0&sn=...&message=...
```
Dipanggil server-to-server oleh PPS (GET, bukan POST — beda dari LapakGaming), satu
endpoint buat callback SELL maupun Direct Top Up. URL publik ini yang perlu
didaftarin ke PPS pas setup partner.

## Struktur project

```
src/
  config/      -> env.ts (kredensial + path per environment)
  controllers/ -> trx (SELL + Direct Top Up), callback, gamelist, inquiryPln
  services/    -> pps.service.ts (hit API PPS), topupStore.service.ts (db lokal)
  lib/         -> httpClient, db, signature (MD5 per-endpoint), statusMapper, trxType (SELL vs TOPUP)
  routes/      -> definisi endpoint
  types/       -> tipe TypeScript (payload PPS & IRS)
```
