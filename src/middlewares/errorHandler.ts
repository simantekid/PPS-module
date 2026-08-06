import { ErrorRequestHandler } from 'express';
import axios from 'axios';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (axios.isAxiosError(err)) {
    if (err.response) {
      res.status(err.response.status).json(err.response.data);
      return;
    }
    res.status(502).json({ code: 'SYSTEM_ERROR', data: null, message: 'PPS API unreachable' });
    return;
  }

  console.error(err);
  res.status(500).json({
    code: 'SYSTEM_ERROR',
    data: null,
    message: err instanceof Error ? err.message : 'Unknown error',
  });
};
