/**
 * Sanity checks for config/pricing.json.
 *
 * The ops team edits rates by hand (or through the admin Rates tab), so the
 * server refuses to start or save a config that would produce broken quotes:
 * a missing rate, a negative price, a typo in a service id, etc.
 */

const isPositiveNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
const isLabel = (v) => v && typeof v.en === 'string' && v.en.trim() !== '' && typeof v.hi === 'string';

export function validateConfig(config) {
  const problems = [];
  const fail = (path, message) => problems.push(`${path}: ${message}`);

  if (!config || typeof config !== 'object') return ['config: must be an object'];
  if (typeof config.version !== 'string' || !config.version) fail('version', 'is required');

  const { gst } = config;
  if (!gst || !(gst.rate >= 0 && gst.rate < 1)) fail('gst.rate', 'must be between 0 and 1');
  else if (!gst.split || Math.abs(gst.split.cgst + gst.split.sgst - gst.rate) > 1e-9) {
    fail('gst.split', 'cgst + sgst must equal gst.rate');
  }

  const ids = (list, path) => {
    if (!Array.isArray(list) || list.length === 0) {
      fail(path, 'must be a non-empty list');
      return [];
    }
    const seen = new Set();
    list.forEach((item, i) => {
      if (!item?.id) fail(`${path}[${i}].id`, 'is required');
      else if (seen.has(item.id)) fail(`${path}[${i}].id`, `duplicate id "${item.id}"`);
      seen.add(item.id);
      if (!isLabel(item?.label)) fail(`${path}[${i}].label`, 'needs en and hi text');
    });
    return [...seen];
  };

  const serviceIds = ids(config.services, 'services');
  const shiftIds = ids(config.shiftTypes, 'shiftTypes');
  ids(config.durations, 'durations');
  ids(config.cities, 'cities');
  ids(config.addOns, 'addOns');

  if (!Array.isArray(config.hours) || !config.hours.every((h) => [8, 12, 24].includes(h))) {
    fail('hours', 'must only contain 8, 12 or 24');
  }

  (config.durations ?? []).forEach((d, i) => {
    if (!Number.isInteger(d.days) || d.days < 1) fail(`durations[${i}].days`, 'must be a whole number of days');
  });

  (config.cities ?? []).forEach((city, i) => {
    for (const service of serviceIds) {
      const byShift = city.rates?.[service];
      if (!byShift) {
        fail(`cities[${i}].rates.${service}`, 'is missing');
        continue;
      }
      if (!byShift.day) fail(`cities[${i}].rates.${service}.day`, 'is missing');
      for (const [shift, byHours] of Object.entries(byShift)) {
        if (!shiftIds.includes(shift)) fail(`cities[${i}].rates.${service}.${shift}`, 'unknown shift type');
        for (const [hours, rate] of Object.entries(byHours ?? {})) {
          if (!isPositiveNumber(rate)) fail(`cities[${i}].rates.${service}.${shift}.${hours}`, 'must be a positive number');
        }
      }
      for (const hours of config.hours ?? []) {
        if (byShift.day && !isPositiveNumber(byShift.day[String(hours)])) {
          fail(`cities[${i}].rates.${service}.day.${hours}`, 'day shift needs a rate for every hours option');
        }
      }
    }
  });

  (config.addOns ?? []).forEach((a, i) => {
    if (!isPositiveNumber(a.price)) fail(`addOns[${i}].price`, 'must be a positive number');
    if (!['visit', 'month', 'day', 'once'].includes(a.unit)) fail(`addOns[${i}].unit`, 'must be visit, month, day or once');
    if (a.unit === 'visit' && !(a.frequency?.min >= 1 && a.frequency.max >= a.frequency.min)) {
      fail(`addOns[${i}].frequency`, 'visit add-ons need a min/max visits per week');
    }
    if (!Array.isArray(a.appliesTo) || a.appliesTo.some((s) => !serviceIds.includes(s))) {
      fail(`addOns[${i}].appliesTo`, 'must list known service ids');
    }
  });

  (config.longStayDiscounts ?? []).forEach((t, i) => {
    if (!(t.rate >= 0 && t.rate < 0.5)) fail(`longStayDiscounts[${i}].rate`, 'must be between 0 and 0.5');
  });

  return problems;
}
