import { Router } from 'express';
import { handleTrxCallback } from '../controllers/callback.controller';

const router = Router();

// GET, bukan POST - PPS ngirim callback via query string (lihat callback.controller.ts).
// Satu endpoint buat callback SELL & Direct Top Up dua-duanya, PPS gak bedain formatnya.
router.get('/callback/trx', handleTrxCallback);

export default router;
