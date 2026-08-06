import express from 'express';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/', (_req, res) => {
    res.json({ code: 'OK', message: 'PPS module server is running', docs: '/api' });
  });

  app.use('/api', routes);
  app.use(errorHandler);

  return app;
}
