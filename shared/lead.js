/** Lead (contact details) validation shared by the form and the API. */

export const CALL_SLOTS = ['morning', 'afternoon', 'evening', 'anytime'];

const NAME_RE = /^[\p{L}\p{M} .'-]{2,80}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Normalise an Indian mobile number to +91XXXXXXXXXX, or null if invalid. */
export function normalizeIndianMobile(input) {
  const digits = String(input ?? '').replace(/[\s()-]/g, '');
  const match = digits.match(/^(?:\+91|0091|91|0)?([6-9]\d{9})$/);
  return match ? `+91${match[1]}` : null;
}

export function validateLead(lead) {
  const errors = {};
  const name = String(lead?.name ?? '').trim();
  const email = String(lead?.email ?? '').trim();

  if (!name) errors.name = 'required';
  else if (!NAME_RE.test(name)) errors.name = 'invalid';

  if (!lead?.phone) errors.phone = 'required';
  else if (!normalizeIndianMobile(lead.phone)) errors.phone = 'invalid';

  if (!email) errors.email = 'required';
  else if (email.length > 120 || !EMAIL_RE.test(email)) errors.email = 'invalid';

  if (!CALL_SLOTS.includes(lead?.callTime)) errors.callTime = 'required';

  if (lead?.notes && String(lead.notes).length > 500) errors.notes = 'too_long';
  if (lead?.consent !== true) errors.consent = 'required';

  return errors;
}

export function cleanLead(lead) {
  return {
    name: String(lead.name).trim().replace(/\s+/g, ' '),
    phone: normalizeIndianMobile(lead.phone),
    email: String(lead.email).trim().toLowerCase(),
    callTime: lead.callTime,
    notes: lead.notes ? String(lead.notes).trim().slice(0, 500) : '',
  };
}
