import axios from 'axios';
import { config } from '../config/env';

// PPS gak pake header auth statis (gak ada Bearer/API key) - autentikasi murni via
// `signature` yang dihitung per-request (lihat lib/signature.ts). Client ini cuma
// nentuin base URL + content-type default.
export const ppsClient = axios.create({
  baseURL: config.pps.baseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});
