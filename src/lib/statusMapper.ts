import { IrsStatus } from '../types/pps';

// Direct Top Up: tabel response PDF menulis 2 = pending, tetapi narasi endpoint dan
// response aktual PPS memakai 9 = pending. Keduanya diterima untuk kompatibilitas.
const DIRECT_TOPUP_STATUS_MAP: Record<'0' | '1' | '2' | '9', IrsStatus> = {
  '2': 'pending',
  '9': 'pending',
  '1': 'gagal',
  '0': 'sukses',
};

// StatusTrx / StatusTrxWithDeposit: 9 = pending, 1 = gagal, 0 = sukses.
// Formatnya BEDA dari Direct Top Up (9 vs 2 buat pending) - jangan digabung jadi satu map.
const STATUS_TRX_MAP: Record<'0' | '1' | '9', IrsStatus> = {
  '9': 'pending',
  '1': 'gagal',
  '0': 'sukses',
};

// Callback: cuma 2 kemungkinan, 0 = sukses, 1 = gagal.
const CALLBACK_STATUS_MAP: Record<'0' | '1', IrsStatus> = {
  '0': 'sukses',
  '1': 'gagal',
};

const DEFAULT_MSG: Record<IrsStatus, string> = {
  pending: 'sedang diproses',
  sukses: 'sukses',
  gagal: 'gagal',
};

// Status 9 juga dipakai untuk error konfigurasi. ServerIDTrx membedakan transaksi yang
// benar-benar diterima (terisi) dari request yang ditolak sebelum transaksi dibuat (null).
export function mapDirectTopUpStatus(raw: {
  Status: string;
  Message: string | null;
  ServerIDTrx: string | null;
}): {
  status: IrsStatus;
  msg: string;
} {
  let status = DIRECT_TOPUP_STATUS_MAP[raw.Status as '0' | '1' | '2' | '9'] ?? 'gagal';

  if (raw.Status === '9' && !raw.ServerIDTrx) {
    status = 'gagal';
  }

  return { status, msg: raw.Message ?? DEFAULT_MSG[status] };
}

// PPS numpuk 2 makna beda di Status "9": trx beneran ke-antri (pending asli, bakal ada
// callback nyusul) VS config/validation error permanen (salah signature/IP/format,
// atau "produk belum dimapping" - lihat LIST OF ERROR MESSAGE di dokumen PPS, semua
// contoh itu Status "9" juga). Pembedanya: kalau `ServerIDTrx` null, PPS gak pernah
// beneran bikin transaksi -> gak akan pernah ada callback nyusul -> treat sebagai
// gagal, BUKAN pending (kalau dibiarin pending, trx bakal nyangkut selamanya di db,
// nunggu callback yang emang gak akan pernah dateng).
export function mapStatusTrxStatus(raw: { Status: string; Message: string | null; ServerIDTrx: string | null }): {
  status: IrsStatus;
  msg: string;
} {
  let status = STATUS_TRX_MAP[raw.Status as '0' | '1' | '9'] ?? 'gagal';

  if (status === 'pending' && !raw.ServerIDTrx) {
    status = 'gagal';
  }

  return { status, msg: raw.Message ?? DEFAULT_MSG[status] };
}

export function mapCallbackStatus(raw: { status: '0' | '1'; message?: string }): {
  status: IrsStatus;
  msg: string;
} {
  const status = CALLBACK_STATUS_MAP[raw.status];
  return { status, msg: raw.message ?? DEFAULT_MSG[status] };
}
