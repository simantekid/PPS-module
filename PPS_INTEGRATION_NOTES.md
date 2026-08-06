# Catatan Integrasi PPS (PT. Erajaya Swasembada) — H2H API v3.2.3

## Posisi di arsitektur besar

```
IRS  <-->  Middleware (project ini)  <-->  PPS (Switcher)  <-->  Provider (vendor game asli)
```

Istilah di dokumen PPS: **"Partner" = kita** (module ini), **"PPS (Switcher)"** =
perannya sama kayak LapakGaming, **"Provider"** = vendor game aslinya di belakang PPS.
IRS gak disebut di dokumen PPS sama sekali — itu urusan internal kita, kontraknya
(`idtrx`, `tujuan`, `kode` → `IrsTopUpResponse`) sengaja disamain persis kayak module
LapakGaming biar IRS gak perlu tau ada perubahan provider di belakang layar.

## Endpoint yang dipakai di module ini (dan yang di-skip)

Kebutuhan ternyata 2: pengisian **voucher game** (Direct Top Up) DAN **pulsa/voucher
umum** (SELL) — satu module ini nyokong dua-duanya, dibedain dari prefix `idtrx`
(lihat bagian "Routing SELL vs TOPUP" di bawah), bukan dari endpoint/URL beda.

| Endpoint | Dipakai? | Kenapa |
|---|---|---|
| **Get Gamelist** | ✅ | Sumber kebenaran field (`userid`/`zoneid`/`server`) & product code per game — `gamelist.controller.ts` |
| **Direct Top Up** | ✅ | Buat trx tipe TOPUP (game) — `trx.controller.ts` → `createTrx` |
| **SELL** | ✅ | Buat trx tipe SELL (pulsa/voucher) — `trx.controller.ts` → `createTrx` |
| **API Callback** | ✅ | Pengganti `handleOrderCallback` — beda format (GET+query, bukan POST+body), satu handler buat SELL & TOPUP — `callback.controller.ts` |
| **StatusTrx** | ✅ | Fallback polling kalau callback gak nyampe dalem 60 detik, generik buat SELL & TOPUP — `trx.controller.ts` → `getTrxStatus` |
| **Inquiry PLN** | ✅ | Verifikasi nomor pelanggan PLN (meter/tarif) sebelum SELL produk PLN — `inquiryPln.controller.ts` |
| Check Customer | ❌ skip | Cuma buat validasi akun E-Wallet (Gopay/OVO/DANA), gak relevan buat game/pulsa |
| StatusTrxWithDeposit | ❌ skip | Sama kayak StatusTrx + info saldo di `message`, gak wajib |

## Routing SELL vs TOPUP dari idtrx

Satu endpoint (`POST/GET /api/trx`) buat 2 tipe transaksi. Yang nentuin itu SELL atau
TOPUP adalah **prefix `idtrx`**, dicek di `src/lib/trxType.ts`:

```ts
export const SELL_PREFIX = 'SL-';   // placeholder
export const TOPUP_PREFIX = 'TP-';  // placeholder
```

⚠️ **Ini masih placeholder** — belum dikonfirmasi ke tim IRS pola prefix idtrx yang
beneran mereka pakai. Begitu polanya fix, tinggal ganti 2 konstanta ini, gak perlu
ubah controller. Kalau idtrx gak cocok salah satu prefix, `createTrx` balikin `400
BAD_REQUEST` (fail-fast, daripada nebak-nebak salah tipe).

`getTrxStatus` & callback handler **gak perlu tau tipe trx** — StatusTrx dipakai buat
polling dua-duanya, dan callback PPS formatnya sama persis buat SELL maupun TOPUP.

## Beda teknis penting vs LapakGaming

### 1. Auth: signature per-request, bukan Bearer token statis
LapakGaming: `Authorization: Bearer <API_KEY>` (header statis).
PPS: gak ada token statis — tiap request wajib `signature` = MD5 hash, **formulanya
beda tiap endpoint**. Yang dipakai di module ini (`src/lib/signature.ts`):

| Endpoint | Formula signature |
|---|---|
| Direct Top Up | `MD5(MD5(password) + username + produk + notrx)` |
| SELL | `MD5(mdn + produk + notrx + MD5(password))` |
| StatusTrx | `MD5(notrx + MD5(password))` |
| Get Gamelist | `MD5(timestamp + MD5(password))` |
| Inquiry PLN | `MD5(customer_no + user + MD5(password))` |

Formula endpoint yang di-skip (buat referensi kalau nanti dibutuhin):
- Check Customer: `MD5(notrx+user+product+MD5(password)+customer_no)`

### 2. Content-Type campur-campur
Direct Top Up & Get Gamelist pake `application/json`. StatusTrx pake
`x-www-form-urlencoded` (`pps.service.ts` → `getStatusTrx` override header manual).
LapakGaming konsisten JSON semua endpoint.

### 3. Callback GET + query string, bukan POST + JSON
LapakGaming nge-`POST` JSON body ke callback URL kita. PPS malah **hit balik pake
GET**, semua data di query string:
```
GET https://partner-domain:port/api-url?serveridtrx=...&clientnotrx=...&status=0&mdn=...&sn=...&message=...
```
`clientnotrx` = idtrx yang kita kirim pas Direct Top Up — dipakai buat matching ke
row lokal, sama kayak `reference_id` di LapakGaming.

### 4. Base URL & path beda per environment, bukan cuma ganti host
Get Gamelist & Direct Top Up: devl pake path `/event-driven-h2h/...`, production pake
`/h2h/evshop/...`. Dipilih otomatis di `config/env.ts` (`ppsPaths`) berdasarkan
`NODE_ENV` — **pastiin konsisten** sama environment kredensial (`PPS_USER`/
`PPS_PASSWORD`) yang dipakai, staging & production kemungkinan besar punya akun beda.

Check Customer malah punya **host + port sendiri** (`paymentservices-evs.erajaya.com`,
port `9447` devl / `9448` prod) walau lagi devl — beda dari endpoint lain yang devl-nya
di `azec-services-staging.erajaya.com`. (Gak dipakai di module ini, cuma buat catatan
kalau nanti Check Customer diaktifin.)

### 5. Status code beda arti tiap endpoint — JANGAN disamain
- **Direct Top Up**: `2` = pending, `1` = gagal, `0` = sukses
- **SELL**: `9` = pending/config gagal, `1` = gagal, `0` = sukses (skema sama kayak StatusTrx!)
- **StatusTrx**: `9` = pending, `1` = gagal, `0` = sukses
- **Callback**: cuma `0` (sukses) / `1` (gagal) — gak ada state pending di callback

Ini kenapa `statusMapper.ts` punya fungsi mapping terpisah per skema
(`mapDirectTopUpStatus`, `mapStatusTrxStatus`, `mapCallbackStatus`), gak digabung jadi
satu map kayak `mapOrderStatusToIrs` di LapakGaming. SELL kebetulan skemanya sama
persis kayak StatusTrx (9/1/0), jadi `trx.controller.ts` reuse `mapStatusTrxStatus`
buat SELL juga — cuma Direct Top Up yang beda (0/1/2).

### 6. Field dinamis via Get Gamelist (lebih rapi dari LapakGaming)
LapakGaming: `splitTujuan` nebak manual (4 karakter terakhir `tujuan` = zone id, cuma
buat kode berawalan `ML`).
PPS: **Get Gamelist ngasih tau langsung** field apa yang dibutuhin tiap game lewat
`fields: [{name, type}]`, dan Direct Top Up nerima field itu sebagai **object
terstruktur** `{"userid":"...","zoneid":"..."}`, bukan 1 string yang perlu di-split.

**Update (udah di-generalize, bukan hardcode ML lagi)**: data real dari Get Gamelist
(dites 2026-07-31) konfirmasi hardcode ML-only itu SALAH — `FFDID01` (Free Fire),
`ROCOIN6BCC` (Ragnarok), `CODCPID31` (COD), `LNDID15` (Love Nikki) semuanya juga
butuh `userid`+`zoneid`, bukan cuma produk `ML*`. Ada juga produk yang butuh field
beda total: `BIGO19K` cuma `userid` (gak ada zoneid), `GMLBB10KSO`/`SLTR1` malah gak
butuh field sama sekali (`fields: []`).

`trx.controller.ts` → `buildTopUpField` sekarang generik: baca `fields` per
product_code dari `gamelistCache.service.ts` (di-cache 10 menit biar gak nembak PPS
2x tiap order), terus split `tujuan` pake delimiter **`|`** (disepakatin sama tim
IRS) sebanyak jumlah field yang dibutuhin, di-map SESUAI URUTAN yang PPS balikin di
`fields`. Contoh: `tujuan=123456789|1234` buat produk yang butuh `userid`+`zoneid` →
jadi `{"userid":"123456789","zoneid":"1234"}`. Produk yang `fields: []` (kayak
`SLTR1`) otomatis dikirim `field: {}` tanpa perlu value apa-apa di `tujuan`.

Kalau jumlah value di `tujuan` gak cocok sama jumlah field yang dibutuhin, atau
product_code gak ketemu di Get Gamelist, `createTrx` balikin `400 BAD_REQUEST` dgn
pesan jelas (`BadTujuanError`), bukan asal jalan/nebak.

### 7. Fallback polling 60 detik itu WAJIB, bukan opsional
Di LapakGaming, polling `/order_status` itu jaring pengaman tambahan. Di PPS,
dokumen resmi (diagram "Pending Success/Failed Case") eksplisit bilang: **kalau
callback gak nyampe dalem 60 detik, partner wajib polling StatusTrx**. Jangan
skip implementasi `getTrxStatus`.

## Lesson learned dari module LapakGaming yang udah dibawa dari awal ke sini

1. **Idempotency guard** (`trx.controller.ts` → `createTrx`) — idtrx yang sama
   di-resend, dan status lama masih hidup (bukan `gagal`) → jawab dari db, JANGAN
   nembak PPS lagi. Ini nyegah bug yang pernah kejadian di LapakGaming: status sukses
   ketimpa balik jadi pending gara-gara resend nembak API lagi.
2. **Log di titik krusial** — `findTopUpByIdtrx` log tiap kali dipanggil (ketemu/gak),
   `forwardToIrs` log payload sebelum kirim + response body abis kirim. Penting buat
   debug kasus "PESAN tidak dikenal" ala IRS X kemarin — kalau IRS gak ngenalin format
   forward kita, response body-nya harusnya kebaca di log.
3. **Status final gak boleh nembak ulang ke provider** — `getTrxStatus` jawab
   langsung dari db kalau status udah `sukses`/`gagal`, cuma nembak PPS beneran kalau
   masih `pending`.
