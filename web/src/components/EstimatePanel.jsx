import { useState } from 'react';
import { useI18n } from '../lib/i18n.jsx';
import { usePlan } from '../lib/plan.jsx';
import { formatINR } from '../lib/format.js';
import { EstimateBreakdown } from './EstimateBreakdown.jsx';
import { Icon } from './Icon.jsx';

/** Sticky side panel on desktop, collapsible bottom sheet on phones. */
export function EstimatePanel({ actions = null }) {
  const { t } = useI18n();
  const { estimate } = usePlan();
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="estimate-panel card" aria-live="polite">
        <div className="estimate-head">
          <h2>{t('estimate')}</h2>
          {estimate && <span className="chip">{t('daysN', { n: estimate.days })}</span>}
        </div>
        {estimate ? (
          <>
            <EstimateBreakdown estimate={estimate} />
            {actions}
            <p className="fine-print">{t('priceNote', { version: estimate.configVersion })}</p>
          </>
        ) : (
          <div className="estimate-empty">
            <Icon name="rupee" size={28} />
            <p>{t('estimateEmpty')}</p>
          </div>
        )}
      </aside>

      {estimate && (
        <div className={`mobile-bar no-print ${open ? 'is-open' : ''}`}>
          {open && (
            <div className="mobile-sheet" id="mobile-breakdown">
              <EstimateBreakdown estimate={estimate} compact />
              {actions}
            </div>
          )}
          <button type="button" className="mobile-bar-row" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-breakdown">
            <span className="mobile-bar-total">
              <small>{t('total')} · {t('inclGst')}</small>
              <strong>{formatINR(estimate.total)}</strong>
            </span>
            <span className="mobile-bar-toggle">
              {open ? t('hideBreakdown') : t('viewBreakdown')}
            </span>
          </button>
        </div>
      )}
    </>
  );
}
