import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

export const LEAD_STATUSES = ['new', 'contacted', 'converted', 'lost'];

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS leads (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    reference       TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    phone           TEXT NOT NULL,
    email           TEXT NOT NULL,
    call_time       TEXT NOT NULL,
    notes           TEXT NOT NULL DEFAULT '',
    service         TEXT NOT NULL,
    city            TEXT NOT NULL,
    hours           INTEGER NOT NULL,
    shift_type      TEXT NOT NULL,
    days            INTEGER NOT NULL,
    plan_json       TEXT NOT NULL,
    estimate_json   TEXT NOT NULL,
    total           INTEGER NOT NULL,
    per_month       INTEGER NOT NULL,
    config_version  TEXT NOT NULL,
    language        TEXT NOT NULL DEFAULT 'en',
    status          TEXT NOT NULL DEFAULT 'new',
    admin_note      TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
`;

export function openDatabase(file) {
  if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return db;
}

/** Short, readable reference a family can quote on the phone: CP-2611-0042 */
export function makeReference(id, date = new Date()) {
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `CP-${dd}${mm}-${String(id).padStart(4, '0')}`;
}

export function createLeadRepository(db) {
  const insert = db.prepare(`
    INSERT INTO leads (reference, name, phone, email, call_time, notes, service, city, hours,
      shift_type, days, plan_json, estimate_json, total, per_month, config_version, language, status, created_at)
    VALUES (:reference, :name, :phone, :email, :callTime, :notes, :service, :city, :hours,
      :shiftType, :days, :planJson, :estimateJson, :total, :perMonth, :configVersion, :language, :status, :createdAt)
  `);
  const setReference = db.prepare('UPDATE leads SET reference = ? WHERE id = ?');
  const byId = db.prepare('SELECT * FROM leads WHERE id = ?');

  return {
    create(lead) {
      // Insert with a temporary unique reference, then derive the real one from the row id.
      const tmp = `tmp-${crypto.randomUUID()}`;
      const createdAt = lead.createdAt ?? new Date().toISOString();
      const { lastInsertRowid } = insert.run({ ...lead, reference: tmp, status: lead.status ?? 'new', createdAt });
      const id = Number(lastInsertRowid);
      setReference.run(makeReference(id, new Date(createdAt)), id);
      return toLead(byId.get(id));
    },

    list({ status, city, service, q, limit = 500 } = {}) {
      const where = [];
      const params = {};
      if (status) { where.push('status = :status'); params.status = status; }
      if (city) { where.push('city = :city'); params.city = city; }
      if (service) { where.push('service = :service'); params.service = service; }
      if (q) {
        where.push('(name LIKE :q OR phone LIKE :q OR email LIKE :q OR reference LIKE :q)');
        params.q = `%${q}%`;
      }
      const sql = `SELECT * FROM leads ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
                   ORDER BY created_at DESC LIMIT ${Math.min(Number(limit) || 500, 5000)}`;
      return db.prepare(sql).all(params).map(toLead);
    },

    get(id) {
      const row = byId.get(id);
      return row ? toLead(row) : null;
    },

    update(id, { status, adminNote }) {
      const current = byId.get(id);
      if (!current) return null;
      db.prepare(`UPDATE leads SET status = ?, admin_note = ?,
                  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`)
        .run(status ?? current.status, adminNote ?? current.admin_note, id);
      return toLead(byId.get(id));
    },

    stats() {
      return db.prepare(`
        SELECT COUNT(*) AS total,
               SUM(status = 'new') AS new,
               SUM(created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')) AS lastWeek,
               ROUND(AVG(per_month)) AS avgPerMonth,
               SUM(status = 'converted') AS converted
        FROM leads`).get();
    },
  };
}

function toLead(row) {
  return {
    id: row.id,
    reference: row.reference,
    name: row.name,
    phone: row.phone,
    email: row.email,
    callTime: row.call_time,
    notes: row.notes,
    service: row.service,
    city: row.city,
    hours: row.hours,
    shiftType: row.shift_type,
    days: row.days,
    plan: JSON.parse(row.plan_json),
    estimate: JSON.parse(row.estimate_json),
    total: row.total,
    perMonth: row.per_month,
    configVersion: row.config_version,
    language: row.language,
    status: row.status,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
