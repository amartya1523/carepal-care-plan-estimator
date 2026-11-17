import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLead, normalizeIndianMobile, cleanLead } from '../lead.js';

const good = {
  name: 'Ritu Sharma',
  phone: '98100 12345',
  email: 'Ritu.Sharma@example.com',
  callTime: 'evening',
  consent: true,
};

test('accepts a normal lead', () => {
  assert.deepEqual(validateLead(good), {});
});

test('normalises common Indian mobile formats', () => {
  for (const input of ['9810012345', '+91 98100 12345', '098100-12345', '919810012345']) {
    assert.equal(normalizeIndianMobile(input), '+919810012345', input);
  }
  assert.equal(normalizeIndianMobile('12345'), null);
  assert.equal(normalizeIndianMobile('5810012345'), null, 'mobiles start with 6-9');
});

test('flags each invalid field', () => {
  const errors = validateLead({ name: 'x', phone: '123', email: 'nope', callTime: 'midnight' });
  assert.deepEqual(errors, {
    name: 'invalid',
    phone: 'invalid',
    email: 'invalid',
    callTime: 'required',
    consent: 'required',
  });
});

test('allows Hindi names', () => {
  assert.deepEqual(validateLead({ ...good, name: 'सुनीता देवी' }), {});
});

test('cleanLead trims and normalises', () => {
  const cleaned = cleanLead({ ...good, name: '  Ritu   Sharma ' });
  assert.equal(cleaned.name, 'Ritu Sharma');
  assert.equal(cleaned.phone, '+919810012345');
  assert.equal(cleaned.email, 'ritu.sharma@example.com');
});
