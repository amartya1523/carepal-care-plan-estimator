import { addOnsForService, discountRateForDays } from '@shared/pricing.js';
import { useI18n } from '../lib/i18n.jsx';
import { useConfig } from '../lib/config.jsx';
import { usePlan } from '../lib/plan.jsx';
import { formatINR, pick } from '../lib/format.js';
import { Icon } from './Icon.jsx';

function OptionCard({ selected, disabled, onSelect, children, className = '', role = 'radio' }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      disabled={disabled}
      className={`option-card ${selected ? 'is-selected' : ''} ${className}`}
      onClick={onSelect}
    >
      {children}
      <span className="option-check" aria-hidden="true"><Icon name="check" size={14} strokeWidth={3} /></span>
    </button>
  );
}

export function StepHeading({ title, hint }) {
  return (
    <div className="step-heading">
      <h2 tabIndex={-1}>{title}</h2>
      {hint && <p>{hint}</p>}
    </div>
  );
}

export function CareStep() {
  const { t, lang } = useI18n();
  const { config } = useConfig();
  const { plan, dispatch } = usePlan();

  return (
    <>
      <StepHeading title={t('stepCare')} hint={t('stepCareHint')} />
      <div className="option-grid option-grid--2" role="radiogroup" aria-label={t('stepCare')}>
        {config.services.map((service) => (
          <OptionCard
            key={service.id}
            selected={plan.service === service.id}
            onSelect={() => dispatch({
              type: 'setService',
              value: service.id,
              allowedAddOns: addOnsForService(config, service.id).map((a) => a.id),
            })}
            className="option-card--service"
          >
            <span className={`service-icon service-icon--${service.id}`}><Icon name={service.id} size={26} /></span>
            <span className="option-title">{pick(service.label, lang)}</span>
            <span className="option-text">{pick(service.description, lang)}</span>
            <span className="option-meta">{pick(service.staff, lang)}</span>
          </OptionCard>
        ))}
      </div>
    </>
  );
}

export function CityStep() {
  const { t, lang } = useI18n();
  const { config } = useConfig();
  const { plan, dispatch } = usePlan();
  const from = (city) => {
    const rate = city.rates[plan.service ?? 'elderly']?.day?.['12'];
    return rate ? formatINR(rate) : null;
  };

  return (
    <>
      <StepHeading title={t('stepCity')} hint={t('stepCityHint')} />
      <div className="option-grid option-grid--3" role="radiogroup" aria-label={t('stepCity')}>
        {config.cities.map((city) => (
          <OptionCard key={city.id} selected={plan.city === city.id} onSelect={() => dispatch({ type: 'set', field: 'city', value: city.id })} className="option-card--city">
            <Icon name="pin" size={18} className="city-pin" />
            <span className="option-title">{pick(city.label, lang)}</span>
            {from(city) && <span className="option-meta">12h · {from(city)}/{lang === 'hi' ? 'दिन' : 'day'}</span>}
          </OptionCard>
        ))}
      </div>
    </>
  );
}

export function ScheduleStep() {
  const { t, lang } = useI18n();
  const { config } = useConfig();
  const { plan, dispatch, errors } = usePlan();
  const rateFor = (shiftType, hours) => config.cities.find((c) => c.id === plan.city)?.rates[plan.service]?.[shiftType]?.[String(hours)];

  return (
    <>
      <StepHeading title={t('stepSchedule')} hint={t('stepScheduleHint')} />

      <fieldset className="field-group">
        <legend>{t('hoursLabel')}</legend>
        <div className="segmented" role="radiogroup" aria-label={t('hoursLabel')}>
          {config.hours.map((h) => (
            <button
              key={h}
              type="button"
              role="radio"
              aria-checked={Number(plan.hours) === h}
              className={Number(plan.hours) === h ? 'is-selected' : ''}
              onClick={() => dispatch({ type: 'set', field: 'hours', value: h })}
            >
              <Icon name={h === 24 ? 'home' : h === 12 ? 'sun' : 'clock'} size={18} />
              {t('hoursN', { n: h })}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="field-group">
        <legend>{t('shiftLabel')}</legend>
        <div className="option-grid option-grid--2" role="radiogroup" aria-label={t('shiftLabel')}>
          {config.shiftTypes.map((shift) => {
            const rate = rateFor(shift.id, plan.hours);
            const unavailable = rate == null;
            return (
              <OptionCard
                key={shift.id}
                selected={plan.shiftType === shift.id && !unavailable}
                disabled={unavailable}
                onSelect={() => dispatch({ type: 'set', field: 'shiftType', value: shift.id })}
              >
                <span className="option-title">{pick(shift.label, lang)}</span>
                <span className="option-text">{pick(shift.description, lang)}</span>
                <span className="option-meta">
                  {unavailable ? t('liveInNeeds12') : `${formatINR(rate)} ${t('perDayUnit')}`}
                </span>
              </OptionCard>
            );
          })}
        </div>
        {errors.shiftType === 'not_offered' && <p className="field-error">{t('err_not_offered')}</p>}
      </fieldset>
    </>
  );
}

export function DurationStep() {
  const { t, lang } = useI18n();
  const { config } = useConfig();
  const { plan, dispatch, errors } = usePlan();
  const badge = (days) => {
    const rate = discountRateForDays(config, days);
    return rate > 0 ? <span className="badge-save">{t('discountBadge', { pct: Math.round(rate * 100) })}</span> : null;
  };

  return (
    <>
      <StepHeading title={t('stepDuration')} hint={t('stepDurationHint')} />
      <div className="option-grid option-grid--3" role="radiogroup" aria-label={t('stepDuration')}>
        {config.durations.map((d) => (
          <OptionCard key={d.id} selected={plan.durationId === d.id} onSelect={() => dispatch({ type: 'set', field: 'durationId', value: d.id })} className="option-card--compact">
            <span className="option-title">{pick(d.label, lang)}</span>
            {badge(d.days)}
          </OptionCard>
        ))}
        <OptionCard selected={plan.durationId === 'custom'} onSelect={() => dispatch({ type: 'set', field: 'durationId', value: 'custom' })} className="option-card--compact">
          <span className="option-title">{t('durationCustom')}</span>
          {plan.durationId === 'custom' && badge(Number(plan.customDays) || 0)}
        </OptionCard>
      </div>

      {plan.durationId === 'custom' && (
        <label className="field field--inline-num">
          <span>{t('customDaysLabel')}</span>
          <input
            type="number"
            inputMode="numeric"
            min={config.customDays.min}
            max={config.customDays.max}
            value={plan.customDays ?? ''}
            onChange={(e) => dispatch({ type: 'set', field: 'customDays', value: e.target.value === '' ? '' : Number(e.target.value) })}
            aria-invalid={Boolean(errors.customDays)}
          />
          <small className={errors.customDays ? 'field-error' : 'field-hint'}>
            {t('customDaysHint', { min: config.customDays.min, max: config.customDays.max })}
          </small>
        </label>
      )}
    </>
  );
}

export function AddOnsStep() {
  const { t, lang } = useI18n();
  const { config } = useConfig();
  const { plan, dispatch } = usePlan();
  const available = addOnsForService(config, plan.service);
  const unitLabel = { visit: t('perVisit'), month: t('perMonthUnit'), day: t('perDayUnit'), once: t('oneTime') };

  return (
    <>
      <StepHeading title={t('stepAddons')} hint={t('stepAddonsHint')} />
      <div className="addon-list">
        {available.map((addOn) => {
          const selection = plan.addOns[addOn.id];
          const selected = Boolean(selection);
          return (
            <div key={addOn.id} className={`addon ${selected ? 'is-selected' : ''}`}>
              <label className="addon-main">
                <input type="checkbox" checked={selected} onChange={() => dispatch({ type: 'toggleAddOn', addOn })} />
                <span className="addon-box" aria-hidden="true"><Icon name="check" size={14} strokeWidth={3} /></span>
                <span className="addon-label">
                  <span>{pick(addOn.label, lang)}</span>
                  <small>{formatINR(addOn.price)} {unitLabel[addOn.unit]}</small>
                </span>
              </label>
              {selected && addOn.unit === 'visit' && (
                <div className="stepper" aria-label={t('visitsPerWeek')}>
                  <span className="stepper-label">{t('visitsPerWeek')}</span>
                  <button type="button" aria-label="−" disabled={selection.perWeek <= addOn.frequency.min}
                    onClick={() => dispatch({ type: 'setAddOnFrequency', id: addOn.id, perWeek: selection.perWeek - 1 })}>
                    <Icon name="minus" size={16} />
                  </button>
                  <output>{selection.perWeek}</output>
                  <button type="button" aria-label="+" disabled={selection.perWeek >= addOn.frequency.max}
                    onClick={() => dispatch({ type: 'setAddOnFrequency', id: addOn.id, perWeek: selection.perWeek + 1 })}>
                    <Icon name="plus" size={16} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
