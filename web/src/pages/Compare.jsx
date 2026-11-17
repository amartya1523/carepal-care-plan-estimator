import { useNavigate, Link } from 'react-router-dom';
import { calculateEstimate, validatePlan } from '@shared/pricing.js';
import { useI18n } from '../lib/i18n.jsx';
import { useConfig } from '../lib/config.jsx';
import { usePlan, describePlan } from '../lib/plan.jsx';
import { useCompare } from '../lib/compare.jsx';
import { formatINR } from '../lib/format.js';
import { EstimateBreakdown } from '../components/EstimateBreakdown.jsx';
import { Icon } from '../components/Icon.jsx';

export function Compare() {
  const { t, lang } = useI18n();
  const { config } = useConfig();
  const { plan: currentPlan, estimate: currentEstimate, dispatch } = usePlan();
  const { slots, saveTo, clear } = useCompare();
  const navigate = useNavigate();

  // Prices can change between saving and comparing, so always recompute.
  const priced = (plan) => {
    if (!plan || Object.keys(validatePlan(plan, config)).length) return null;
    return calculateEstimate(plan, config);
  };
  const a = priced(slots.A);
  const b = priced(slots.B);

  const edit = (plan) => {
    dispatch({ type: 'replace', plan });
    navigate('/');
  };

  const rows = [
    ['careType', (d) => d.service],
    ['city', (d) => d.city],
    ['hours', (_, p) => t('hoursN', { n: p.hours })],
    ['shift', (d) => d.shift],
    ['duration', (_, p, e) => t('daysN', { n: e.days })],
    ['addons', (d) => (d.addOns.length ? d.addOns.join(', ') : t('none'))],
  ];

  const column = (slot, plan, estimate) => {
    if (!plan || !estimate) {
      return (
        <div className="compare-col compare-col--empty card" key={slot}>
          <span className="compare-slot">{slot}</span>
          <p>{t('compareEmpty')}</p>
          {currentEstimate && (
            <button type="button" className="btn btn-soft btn-sm" onClick={() => saveTo(slot, currentPlan)}>
              {t(slot === 'A' ? 'saveA' : 'saveB')}
            </button>
          )}
        </div>
      );
    }
    const d = describePlan(plan, config, lang);
    return (
      <div className="compare-col card" key={slot}>
        <div className="compare-col-head">
          <span className="compare-slot">{slot}</span>
          <button type="button" className="link-btn" onClick={() => clear(slot)}>{t('compareClear')}</button>
        </div>
        <div className="compare-total">
          <strong>{formatINR(estimate.perMonth)}</strong>
          <small>{t('perMonthUnit')} · {t('inclGst')}</small>
        </div>
        <dl className="compare-facts">
          {rows.map(([key, get]) => (
            <div key={key}><dt>{t(key)}</dt><dd>{get(d, plan, estimate)}</dd></div>
          ))}
        </dl>
        <details className="compare-details">
          <summary>{t('viewBreakdown')}</summary>
          <EstimateBreakdown estimate={estimate} compact />
        </details>
        <div className="compare-col-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => edit(plan)}>{t('compareChoose')}</button>
        </div>
      </div>
    );
  };

  let verdict = null;
  if (a && b) {
    const diff = b.perMonth - a.perMonth;
    verdict = diff === 0
      ? t('compareSame')
      : t(diff > 0 ? 'compareDiffMore' : 'compareDiffLess', { amount: formatINR(Math.abs(diff)) });
  }

  return (
    <main className="container page">
      <div className="compare-head">
        <Link to="/" className="btn btn-ghost btn-sm"><Icon name="arrowLeft" size={16} /> {t('back')}</Link>
        <h1>{t('compareTitle')}</h1>
      </div>
      {verdict && <p className="compare-verdict"><Icon name="compare" size={18} /> {verdict}</p>}
      <div className="compare-grid">
        {column('A', slots.A, a)}
        {column('B', slots.B, b)}
      </div>
    </main>
  );
}
