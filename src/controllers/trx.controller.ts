import { RequestHandler } from 'express';
import * as ppsService from '../services/pps.service';
import { findTopUpByIdtrx, saveTopUp } from '../services/topupStore.service';
import { getFieldsForProduct } from '../services/gamelistCache.service';
import { mapDirectTopUpStatus, mapStatusTrxStatus } from '../lib/statusMapper';
import { resolveTrxType, stripTrxPrefix } from '../lib/trxType';
import { IrsTopUpRequest, IrsTopUpResponse, TopUpField } from '../types/pps';

// Value di `tujuan` dipisahin pake delimiter ini kalau produknya butuh lebih dari 1
// field (misal "123456789|1234" buat userid|zoneid). Konvensi ini disepakatin sama
// tim IRS - bukan tebakan.
const TUJUAN_DELIMITER = '|';

class BadTujuanError extends Error {}

// Baca `fields` dari Get Gamelist (dicache, lihat gamelistCache.service.ts) buat tau
// nama & jumlah field yang dibutuhin product code ini, terus map value dari `tujuan`
// (dipisah `|`) ke field itu SESUAI URUTAN yang PPS balikin. Gantiin hardcode ML-only
// yang provably salah buat FF/RO/CODM/LN (mereka juga butuh zoneid, bukan cuma ML).
async function buildTopUpField(kode: string, tujuan: string): Promise<TopUpField> {
  const fields = await getFieldsForProduct(kode);

  if (!fields) {
    throw new BadTujuanError(`Product code "${kode}" gak ketemu di Get Gamelist`);
  }

  if (fields.length === 0) {
    return {};
  }

  const parts = tujuan.split(TUJUAN_DELIMITER);

  if (parts.length !== fields.length) {
    throw new BadTujuanError(
      `tujuan "${tujuan}" (${parts.length} value) gak cocok sama field yang dibutuhin produk "${kode}": ${fields
        .map((f) => f.name)
        .join(', ')}`,
    );
  }

  const field: TopUpField = {};
  fields.forEach((f, i) => {
    field[f.name] = parts[i];
  });
  return field;
}

export const createTrx: RequestHandler = async (req, res, next) => {
  try {
    const source = { ...(req.body as Partial<IrsTopUpRequest>), ...req.query } as Record<string, unknown>;
    const payload: IrsTopUpRequest = {
      idtrx: String(source.idtrx ?? ''),
      tujuan: String(source.tujuan ?? ''),
      kode: String(source.kode ?? ''),
    };

    console.log(payload, 'Input request');

    if (!payload.idtrx || !payload.tujuan || !payload.kode) {
      res.status(400).json({ code: 'BAD_REQUEST', data: null, message: 'idtrx, tujuan, and kode are required' });
      return;
    }

    // Idempotency guard: idtrx yang sama dikirim ulang (retry IRS) dan trx lama masih
    // hidup (pending/sukses) -> jawab kondisi terkini dari db, jangan bikin trx baru &
    // jangan nimpa status. Status 'gagal' sengaja dibiarin lolos biar bisa retry.
    // Dicek DULUAN sebelum nentuin tipe trx, soalnya resend harus short-circuit
    // apapun tipenya.
    const existing = findTopUpByIdtrx(payload.idtrx);
    if (existing && existing.status !== 'gagal') {
      console.log('[trx] idtrx duplikat', payload.idtrx, '-> dijawab dari db, status', existing.status);
      res.json({
        idtrx: existing.idtrx,
        tujuan: existing.tujuan,
        kode: existing.kode,
        vendor_idtrx: existing.vendor_idtrx,
        status: existing.status,
        sn: existing.sn,
        msg: existing.msg,
      } satisfies IrsTopUpResponse);
      return;
    }

    // Prefix `kode` yang nentuin ini trx pulsa/voucher (SELL) atau top up game
    // (Direct Top Up) - lihat lib/trxType.ts. Dulu prefix ini di idtrx, tapi IRS
    // sekarang generate idtrx full angka (gak bisa custom lagi), makanya dipindah
    // ke kode.
    const trxType = resolveTrxType(payload.kode);

    if (!trxType) {
      res.status(400).json({
        code: 'BAD_REQUEST',
        data: null,
        message: 'kode harus diawali prefix yang dikenal (SL- atau TP-) - lihat lib/trxType.ts',
      });
      return;
    }

    // Product code asli buat dikirim ke PPS - prefix SL-/TP- cuma buat routing
    // internal, PPS gak kenal itu. `payload.kode` (dengan prefix) tetep yang
    // disimpan & di-echo balik ke IRS.
    const kodeAsli = stripTrxPrefix(payload.kode);

    let vendorIdtrx: string | null;
    let status: IrsTopUpResponse['status'];
    let msg: string;

    if (trxType === 'sell') {
      console.log({ produk: kodeAsli, mdn: payload.tujuan, notrx: payload.idtrx }, 'Payload ke PPS SELL');

      const created = await ppsService.sell({
        notrx: payload.idtrx,
        produk: kodeAsli,
        mdn: payload.tujuan,
      });

      console.log(created, 'Response SELL');

      // SELL pake skema status yang sama kayak StatusTrx (9/1/0), makanya reuse
      // mapStatusTrxStatus, BUKAN mapDirectTopUpStatus (skemanya beda, 0/1/2).
      const mapped = mapStatusTrxStatus(created);
      vendorIdtrx = created.ServerIDTrx;
      status = mapped.status;
      msg = mapped.msg;
    } else {
      const field = await buildTopUpField(kodeAsli, payload.tujuan);

      console.log({ product: kodeAsli, notrx: payload.idtrx, field }, 'Payload ke PPS Direct Top Up');

      const created = await ppsService.directTopUp({
        notrx: payload.idtrx,
        product: kodeAsli,
        field,
      });

      console.log(created, 'Response Direct Top Up');

      const mapped = mapDirectTopUpStatus(created);
      vendorIdtrx = created.ServerIDTrx;
      status = mapped.status;
      msg = mapped.msg;
    }

    saveTopUp({
      idtrx: payload.idtrx,
      vendorIdtrx,
      kode: payload.kode,
      tujuan: payload.tujuan,
      status,
      sn: null,
      msg,
    });

    const response: IrsTopUpResponse = {
      idtrx: payload.idtrx,
      tujuan: payload.tujuan,
      kode: payload.kode,
      vendor_idtrx: vendorIdtrx,
      status,
      sn: null,
      msg,
    };

    res.json(response);
  } catch (err) {
    if (err instanceof BadTujuanError) {
      res.status(400).json({ code: 'BAD_REQUEST', data: null, message: err.message });
      return;
    }
    next(err);
  }
};

// Generik buat 2 tipe trx (SELL & Direct Top Up) - StatusTrx dipake buat polling
// dua-duanya (lihat diagram 9.2 & 9.3 di PPS_INTEGRATION_NOTES.md), gak perlu
// dibedain kayak createTrx.
export const getTrxStatus: RequestHandler = async (req, res, next) => {
  try {
    const idtrx = req.query.idtrx as string | undefined;

    if (!idtrx) {
      res.status(400).json({ code: 'BAD_REQUEST', data: null, message: 'idtrx is required' });
      return;
    }

    const trx = findTopUpByIdtrx(idtrx);

    if (!trx) {
      res.status(404).json({ code: 'NOT_FOUND', data: null, message: 'idtrx not found' });
      return;
    }

    // Status final (sukses/gagal) gak bakal berubah lagi - biasanya udah keupdate dari
    // callback PPS. Jawab langsung dari db, gak perlu nembak ulang.
    if (trx.status === 'sukses' || trx.status === 'gagal') {
      console.log('[trx_status]', trx.idtrx, trx.status, '-> dijawab dari db (final)');
      res.json({
        idtrx: trx.idtrx,
        tujuan: trx.tujuan,
        kode: trx.kode,
        vendor_idtrx: trx.vendor_idtrx,
        status: trx.status,
        sn: trx.sn,
        msg: trx.msg,
      } satisfies IrsTopUpResponse);
      return;
    }

    // Masih pending -> cek real ke PPS. Ini fallback WAJIB kalau callback (max 60 detik)
    // gak pernah nyampe, bukan sekadar opsional (beda dari module LapakGaming).
    const statusTrx = await ppsService.getStatusTrx(idtrx);
    const { status, msg } = mapStatusTrxStatus(statusTrx);

    console.log(statusTrx, 'Response Status Trx');

    saveTopUp({
      idtrx: trx.idtrx,
      vendorIdtrx: trx.vendor_idtrx,
      kode: trx.kode,
      tujuan: trx.tujuan,
      status,
      sn: trx.sn,
      msg,
    });

    const response: IrsTopUpResponse = {
      idtrx: trx.idtrx,
      tujuan: trx.tujuan,
      kode: trx.kode,
      vendor_idtrx: trx.vendor_idtrx,
      status,
      sn: trx.sn,
      msg,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
};
