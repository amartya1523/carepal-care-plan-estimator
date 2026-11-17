import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const fromRoot = (p) => (path.isAbsolute(p) ? p : path.join(repoRoot, p));

export const settings = {
  port: Number(process.env.PORT) || 4000,
  dbPath: fromRoot(process.env.DB_PATH || 'server/data/carepal.db'),
  pricingPath: fromRoot(process.env.PRICING_PATH || 'config/pricing.json'),
  webDist: fromRoot('web/dist'),
  admin: {
    username: process.env.ADMIN_USERNAME || 'ops',
    password: process.env.ADMIN_PASSWORD || '',
    sessionSecret: process.env.SESSION_SECRET || '',
    sessionHours: 8,
  },
  isProduction: process.env.NODE_ENV === 'production',
};
