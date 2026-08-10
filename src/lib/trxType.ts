// idtrx sekarang di-generate full angka sama IRS (gak bisa custom prefix lagi),
// makanya prefix penentu tipe trx dipindah ke `kode`, bukan `idtrx`.
export const SELL_PREFIX = 'SL-';
export const TOPUP_PREFIX = 'TP-';

export type TrxType = 'sell' | 'topup';

export function resolveTrxType(kode: string): TrxType | null {
  if (kode.startsWith(SELL_PREFIX)) return 'sell';
  if (kode.startsWith(TOPUP_PREFIX)) return 'topup';
  return null;
}

// Product code asli (tanpa prefix SL-/TP-) buat dikirim ke PPS (Get Gamelist lookup,
// SELL, Direct Top Up) - prefix cuma buat routing internal, PPS gak kenal itu.
export function stripTrxPrefix(kode: string): string {
  if (kode.startsWith(SELL_PREFIX)) return kode.slice(SELL_PREFIX.length);
  if (kode.startsWith(TOPUP_PREFIX)) return kode.slice(TOPUP_PREFIX.length);
  return kode;
}
