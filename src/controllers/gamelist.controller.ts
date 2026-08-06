import { RequestHandler } from 'express';
import * as ppsService from '../services/pps.service';

// Passthrough tipis ke Get Gamelist - dipake buat tau product_code yang valid + field
// dinamis (userid/zoneid/server) yang dibutuhin tiap game, gantiin nebak manual kayak
// splitTujuan di trx.controller.ts.
export const getGamelist: RequestHandler = async (_req, res, next) => {
  try {
    const games = await ppsService.getGamelist();
    res.json({ code: 'SUCCESS', data: games });
  } catch (err) {
    next(err);
  }
};
