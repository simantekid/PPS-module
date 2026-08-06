import { Router } from 'express';
import { inquiryPln } from '../controllers/inquiryPln.controller';

const router = Router();

router.get('/inquiry-pln', inquiryPln);
router.post('/inquiry-pln', inquiryPln);

export default router;
