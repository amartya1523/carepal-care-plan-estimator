import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { formatINR } from '../../lib/format.js';

/**
 * Price list editor for the ops team. Edits a copy of the config and sends
 * the whole thing back; the server validates it, keeps a backup of the old
 * file and the website picks up the new prices on the next page load.
 */
export function RatesTab({ token, onUnauthorized, onSaved }) {
  const [original, setOriginal] = useState(null);
  const [draft, setDraft] = useState(null);
  const [service, setService] = useState('elderly');
  const [status, setStatus] = useState({ kind: null, text: '' });

  useEffect(() => {
    api('/admin/pricing', { token })
      .then((config) => { setOriginal(config); setDraft(structuredClone(config)); })
      .catch((err) => (err.status === 401 ? onUnauthorized() : setStatus({ kind: 'error', text: 'Could not load prices.' })));
  }, [token, onUnauthorized]);

  const columns = useMemo(() => {
    if (!draft) return [];
    return draft.shiftTypes.flatMap((shift) => draft.hours
      .filter((h) => draft.cities.some((c) => c.rates[service]?.[shift.id]?.[String(h)] != null))
      .map((h) => ({ shift: shift.id, hours: String(h), label: `${shift.label.en} ${h}h` })));
  }, [draft, service]);

  const changes = useMemo(() => (draft && original ? countChanges(original, draft) : 0), [draft, original]);

  if (!draft) return <p className="muted pad">{status.text || 'Loading price list…'}</p>;

  const setRate = (cityIndex, shift, hours, value) => {
    setDraft((d) => {
      const next = structuredClone(d);
      next.cities[cityIndex].rates[service][shift][hours] = value === '' ? '' : Number(value);
      return next;
    });
  };
  const setAddOnPrice = (index, value) => {
    setDraft((d) => {
      const next = structuredClone(d);
      next.addOns[index].price = value === '' ? '' : Number(value);
      return next;
    });
  };

  async function save() {
    setStatus({ kind: 'busy', text: 'Saving…' });
    try {
      const saved = await api('/admin/pricing', { method: 'PUT', token, body: draft });
      setOriginal(saved);
      setDraft(structuredClone(saved));
      setStatus({ kind: 'ok', text: `Saved. New price list version ${saved.version} is live on the website.` });
      onSaved?.(saved);
    } catch (err) {
      if (err.status === 401) return onUnauthorized();
      const details = err.body?.details?.slice(0, 5).join(' · ');
      setStatus({ kind: 'error', text: details ? `Not saved: ${details}` : 'Not saved, please try again.' });
    }
  }

  return (
    <div className="rates">
      <div className="rates-head">
        <div>
          <h2>Price list</h2>
          <p className="muted">Per-day rates in ₹, before GST ({Math.round(draft.gst.rate * 100)}%). Version {original.version}.</p>
        </div>
        <div className="rates-save">
          {changes > 0 && <span className="chip">{changes} unsaved change{changes > 1 ? 's' : ''}</span>}
          <button type="button" className="btn btn-ghost btn-sm" disabled={!changes} onClick={() => setDraft(structuredClone(original))}>Discard</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!changes || status.kind === 'busy'} onClick={save}>Save & publish</button>
        </div>
      </div>
      {status.text && <p className={status.kind === 'error' ? 'form-alert' : 'form-ok'}>{status.text}</p>}

      <div className="chip-select" role="tablist">
        {draft.services.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={service === s.id}
            className={`chip-option ${service === s.id ? 'is-selected' : ''}`} onClick={() => setService(s.id)}>
            {s.label.en}
          </button>
        ))}
      </div>

      <div className="table-scroll card">
        <table className="rate-table">
          <thead>
            <tr><th>City</th>{columns.map((c) => <th key={`${c.shift}-${c.hours}`}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {draft.cities.map((city, i) => (
              <tr key={city.id}>
                <th scope="row">{city.label.en}</th>
                {columns.map((c) => {
                  const value = city.rates[service][c.shift]?.[c.hours];
                  const before = original.cities[i].rates[service][c.shift]?.[c.hours];
                  return (
                    <td key={`${c.shift}-${c.hours}`}>
                      <input
                        type="number"
                        min="1"
                        inputMode="numeric"
                        className={`rate-input ${value !== before ? 'is-changed' : ''} ${!(value > 0) ? 'is-invalid' : ''}`}
                        value={value ?? ''}
                        onChange={(e) => setRate(i, c.shift, c.hours, e.target.value)}
                        aria-label={`${city.label.en} ${c.label}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="rates-sub">Add-ons</h3>
      <div className="table-scroll card">
        <table className="rate-table">
          <thead><tr><th>Add-on</th><th>Unit</th><th>Price (₹)</th><th>Now</th></tr></thead>
          <tbody>
            {draft.addOns.map((a, i) => (
              <tr key={a.id}>
                <th scope="row">{a.label.en}</th>
                <td className="muted">per {a.unit}</td>
                <td>
                  <input type="number" min="1" className={`rate-input ${a.price !== original.addOns[i].price ? 'is-changed' : ''}`}
                    value={a.price} onChange={(e) => setAddOnPrice(i, e.target.value)} aria-label={`${a.label.en} price`} />
                </td>
                <td className="muted">{formatINR(original.addOns[i].price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function countChanges(a, b) {
  let n = 0;
  a.cities.forEach((city, i) => {
    for (const [svc, shifts] of Object.entries(city.rates)) {
      for (const [shift, byHours] of Object.entries(shifts)) {
        for (const [h, v] of Object.entries(byHours)) if (b.cities[i].rates[svc][shift][h] !== v) n += 1;
      }
    }
  });
  a.addOns.forEach((addOn, i) => { if (b.addOns[i].price !== addOn.price) n += 1; });
  return n;
}
