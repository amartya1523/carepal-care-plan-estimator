import { Router } from 'express';
import { calculateEstimate, validatePlan } from '../../../shared/pricing.js';
import { validateLead, cleanLead } from '../../../shared/lead.js';
import { rateLimit } from '../rate-limit.js';

export function publicRoutes({ pricing, leads }) {
  const router = Router();

  // The web app reads prices at runtime, so a rate change needs no rebuild or deploy.
  router.get('/config', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.json(pricing.get());
  });

  router.post('/estimate', (req, res) => {
    const config = pricing.get();
    const errors = validatePlan(req.body?.plan, config);
    if (Object.keys(errors).length) return res.status(422).json({ error: 'invalid_plan', fields: errors });
    res.json(calculateEstimate(req.body.plan, config));
  });

  router.post('/leads', rateLimit({ windowMs: 10 * 60 * 1000, max: 10 }), (req, res) => {
    const { plan, lead, language, website } = req.body ?? {};

    // Honeypot: real people never see this field, bots love to fill it.
    if (website) return res.status(201).json({ reference: 'CP-0000-0000' });

    const config = pricing.get();
    const planErrors = validatePlan(plan, config);
    const leadErrors = validateLead(lead);
    if (Object.keys(planErrors).length || Object.keys(leadErrors).length) {
      return res.status(422).json({ error: 'validation_failed', fields: { ...planErrors, ...leadErrors } });
    }

    // Never trust a price sent by the browser: recompute from the live config.
    const estimate = calculateEstimate(plan, config);
    const contact = cleanLead(lead);
    const saved = leads.create({
      ...contact,
      service: plan.service,
      city: plan.city,
      hours: Number(plan.hours),
      shiftType: plan.shiftType,
      days: estimate.days,
      planJson: JSON.stringify(plan),
      estimateJson: JSON.stringify(estimate),
      total: estimate.total,
      perMonth: estimate.perMonth,
      configVersion: config.version,
      language: language === 'hi' ? 'hi' : 'en',
    });

    res.status(201).json({ reference: saved.reference, estimate });
  });

  return router;
}
