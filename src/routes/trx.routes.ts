import { Router } from 'express';
import { createTrx, getTrxStatus } from '../controllers/trx.controller';

const router = Router();

// Satu endpoint buat 2 tipe transaksi (SELL pulsa/voucher & Direct Top Up game) -
// tipe-nya ditentuin dari prefix idtrx (lihat lib/trxType.ts), bukan dari path/kode.
router.get('/trx', createTrx);
router.post('/trx', createTrx);
router.get('/trx_status', getTrxStatus);

export default router;
