// Field dinamis yang dibutuhin tiap game buat Direct Top Up - NAMA & JUMLAH field-nya
// beda-beda per product (userid+zoneid, userid doang, atau kosong sama sekali - lihat
// contoh real di Get Gamelist: GMLBB10 butuh userid+zoneid, BIGO19K userid doang,
// SLTR1 gak butuh apa-apa). Makanya bentuknya record dinamis, bukan interface tetap.
export type TopUpField = Record<string, string>;

export interface GamelistField {
  name: string;
  type: string;
}

export interface GamelistItem {
  product: string;
  product_desc: string;
  fields: GamelistField[];
}

// Response asli PPS itu ke-bungkus: { status, message, data: [...] } - status/message
// di level ini (bukan per-item kayak yang gue kira awalnya).
export interface GamelistApiResponse {
  status: string;
  message: string;
  data: GamelistItem[];
}

export interface DirectTopUpRequest {
  user: string;
  product: string;
  notrx: string;
  field: TopUpField;
  signature: string;
}

// Status Direct Top Up aktual: 9 = pending jika ServerIDTrx terisi, 1 = gagal,
// 0 = sukses. Tabel PDF juga menulis 2 = pending, jadi mapper menerima keduanya.
// Status 9 + ServerIDTrx null berarti error konfigurasi/request.
export interface DirectTopUpResponse {
  Status: string;
  ServerIDTrx: string | null;
  ClientNoTrx: string;
  Message: string | null;
}

// SELL (pulsa/voucher): status 9 = pending/config gagal, 1 = gagal, 0 = sukses.
// Sama skemanya kayak StatusTrx; Direct Top Up juga menerima 2 sebagai pending untuk
// kompatibilitas dengan tabel response di PDF.
export interface SellResponse {
  Status: string;
  ServerIDTrx: string | null;
  ClientNoTrx: string | null;
  Message: string | null;
}

export interface StatusTrxRequest {
  user: string;
  notrx: string;
  signature: string;
}

// Status StatusTrx: 9 = pending, 1 = gagal, 0 = sukses.
export interface StatusTrxResponse {
  Status: string;
  ServerIDTrx: string | null;
  ClientNoTrx: string;
  Message: string | null;
}

// Callback dari PPS itu GET + query string, bukan POST + JSON body kayak LapakGaming.
// status di sini cuma 2 kemungkinan: 0 = sukses, 1 = gagal (PPS gak dorong callback
// buat state pending, itu cuma keluar di response awal Direct Top Up/SELL).
export interface TopUpCallbackQuery {
  serveridtrx: string;
  clientnotrx: string;
  status: '0' | '1';
  mdn?: string;
  sn?: string;
  message?: string;
}

// IRS-facing types (IRS -> Middleware) - kontraknya sengaja disamain persis kayak
// module LapakGaming, IRS gak perlu tau bedanya di belakang layar.

export type IrsStatus = 'pending' | 'sukses' | 'gagal';

export interface IrsTopUpRequest {
  idtrx: string;
  tujuan: string;
  kode: string;
}

export interface IrsTopUpResponse {
  idtrx: string;
  tujuan: string;
  kode: string;
  vendor_idtrx: string | null;
  status: IrsStatus;
  sn: string | null;
  msg: string;
}

// Inquiry PLN: cek nomor pelanggan listrik sebelum SELL produk PLN.
// Status cuma 2 kemungkinan (beda dari StatusTrx/Direct Top Up): 1 = gagal, 0 = sukses.
export interface InquiryPlnRequest {
  user: string;
  customerNumber: string;
  signature: string;
}

export interface InquiryPlnData {
  meterNumber: string;
  customerName: string;
  subscriberID: string;
  electricityTariff: string;
}

export interface InquiryPlnResponse {
  status: string;
  message: string;
  data: InquiryPlnData;
}

export interface TopUpRecord {
  idtrx: string;
  vendor_idtrx: string | null;
  kode: string;
  tujuan: string;
  status: IrsStatus;
  sn: string | null;
  msg: string;
  created_at: string;
  updated_at: string;
}
