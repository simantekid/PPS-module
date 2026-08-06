import { Router } from 'express';
import { getGamelist } from '../controllers/gamelist.controller';

const router = Router();

router.get('/gamelist', getGamelist);

export default router;
