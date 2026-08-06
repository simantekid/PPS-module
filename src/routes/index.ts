import { Router } from 'express';
import trxRoutes from './trx.routes';
import callbackRoutes from './callback.routes';
import gamelistRoutes from './gamelist.routes';
import inquiryPlnRoutes from './inquiryPln.routes';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    code: 'OK',
    message: 'PPS module API is running',
  });
});

router.use(trxRoutes);
router.use(callbackRoutes);
router.use(gamelistRoutes);
router.use(inquiryPlnRoutes);

export default router;
