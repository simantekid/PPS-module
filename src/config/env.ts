import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  pps: {
    baseUrl: required('PPS_BASE_URL', 'https://azec-services-staging.erajaya.com'),
    // CheckCustomer host/port beda dari endpoint lain (bukan azec-services-staging) -
    // gak dipakai di module ini (skip, lihat PPS_INTEGRATION_NOTES.md), disiapin aja kalau nanti dibutuhin.
    checkCustomerBaseUrl: process.env.PPS_CHECK_CUSTOMER_BASE_URL ?? '',
    user: required('PPS_USER'),
    password: required('PPS_PASSWORD'),
  },
  // URL IRS buat nerima push dari middleware saat callback PPS masuk.
  // Kosongin kalau forwarding belum mau diaktifin.
  irsCallbackUrl: process.env.IRS_CALLBACK_URL ?? '',
};

// Path REST PPS beda antara devl ("event-driven-h2h/...") dan production
// ("h2h/evshop/...") - bukan cuma beda host, jadi gak cukup ganti PPS_BASE_URL doang.
// Dipilih otomatis berdasarkan NODE_ENV, pastiin konsisten sama environment kredensial
// (PPS_USER/PPS_PASSWORD) yang dipakai.
const isProd = config.nodeEnv === 'production';

export const ppsPaths = {
  gamelist: isProd ? '/h2h/evshop/game-list' : '/event-driven-h2h/game-list',
  directTopUp: isProd ? '/h2h/evshop/direct-topup' : '/event-driven-h2h/direct-topup',
  statusTrx: isProd ? '/h2h/evshop/StatusTrx' : '/event-driven-h2h/StatusTrx',
  sell: isProd ? '/h2h/evshop/Sell' : '/event-driven-h2h/Sell',
  inquiryPln: isProd ? '/h2h/evshop/inquiry-pln' : '/event-driven-h2h/inquiry-pln',
};
