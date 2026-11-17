import express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { openDatabase, createLeadRepository } from './db.js';
import { createPricingStore } from './pricing-store.js';
import { createAuth } from './auth.js';
import { publicRoutes } from './routes/public.js';
import { adminRoutes } from './routes/admin.js';

export function createApp(settings) {
  const db = openDatabase(settings.dbPath);
  const leads = createLeadRepository(db);
  const pricing = createPricingStore(settings.pricingPath);
  const auth = createAuth(settings.admin);

  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true, pricingVersion: pricing.get().version }));
  app.use('/api', publicRoutes({ pricing, leads }));
  app.use('/api/admin', adminRoutes({ auth, leads, pricing }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));

  // In production the API also serves the built React app.
  if (existsSync(settings.webDist)) {
    app.use(express.static(settings.webDist, { maxAge: '1h', index: false }));
    app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(settings.webDist, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid_json' });
    const status = err.status ?? 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'server_error' : err.message, details: err.details });
  });

  return { app, db, leads, pricing };
}
