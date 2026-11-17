import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, copyFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const dir = mkdtempSync(path.join(tmpdir(), 'carepal-'));
const pricingPath = path.join(dir, 'pricing.json');
copyFileSync(path.join(repoRoot, 'config/pricing.json'), pricingPath);

let server;
let base;

before(async () => {
  const { app } = createApp({
    dbPath: ':memory:',
    pricingPath,
    webDist: path.join(dir, 'no-dist'),
    admin: { username: 'ops', password: 'test-pass', sessionSecret: 'x'.repeat(32), sessionHours: 1 },
  });
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

const plan = { service: 'elderly', city: 'pune', hours: 12, shiftType: 'live_in', durationId: '1m', addOns: { physio: { perWeek: 2 } } };
const lead = { name: 'Test Family', phone: '9876543210', email: 'family@example.com', callTime: 'morning', consent: true };

const post = (url, body, headers = {}) => fetch(base + url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

async function login() {
  const res = await post('/admin/login', { username: 'ops', password: 'test-pass' });
  return (await res.json()).token;
}

test('serves the pricing config', async () => {
  const res = await fetch(`${base}/config`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.cities.length >= 5);
});

test('rejects an invalid plan', async () => {
  const res = await post('/estimate', { plan: { ...plan, city: 'atlantis' } });
  assert.equal(res.status, 422);
  assert.equal((await res.json()).fields.city, 'required');
});

test('saves a lead and recomputes the price on the server', async () => {
  const res = await post('/leads', { plan, lead, language: 'hi', estimate: { total: 1 } });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.match(body.reference, /^CP-\d{4}-\d{4}$/);
  assert.ok(body.estimate.total > 1000, 'client-sent total is ignored');
});

test('lead validation errors come back per field', async () => {
  const res = await post('/leads', { plan, lead: { ...lead, phone: '12', email: 'x' } });
  assert.equal(res.status, 422);
  const { fields } = await res.json();
  assert.equal(fields.phone, 'invalid');
  assert.equal(fields.email, 'invalid');
});

test('admin routes need a valid token', async () => {
  assert.equal((await fetch(`${base}/admin/leads`)).status, 401);
  assert.equal((await fetch(`${base}/admin/leads`, { headers: { authorization: 'Bearer forged.token' } })).status, 401);
  assert.equal((await post('/admin/login', { username: 'ops', password: 'wrong' })).status, 401);
});

test('admin can list, update and export leads', async () => {
  const token = await login();
  const auth = { authorization: `Bearer ${token}` };

  const list = await (await fetch(`${base}/admin/leads`, { headers: auth })).json();
  assert.ok(list.leads.length >= 1);
  const first = list.leads[0];
  assert.equal(first.phone, '+919876543210');

  const patched = await fetch(`${base}/admin/leads/${first.id}`, {
    method: 'PATCH',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'contacted', adminNote: 'Called, wants a visit Monday' }),
  });
  assert.equal((await patched.json()).status, 'contacted');

  const csv = await fetch(`${base}/admin/leads.csv`, { headers: auth });
  assert.match(csv.headers.get('content-type'), /text\/csv/);
  const bytes = new Uint8Array(await csv.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf], 'UTF-8 BOM for Excel');
  const text = new TextDecoder().decode(bytes);
  assert.ok(text.startsWith('Reference,'));
  assert.ok(text.includes('Test Family'));
});

test('csv neutralises spreadsheet formulas', async () => {
  await post('/leads', { plan, lead: { ...lead, notes: '=HYPERLINK("http://evil")' } });
  const token = await login();
  const text = await (await fetch(`${base}/admin/leads.csv`, { headers: { authorization: `Bearer ${token}` } })).text();
  assert.ok(text.includes(`"'=HYPERLINK(""http://evil"")"`));
});

test('admin can update rates and bad configs are refused', async () => {
  const token = await login();
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const config = await (await fetch(`${base}/admin/pricing`, { headers })).json();

  config.cities.find((c) => c.id === 'pune').rates.elderly.live_in['12'] = 999;
  const ok = await fetch(`${base}/admin/pricing`, { method: 'PUT', headers, body: JSON.stringify(config) });
  assert.equal(ok.status, 200);
  const saved = JSON.parse(readFileSync(pricingPath, 'utf8'));
  assert.equal(saved.cities.find((c) => c.id === 'pune').rates.elderly.live_in['12'], 999);

  config.cities[0].rates.elderly.day['8'] = -1;
  const bad = await fetch(`${base}/admin/pricing`, { method: 'PUT', headers, body: JSON.stringify(config) });
  assert.equal(bad.status, 400);
  assert.ok((await bad.json()).details.length > 0);
});
