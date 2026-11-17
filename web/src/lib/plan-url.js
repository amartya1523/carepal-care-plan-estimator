/**
 * Plans travel in the URL (?plan=...) so an estimate shared on WhatsApp
 * opens with exactly the same choices. Short keys keep the link small.
 */
export function encodePlan(plan) {
  const compact = {
    s: plan.service, c: plan.city, h: plan.hours, t: plan.shiftType,
    d: plan.durationId, n: plan.customDays, a: plan.addOns,
  };
  const json = JSON.stringify(compact);
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodePlan(value) {
  try {
    const json = decodeURIComponent(escape(atob(value.replace(/-/g, '+').replace(/_/g, '/'))));
    const c = JSON.parse(json);
    return {
      service: c.s ?? null, city: c.c ?? null, hours: c.h ?? 12, shiftType: c.t ?? 'day',
      durationId: c.d ?? '1m', customDays: c.n ?? 45, addOns: c.a ?? {},
    };
  } catch {
    return null;
  }
}

export function shareUrl(plan) {
  return `${window.location.origin}/?plan=${encodePlan(plan)}`;
}
