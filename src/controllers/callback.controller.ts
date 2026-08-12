import { RequestHandler } from 'express';
import axios from 'axios';
import { config } from '../config/env';
import { findTopUpByIdtrx, saveTopUp } from '../services/topupStore.service';
import { mapCallbackStatus } from '../lib/statusMapper';
import { IrsTopUpResponse, TopUpCallbackQuery } from '../types/pps';

async function forwardToIrs(payload: IrsTopUpResponse) {
  if (!config.irsCallbackUrl) return;
  console.log(
    '[CALLBACK][MODULE -> IRS] REQUEST',
    JSON.stringify(
      {
        method: 'POST',
        url: config.irsCallbackUrl,
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      },
      null,
      2,
    ),
  );
  try {
    const { status, data } = await axios.post(config.irsCallbackUrl, payload, { timeout: 10000 });
    console.log(
      '[CALLBACK][IRS -> MODULE] RESPONSE',
      JSON.stringify({ httpStatus: status, body: data }, null, 2),
    );
  } catch (err) {
    // Jangan bikin PPS dapet non-200 gara-gara IRS lagi down; status di db udah
    // keupdate, IRS masih bisa dapet lewat polling /trx_status.
    console.error('[forward to IRS] gagal', payload.idtrx, err instanceof Error ? err.message : err);
  }
}

// PENTING: beda dari LapakGaming, callback PPS itu GET + query string, bukan
// POST + JSON body. `clientnotrx` di query = idtrx yang kita kirim pas SELL/Direct Top
// Up. Satu handler ini nerima callback dua-duanya, PPS gak bedain formatnya.
export const handleTrxCallback: RequestHandler = (req, res) => {
  const query = req.query as unknown as Partial<TopUpCallbackQuery>;

  console.log(
    '[CALLBACK][PPS -> MODULE] REQUEST',
    JSON.stringify(
      {
        method: req.method,
        url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        headers: req.headers,
        query: req.query,
      },
      null,
      2,
    ),
  );

  if (!query.clientnotrx || !query.status) {
    res.status(400).json({ message: 'INVALID_PAYLOAD' });
    return;
  }

  const idtrx = query.clientnotrx;
  const trx = findTopUpByIdtrx(idtrx);

  if (!trx) {
    console.warn('[trx callback] no local trx matches clientnotrx', idtrx, query.serveridtrx);
    res.status(200).json({ message: 'SUCCESS' });
    return;
  }

  const { status, msg } = mapCallbackStatus({ status: query.status as '0' | '1', message: query.message });
  const vendorIdtrx = query.serveridtrx ?? trx.vendor_idtrx;
  const sn = query.sn ?? trx.sn;

  saveTopUp({
    idtrx: trx.idtrx,
    vendorIdtrx,
    kode: trx.kode,
    tujuan: trx.tujuan,
    status,
    sn,
    msg,
  });

  // Balas 200 ke PPS dulu, forward ke IRS jalan di belakang.
  res.status(200).json({ message: 'SUCCESS' });
  console.log(
    '[CALLBACK][MODULE -> PPS] RESPONSE',
    JSON.stringify({ httpStatus: 200, body: { message: 'SUCCESS' } }, null, 2),
  );

  void forwardToIrs({
    idtrx: trx.idtrx,
    tujuan: trx.tujuan,
    kode: trx.kode,
    vendor_idtrx: vendorIdtrx,
    status,
    sn,
    msg,
  });
};
