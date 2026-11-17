import { useState } from 'react';
import { validateLead, CALL_SLOTS } from '@shared/lead.js';
import { useI18n } from '../lib/i18n.jsx';
import { usePlan } from '../lib/plan.jsx';
import { api } from '../lib/api.js';
import { StepHeading } from './steps.jsx';

const EMPTY = { name: '', phone: '', email: '', callTime: '', notes: '', consent: false, website: '' };

export function LeadForm({ onSubmitted }) {
  const { t, lang } = useI18n();
  const { plan } = usePlan();
  const [values, setValues] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [status, setStatus] = useState({ state: 'idle', message: null });

  const clientErrors = validateLead(values);
  const errors = { ...clientErrors, ...serverErrors };
  const showError = (field) => (touched[field] || status.state === 'attempted') && errors[field];

  const message = (field) => {
    const code = errors[field];
    if (field === 'phone' && code === 'invalid') return t('err_phone');
    if (field === 'email' && code === 'invalid') return t('err_email');
    return t(`err_${code}`);
  };

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, [field]: value }));
    setServerErrors((s) => ({ ...s, [field]: undefined }));
  };
  const blur = (field) => () => setTouched((tch) => ({ ...tch, [field]: true }));

  async function submit(e) {
    e.preventDefault();
    if (Object.keys(clientErrors).length) {
      setStatus({ state: 'attempted', message: null });
      const first = Object.keys(clientErrors)[0];
      document.getElementById(`lead-${first}`)?.focus();
      return;
    }
    setStatus({ state: 'sending', message: null });
    try {
      const { website, ...lead } = values;
      const result = await api('/leads', { method: 'POST', body: { plan, lead, language: lang, website } });
      onSubmitted({ ...result, name: values.name.trim().split(' ')[0], callTime: values.callTime });
    } catch (error) {
      if (error.body?.fields) setServerErrors(error.body.fields);
      const code = error.body?.error;
      setStatus({
        state: 'attempted',
        message: t(code === 'network' || code === 'too_many_requests' ? `err_${code}` : 'err_generic'),
      });
    }
  }

  const field = (name, label, props = {}, hint) => (
    <label className="field">
      <span>{label}</span>
      <input
        id={`lead-${name}`}
        name={name}
        value={values[name]}
        onChange={update(name)}
        onBlur={blur(name)}
        aria-invalid={Boolean(showError(name))}
        aria-describedby={`lead-${name}-msg`}
        {...props}
      />
      <small id={`lead-${name}-msg`} className={showError(name) ? 'field-error' : 'field-hint'}>
        {showError(name) ? message(name) : hint}
      </small>
    </label>
  );

  return (
    <form className="lead-form" onSubmit={submit} noValidate>
      <StepHeading title={t('stepContact')} hint={t('stepContactHint')} />

      {field('name', t('name'), { autoComplete: 'name', maxLength: 80 })}
      <div className="field-row">
        {field('phone', t('phone'), { type: 'tel', inputMode: 'tel', autoComplete: 'tel-national', placeholder: '98765 43210', maxLength: 16 }, t('phoneHint'))}
        {field('email', t('email'), { type: 'email', inputMode: 'email', autoComplete: 'email', maxLength: 120 })}
      </div>

      <fieldset className="field-group">
        <legend>{t('callTime')}</legend>
        <div className="chip-select" role="radiogroup" aria-label={t('callTime')} id="lead-callTime" tabIndex={-1}>
          {CALL_SLOTS.map((slot) => (
            <label key={slot} className={`chip-option ${values.callTime === slot ? 'is-selected' : ''}`}>
              <input type="radio" name="callTime" value={slot} checked={values.callTime === slot} onChange={update('callTime')} />
              {t(slot)}
            </label>
          ))}
        </div>
        {showError('callTime') && <small className="field-error">{message('callTime')}</small>}
      </fieldset>

      <label className="field">
        <span>{t('notes')}</span>
        <textarea id="lead-notes" rows={3} maxLength={500} value={values.notes} onChange={update('notes')} placeholder={t('notesPlaceholder')} />
      </label>

      {/* Honeypot, hidden from people and screen readers */}
      <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={update('website')} aria-hidden="true" />

      <label className="consent">
        <input id="lead-consent" type="checkbox" checked={values.consent} onChange={update('consent')} />
        <span>{t('consent')}</span>
      </label>
      {showError('consent') && <small className="field-error">{message('consent')}</small>}

      {status.message && <p className="form-alert" role="alert">{status.message}</p>}

      <button type="submit" className="btn btn-primary btn-block" disabled={status.state === 'sending'}>
        {status.state === 'sending' ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}
