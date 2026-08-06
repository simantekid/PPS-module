// TODO: konfirmasi ke tim IRS pola prefix idtrx yang beneran dipake buat bedain
// SELL (pulsa/voucher) vs TOPUP (game). Placeholder dulu, ganti di sini aja kalau
// polanya udah fix - gak perlu ubah controller.
export const SELL_PREFIX = 'SL-';
export const TOPUP_PREFIX = 'TP-';

export type TrxType = 'sell' | 'topup';

export function resolveTrxType(idtrx: string): TrxType | null {
  if (idtrx.startsWith(SELL_PREFIX)) return 'sell';
  if (idtrx.startsWith(TOPUP_PREFIX)) return 'topup';
  return null;
}
