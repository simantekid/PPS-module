import { RequestHandler } from 'express';
import * as ppsService from '../services/pps.service';

// Passthrough tipis ke Inquiry PLN - verifikasi nomor pelanggan (meter/tarif) sebelum
// SELL produk PLN, sama pola-nya kayak gamelist.controller.ts.
export const inquiryPln: RequestHandler = async (req, res, next) => {
  try {
    const source = { ...(req.body as Record<string, unknown>), ...req.query };
    const customerNumber = source.customer_no ? String(source.customer_no) : '';

    if (!customerNumber) {
      res.status(400).json({ code: 'BAD_REQUEST', data: null, message: 'customer_no is required' });
      return;
    }

    const result = await ppsService.inquiryPln(customerNumber);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
