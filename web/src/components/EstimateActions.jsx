import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n.jsx';
import { useConfig } from '../lib/config.jsx';
import { usePlan, describePlan } from '../lib/plan.jsx';
import { useCompare } from '../lib/compare.jsx';
import { shareUrl } from '../lib/plan-url.js';
import { formatINR } from '../lib/format.js';
import { Icon } from './Icon.jsx';

export function whatsappLink(plan, estimate, config, lang, t) {
  const d = describePlan(plan, config, lang);
  const text = t('whatsappText', {
    service: d.service,
    city: d.city,
    hours: plan.hours,
    shift: d.shift.toLowerCase(),
    days: estimate.days,
    total: formatINR(estimate.total),
    perMonth: formatINR(estimate.perMonth),
    url: shareUrl(plan),
  });
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Compare, WhatsApp share and print buttons shown under the estimate. */
export function EstimateActions({ estimate, showCompare = true }) {
  const { t, lang } = useI18n();
  const { config } = useConfig();
  const { plan } = usePlan();
  const { saveTo } = useCompare();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(null);

  if (!estimate) return null;

  const saveSlot = (slot) => {
    saveTo(slot, plan);
    setSaved(slot);
    if (slot === 'B') navigate('/compare');
  };

  return (
    <div className="estimate-actions no-print">
      <a className="btn btn-whatsapp" href={whatsappLink(plan, estimate, config, lang, t)} target="_blank" rel="noreferrer">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3 1 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2 .7 2.8.6.4-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.2z" /></svg>
        {t('shareWhatsapp')}
      </a>
      {showCompare && (
        <div className="estimate-actions-row">
          <button type="button" className="btn btn-soft btn-sm" onClick={() => saveSlot('A')}>
            {saved === 'A' ? <><Icon name="check" size={16} />{t('savedAs', { slot: 'A' })}</> : t('saveA')}
          </button>
          <button type="button" className="btn btn-soft btn-sm" onClick={() => saveSlot('B')}>{t('saveB')}</button>
        </div>
      )}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.print()}>
        <Icon name="print" size={16} /> {t('print')}
      </button>
    </div>
  );
}
