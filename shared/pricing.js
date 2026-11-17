/**
 * Pricing engine shared by the web app (live estimate) and the API
 * (which recomputes the estimate before saving a lead, so a tampered
 * client can never store a price we did not quote).
 *
 * Everything here is pure: (plan, config) in, plain objects out.
 * All money is whole rupees. Rounding happens once per line so the
 * breakdown always adds up to the total shown to the family.
 */

export const UNITS = Object.freeze({
  VISIT: 'visit',
  MONTH: 'month',
  DAY: 'day',
  ONCE: 'once',
});

const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;

export function findById(list, id) {
  return list.find((item) => item.id === id) ?? null;
}

/** Number of care days for a plan, or null when it cannot be resolved. */
export function resolveDays(plan, config) {
  if (plan.durationId === 'custom') {
    const days = Number(plan.customDays);
    const { min, max } = config.customDays;
    return Number.isInteger(days) && days >= min && days <= max ? days : null;
  }
  return findById(config.durations, plan.durationId)?.days ?? null;
}

/** Per-day rate for a city/service/shift/hours combination, or null if not offered. */
export function getShiftRate(config, { city, service, shiftType, hours }) {
  const cityConfig = findById(config.cities, city);
  const rate = cityConfig?.rates?.[service]?.[shiftType]?.[String(hours)];
  return typeof rate === 'number' ? rate : null;
}

export function addOnsForService(config, serviceId) {
  return config.addOns.filter((addOn) => addOn.appliesTo.includes(serviceId));
}

export function discountRateForDays(config, days) {
  return config.longStayDiscounts
    .filter((tier) => days >= tier.minDays)
    .reduce((best, tier) => Math.max(best, tier.rate), 0);
}

/** How many units of an add-on a plan uses over its duration. */
export function addOnQuantity(addOn, selection, days) {
  switch (addOn.unit) {
    case UNITS.VISIT: {
      const perWeek = clamp(
        Number(selection?.perWeek ?? addOn.frequency.default),
        addOn.frequency.min,
        addOn.frequency.max,
      );
      return Math.max(1, Math.round((days / DAYS_PER_WEEK) * perWeek));
    }
    case UNITS.MONTH:
      return Math.ceil(days / DAYS_PER_MONTH);
    case UNITS.DAY:
      return days;
    case UNITS.ONCE:
      return 1;
    default:
      throw new Error(`Unknown add-on unit "${addOn.unit}" for ${addOn.id}`);
  }
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Validate a plan against the config. Returns a map of field -> error code.
 * Codes are translated in the UI so the API and the form speak the same language.
 */
export function validatePlan(plan, config) {
  const errors = {};
  if (!plan || typeof plan !== 'object') return { plan: 'required' };

  if (!findById(config.services, plan.service)) errors.service = 'required';
  if (!findById(config.cities, plan.city)) errors.city = 'required';
  if (!config.hours.includes(Number(plan.hours))) errors.hours = 'required';
  if (!findById(config.shiftTypes, plan.shiftType)) errors.shiftType = 'required';

  if (!errors.service && !errors.city && !errors.hours && !errors.shiftType) {
    if (getShiftRate(config, plan) === null) errors.shiftType = 'not_offered';
  }

  if (plan.durationId === 'custom') {
    if (resolveDays(plan, config) === null) errors.customDays = 'out_of_range';
  } else if (!findById(config.durations, plan.durationId)) {
    errors.durationId = 'required';
  }

  for (const id of Object.keys(plan.addOns ?? {})) {
    const addOn = findById(config.addOns, id);
    if (!addOn) errors[`addOns.${id}`] = 'unknown';
    else if (plan.service && !addOn.appliesTo.includes(plan.service)) {
      errors[`addOns.${id}`] = 'not_for_service';
    }
  }

  return errors;
}

/**
 * Build the full estimate: one line per charge, discount, GST split and total.
 * Throws if the plan is invalid; call validatePlan first for user-facing errors.
 */
export function calculateEstimate(plan, config) {
  const errors = validatePlan(plan, config);
  if (Object.keys(errors).length > 0) {
    const error = new Error('Invalid plan');
    error.details = errors;
    throw error;
  }

  const days = resolveDays(plan, config);
  const hours = Number(plan.hours);
  const service = findById(config.services, plan.service);
  const shiftType = findById(config.shiftTypes, plan.shiftType);
  const dayRate = getShiftRate(config, { ...plan, hours });

  const lines = [];

  const careAmount = dayRate * days;
  lines.push({
    id: 'care',
    kind: 'care',
    label: service.label,
    detail: { hours, shiftType: shiftType.label, staff: service.staff },
    quantity: days,
    unit: UNITS.DAY,
    unitPrice: dayRate,
    amount: careAmount,
  });

  const discountRate = discountRateForDays(config, days);
  if (discountRate > 0) {
    lines.push({
      id: 'long_stay_discount',
      kind: 'discount',
      label: { en: 'Long-stay discount', hi: 'लंबी अवधि की छूट' },
      detail: { rate: discountRate },
      quantity: 1,
      unit: UNITS.ONCE,
      unitPrice: -Math.round(careAmount * discountRate),
      amount: -Math.round(careAmount * discountRate),
    });
  }

  for (const [id, selection] of Object.entries(plan.addOns ?? {})) {
    const addOn = findById(config.addOns, id);
    const quantity = addOnQuantity(addOn, selection, days);
    lines.push({
      id: `addon:${id}`,
      kind: 'addon',
      label: addOn.label,
      detail: addOn.unit === UNITS.VISIT ? { perWeek: clamp(Number(selection?.perWeek ?? addOn.frequency.default), addOn.frequency.min, addOn.frequency.max) } : {},
      quantity,
      unit: addOn.unit,
      unitPrice: addOn.price,
      amount: addOn.price * quantity,
    });
  }

  for (const fee of config.oneTimeFees) {
    const waived = fee.waivedFromDays != null && days >= fee.waivedFromDays;
    lines.push({
      id: `fee:${fee.id}`,
      kind: 'fee',
      label: fee.label,
      detail: { waived },
      quantity: 1,
      unit: UNITS.ONCE,
      unitPrice: fee.amount,
      amount: waived ? 0 : fee.amount,
    });
  }

  const taxable = lines.reduce((sum, line) => sum + line.amount, 0);
  const cgst = Math.round(taxable * config.gst.split.cgst);
  const sgst = Math.round(taxable * config.gst.split.sgst);
  const gstTotal = cgst + sgst;
  const total = taxable + gstTotal;

  return {
    configVersion: config.version,
    currency: config.currency,
    days,
    lines,
    subtotal: lines.filter((l) => l.kind !== 'discount').reduce((s, l) => s + l.amount, 0),
    discount: -lines.filter((l) => l.kind === 'discount').reduce((s, l) => s + l.amount, 0),
    taxable,
    gst: { rate: config.gst.rate, cgst, sgst, total: gstTotal },
    total,
    perDay: Math.round(total / days),
    perMonth: Math.round((total / days) * DAYS_PER_MONTH),
  };
}
