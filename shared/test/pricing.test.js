import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  calculateEstimate,
  validatePlan,
  resolveDays,
  addOnQuantity,
  discountRateForDays,
} from '../pricing.js';
import { validateConfig } from '../config-schema.js';

const config = JSON.parse(readFileSync(new URL('../../config/pricing.json', import.meta.url)));

const basePlan = {
  service: 'elderly',
  city: 'delhi-ncr',
  hours: 12,
  shiftType: 'day',
  durationId: '1w',
  addOns: {},
};

test('shipped pricing config is valid', () => {
  assert.deepEqual(validateConfig(config), []);
});

test('one week of 12h day care in Delhi NCR', () => {
  const estimate = calculateEstimate(basePlan, config);
  const care = estimate.lines.find((l) => l.id === 'care');
  assert.equal(care.unitPrice, 1100);
  assert.equal(care.amount, 7700);
  // onboarding fee applies for short stays
  assert.equal(estimate.lines.find((l) => l.id === 'fee:onboarding').amount, 999);
  assert.equal(estimate.taxable, 8699);
  assert.equal(estimate.gst.cgst, Math.round(8699 * 0.09));
  assert.equal(estimate.total, estimate.taxable + estimate.gst.total);
});

test('breakdown always adds up to the total', () => {
  const plans = [
    { ...basePlan, durationId: '6m', addOns: { physio: { perWeek: 5 }, oxygen: {} } },
    { ...basePlan, service: 'post_surgery', city: 'mumbai', hours: 24, shiftType: 'live_in', durationId: '3m', addOns: { doctor_visit: {} } },
    { ...basePlan, service: 'baby', city: 'jaipur', hours: 8, durationId: 'custom', customDays: 45, addOns: { lactation: { perWeek: 2 } } },
  ];
  for (const plan of plans) {
    const e = calculateEstimate(plan, config);
    const linesSum = e.lines.reduce((s, l) => s + l.amount, 0);
    assert.equal(linesSum, e.taxable);
    assert.equal(e.subtotal - e.discount, e.taxable);
    assert.equal(e.gst.cgst + e.gst.sgst, e.gst.total);
    assert.equal(e.taxable + e.gst.total, e.total);
  }
});

test('long-stay discount and fee waiver kick in at 30 days', () => {
  const e = calculateEstimate({ ...basePlan, durationId: '1m' }, config);
  assert.equal(e.discount, Math.round(1100 * 30 * 0.03));
  assert.equal(e.lines.find((l) => l.id === 'fee:onboarding').amount, 0);
  assert.equal(discountRateForDays(config, 29), 0);
  assert.equal(discountRateForDays(config, 200), 0.1);
});

test('rates differ by city, service and shift', () => {
  const rate = (overrides) => calculateEstimate({ ...basePlan, ...overrides }, config).lines[0].unitPrice;
  assert.ok(rate({ city: 'mumbai' }) > rate({ city: 'jaipur' }));
  assert.ok(rate({ service: 'post_surgery' }) > rate({ service: 'elderly' }));
  assert.ok(rate({ hours: 24, shiftType: 'live_in' }) < rate({ hours: 24, shiftType: 'day' }));
});

test('8 hour live-in is not offered', () => {
  const errors = validatePlan({ ...basePlan, hours: 8, shiftType: 'live_in' }, config);
  assert.equal(errors.shiftType, 'not_offered');
  assert.throws(() => calculateEstimate({ ...basePlan, hours: 8, shiftType: 'live_in' }, config));
});

test('add-on quantities follow their unit', () => {
  const physio = config.addOns.find((a) => a.id === 'physio');
  assert.equal(addOnQuantity(physio, { perWeek: 3 }, 7), 3);
  assert.equal(addOnQuantity(physio, { perWeek: 3 }, 30), 13);
  assert.equal(addOnQuantity(physio, { perWeek: 99 }, 7), 7, 'clamped to max per week');
  const bed = config.addOns.find((a) => a.id === 'hospital_bed');
  assert.equal(addOnQuantity(bed, {}, 31), 2);
});

test('add-ons must match the service', () => {
  const errors = validatePlan({ ...basePlan, addOns: { lactation: {} } }, config);
  assert.equal(errors['addOns.lactation'], 'not_for_service');
  assert.equal(validatePlan({ ...basePlan, addOns: { nope: {} } }, config)['addOns.nope'], 'unknown');
});

test('custom duration is bounded', () => {
  assert.equal(resolveDays({ durationId: 'custom', customDays: 10 }, config), 10);
  assert.equal(resolveDays({ durationId: 'custom', customDays: 0 }, config), null);
  assert.equal(resolveDays({ durationId: 'custom', customDays: 2.5 }, config), null);
  assert.equal(resolveDays({ durationId: 'custom', customDays: 999 }, config), null);
});

test('config validator catches a missing rate', () => {
  const broken = structuredClone(config);
  delete broken.cities[0].rates.elderly.day['12'];
  broken.addOns[0].price = -5;
  const problems = validateConfig(broken);
  assert.ok(problems.some((p) => p.includes('rates.elderly.day.12')));
  assert.ok(problems.some((p) => p.includes('addOns[0].price')));
});
