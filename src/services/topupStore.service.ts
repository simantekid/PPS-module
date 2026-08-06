import { db } from '../lib/db';
import { IrsStatus, TopUpRecord } from '../types/pps';

const upsertStmt = db.prepare(`
  INSERT INTO topups (idtrx, vendor_idtrx, kode, tujuan, status, sn, msg)
  VALUES (@idtrx, @vendor_idtrx, @kode, @tujuan, @status, @sn, @msg)
  ON CONFLICT(idtrx) DO UPDATE SET
    vendor_idtrx = excluded.vendor_idtrx,
    status = excluded.status,
    sn = excluded.sn,
    msg = excluded.msg,
    updated_at = datetime('now')
`);

const findByIdtrxStmt = db.prepare('SELECT * FROM topups WHERE idtrx = ?');

export function saveTopUp(record: {
  idtrx: string;
  vendorIdtrx: string | null;
  kode: string;
  tujuan: string;
  status: IrsStatus;
  sn: string | null;
  msg: string;
}) {
  upsertStmt.run({
    idtrx: record.idtrx,
    vendor_idtrx: record.vendorIdtrx,
    kode: record.kode,
    tujuan: record.tujuan,
    status: record.status,
    sn: record.sn,
    msg: record.msg,
  });
}

export function findTopUpByIdtrx(idtrx: string): TopUpRecord | undefined {
  const row = findByIdtrxStmt.get(idtrx) as TopUpRecord | undefined;

  if (row) {
    console.log('[findTopUpByIdtrx]', idtrx, '-> ketemu:', row);
  } else {
    console.log('[findTopUpByIdtrx]', idtrx, '-> gak ketemu di db');
  }

  return row;
}
