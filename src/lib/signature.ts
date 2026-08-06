import { createHash } from 'crypto';
import { config } from '../config/env';

function md5(input: string): string {
  return createHash('md5').update(input).digest('hex');
}

// Password di-MD5 dulu, dipakai berulang di semua formula signature -> hitung sekali.
const md5Password = () => md5(config.pps.password);

// Tiap endpoint PPS punya formula signature BEDA-BEDA (urutan komponennya beda),
// gak boleh disamain kayak Bearer token. Liat PPS_INTEGRATION_NOTES.md buat referensi
// formula lengkap (termasuk yang belum dipakai di module ini: SELL, CheckCustomer, InquiryPLN).

// Direct Top Up: MD5(MD5(password) + username + produk + notrx)
export function signDirectTopUp(produk: string, notrx: string): string {
  return md5(`${md5Password()}${config.pps.user}${produk}${notrx}`);
}

// StatusTrx / StatusTrxWithDeposit: MD5(notrx + MD5(password))
export function signStatusTrx(notrx: string): string {
  return md5(`${notrx}${md5Password()}`);
}

// Get Gamelist: MD5(timestamp + MD5(password))
export function signGamelist(timestamp: string): string {
  return md5(`${timestamp}${md5Password()}`);
}

// SELL (pulsa/voucher): MD5(mdn + produk + notrx + MD5(password))
export function signSell(mdn: string, produk: string, notrx: string): string {
  return md5(`${mdn}${produk}${notrx}${md5Password()}`);
}

// Inquiry PLN: MD5(customer_no + user + MD5(password))
export function signInquiryPln(customerNo: string): string {
  return md5(`${customerNo}${config.pps.user}${md5Password()}`);
}
