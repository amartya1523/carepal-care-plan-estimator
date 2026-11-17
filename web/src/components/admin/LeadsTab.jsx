import { useCallback, useEffect, useMemo, useState } from 'react';
import { findById } from '@shared/pricing.js';
import { api } from '../../lib/api.js';
import { formatINR } from '../../lib/format.js';
import { EstimateBreakdown } from '../EstimateBreakdown.jsx';
import { Icon } from '../Icon.jsx';

const STATUSES = ['new', 'contacted', 'converted', 'lost'];
const CALL_TIMES = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', anytime: 'Anytime' };

const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

export function LeadsTab({ token, config, onUnauthorized }) {
  const [filters, setFilters] = useState({ status: '', city: '', service: '', q: '' });
  const [data, setData] = useState({ leads: [], stats: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const query = useMemo(() => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    return params.toString() ? `?${params}` : '';
  }, [filters]);

  const handleError = useCallback((err) => {
    if (err.status === 401) onUnauthorized();
    else setError('Could not load leads. Is the API running?');
  }, [onUnauthorized]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      api(`/admin/leads${query}`, { token })
        .then((res) => { if (!cancelled) { setData(res); setError(null); } })
        .catch(handleError)
        .finally(() => !cancelled && setLoading(false));
    }, filters.q ? 250 : 0); // debounce typing in the search box
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, token, filters.q, handleError]);

  async function exportCsv() {
    try {
      const res = await api(`/admin/leads.csv${query}`, { token, raw: true });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `carepal-leads-${new Date().toISOString().slice(0, 10)}.csv`,
      });
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      handleError(err);
    }
  }

  async function updateLead(id, patch) {
    try {
      const updated = await api(`/admin/leads/${id}`, { method: 'PATCH', token, body: patch });
      setData((d) => ({ ...d, leads: d.leads.map((l) => (l.id === id ? updated : l)) }));
    } catch (err) {
      handleError(err);
    }
  }

  const label = (list, id) => findById(list, id)?.label.en ?? id;
  const selected = data.leads.find((l) => l.id === selectedId);
  const { stats } = data;

  return (
    <>
      {stats && (
        <div className="stat-grid">
          <Stat label="Total leads" value={stats.total} />
          <Stat label="New, not called" value={stats.new ?? 0} tone="accent" />
          <Stat label="Last 7 days" value={stats.lastWeek ?? 0} />
          <Stat label="Avg. plan / month" value={stats.avgPerMonth ? formatINR(stats.avgPerMonth) : '—'} />
        </div>
      )}

      <div className="admin-toolbar">
        <label className="search">
          <Icon name="search" size={18} />
          <input
            className="input"
            placeholder="Search name, phone, email, reference"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
        </label>
        <select className="input" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} aria-label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
        </select>
        <select className="input" value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} aria-label="City">
          <option value="">All cities</option>
          {config.cities.map((c) => <option key={c.id} value={c.id}>{c.label.en}</option>)}
        </select>
        <select className="input" value={filters.service} onChange={(e) => setFilters((f) => ({ ...f, service: e.target.value }))} aria-label="Care type">
          <option value="">All care types</option>
          {config.services.map((s) => <option key={s.id} value={s.id}>{s.label.en}</option>)}
        </select>
        <button type="button" className="btn btn-primary btn-sm" onClick={exportCsv}>
          <Icon name="download" size={16} /> Export CSV
        </button>
      </div>

      {error && <p className="form-alert">{error}</p>}

      <div className="lead-table card">
        <div className="lead-row lead-row--head" role="row">
          <span>Lead</span><span>Plan</span><span>Total</span><span>Call</span><span>Status</span>
        </div>
        {loading && data.leads.length === 0 && <p className="muted pad">Loading…</p>}
        {!loading && data.leads.length === 0 && <p className="muted pad">No leads match these filters.</p>}
        {data.leads.map((lead) => (
          <div key={lead.id} className="lead-row" role="row">
            <button type="button" className="lead-who" onClick={() => setSelectedId(lead.id)}>
              <strong>{lead.name}</strong>
              <small>{lead.reference} · {dateFmt.format(new Date(lead.createdAt))}</small>
            </button>
            <span className="lead-plan">
              {label(config.services, lead.service)}
              <small>{label(config.cities, lead.city)} · {lead.hours}h {lead.shiftType === 'live_in' ? 'live-in' : 'day'} · {lead.days}d</small>
            </span>
            <span className="lead-total">
              {formatINR(lead.total)}
              <small>{formatINR(lead.perMonth)}/mo</small>
            </span>
            <span className="lead-call">
              <a href={`tel:${lead.phone}`}>{lead.phone.replace('+91', '+91 ')}</a>
              <small>{CALL_TIMES[lead.callTime]}</small>
            </span>
            <select
              className={`status-select status--${lead.status}`}
              value={lead.status}
              onChange={(e) => updateLead(lead.id, { status: e.target.value })}
              aria-label={`Status for ${lead.name}`}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
            </select>
          </div>
        ))}
      </div>

      {selected && (
        <LeadDrawer lead={selected} config={config} onClose={() => setSelectedId(null)} onSave={(patch) => updateLead(selected.id, patch)} />
      )}
    </>
  );
}

function LeadDrawer({ lead, config, onClose, onSave }) {
  const [note, setNote] = useState(lead.adminNote);
  useEffect(() => setNote(lead.adminNote), [lead.adminNote]);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const addOns = Object.keys(lead.plan.addOns ?? {}).map((id) => findById(config.addOns, id)?.label.en ?? id);
  const waText = encodeURIComponent(`Hi ${lead.name.split(' ')[0]}, this is TheCarePal about your care plan ${lead.reference}.`);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={lead.name}>
        <div className="drawer-head">
          <div>
            <h2>{lead.name}</h2>
            <p className="muted">{lead.reference} · price list {lead.configVersion}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>

        <div className="drawer-actions">
          <a className="btn btn-soft btn-sm" href={`tel:${lead.phone}`}><Icon name="phone" size={16} /> Call</a>
          <a className="btn btn-whatsapp btn-sm" href={`https://wa.me/${lead.phone.replace('+', '')}?text=${waText}`} target="_blank" rel="noreferrer">WhatsApp</a>
          <a className="btn btn-ghost btn-sm" href={`mailto:${lead.email}`}>Email</a>
        </div>

        <dl className="facts">
          <div><dt>Phone</dt><dd>{lead.phone}</dd></div>
          <div><dt>Email</dt><dd>{lead.email}</dd></div>
          <div><dt>Call time</dt><dd>{CALL_TIMES[lead.callTime]}</dd></div>
          <div><dt>Language</dt><dd>{lead.language === 'hi' ? 'Hindi' : 'English'}</dd></div>
          <div><dt>Add-ons</dt><dd>{addOns.length ? addOns.join(', ') : 'None'}</dd></div>
        </dl>
        {lead.notes && <blockquote className="family-note">“{lead.notes}”</blockquote>}

        <EstimateBreakdown estimate={lead.estimate} compact />

        <label className="field drawer-note">
          <span>Ops note</span>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Called, assessment booked for Monday 11am" />
        </label>
        <button type="button" className="btn btn-primary btn-sm" disabled={note === lead.adminNote} onClick={() => onSave({ adminNote: note })}>Save note</button>
      </aside>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className={`stat card ${tone ? `stat--${tone}` : ''}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);
