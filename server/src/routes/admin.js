import { Router } from 'express';
import { requireAdmin } from '../auth.js';
import { rateLimit } from '../rate-limit.js';
import { LEAD_STATUSES } from '../db.js';
import { leadsToCsv } from '../lead-export.js';

export function adminRoutes({ auth, leads, pricing }) {
  const router = Router();

  router.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), (req, res) => {
    const { username, password } = req.body ?? {};
    if (!auth.checkCredentials(username, password)) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    res.json({ token: auth.issueToken() });
  });

  router.use(requireAdmin(auth));

  const filtersFrom = (query) => ({
    status: LEAD_STATUSES.includes(query.status) ? query.status : undefined,
    city: query.city || undefined,
    service: query.service || undefined,
    q: query.q ? String(query.q).slice(0, 80) : undefined,
  });

  router.get('/leads', (req, res) => {
    res.json({ leads: leads.list(filtersFrom(req.query)), stats: leads.stats() });
  });

  router.get('/leads.csv', (req, res) => {
    const csv = leadsToCsv(leads.list({ ...filtersFrom(req.query), limit: 5000 }), pricing.get());
    const date = new Date().toISOString().slice(0, 10);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="carepal-leads-${date}.csv"`);
    res.send(csv);
  });

  router.patch('/leads/:id', (req, res) => {
    const { status, adminNote } = req.body ?? {};
    if (status !== undefined && !LEAD_STATUSES.includes(status)) {
      return res.status(422).json({ error: 'invalid_status' });
    }
    if (adminNote !== undefined && String(adminNote).length > 1000) {
      return res.status(422).json({ error: 'note_too_long' });
    }
    const updated = leads.update(Number(req.params.id), { status, adminNote });
    if (!updated) return res.status(404).json({ error: 'not_found' });
    res.json(updated);
  });

  router.get('/pricing', (req, res) => res.json(pricing.get()));

  router.put('/pricing', (req, res) => {
    const saved = pricing.save(req.body);
    res.json(saved);
  });

  return router;
}
