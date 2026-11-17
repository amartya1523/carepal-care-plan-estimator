import { useI18n } from '../lib/i18n.jsx';
import { formatINR, pick } from '../lib/format.js';

const pct = (rate) => Math.round(rate * 1000) / 10;

/** Line-by-line estimate: care, discount, add-ons, fees, GST split and total. */
export function EstimateBreakdown({ estimate, compact = false }) {
  const { t, lang } = useI18n();

  const lineDetail = (line) => {
    const rate = formatINR(line.unitPrice);
    switch (line.kind) {
      case 'care':
        return t('lineCare', { hours: line.detail.hours, shift: pick(line.detail.shiftType, lang).toLowerCase(), days: line.quantity, rate });
      case 'discount':
        return t('discountLine', { pct: pct(line.detail.rate) });
      case 'fee':
        return line.detail.waived ? t('waived') : t('lineOnce');
      default:
        if (line.unit === 'visit') return t('lineVisits', { qty: line.quantity, perWeek: line.detail.perWeek, rate });
        if (line.unit === 'month') return t('lineMonths', { qty: line.quantity, rate });
        if (line.unit === 'day') return t('lineDays', { qty: line.quantity, rate });
        return t('lineOnce');
    }
  };

  return (
    <div className={`breakdown ${compact ? 'breakdown--compact' : ''}`}>
      <ul className="breakdown-lines">
        {estimate.lines.map((line) => (
          <li key={line.id} className={`breakdown-line breakdown-line--${line.kind}`}>
            <div className="breakdown-label">
              <span>{pick(line.label, lang)}</span>
              <small>{lineDetail(line)}</small>
            </div>
            <span className={`breakdown-amount ${line.detail?.waived ? 'is-waived' : ''}`}>
              {line.detail?.waived ? <s>{formatINR(line.unitPrice)}</s> : formatINR(line.amount)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="breakdown-totals">
        <div><dt>{t('taxable')}</dt><dd>{formatINR(estimate.taxable)}</dd></div>
        <div className="muted"><dt>{t('cgst', { pct: pct(estimate.gst.rate / 2) })}</dt><dd>{formatINR(estimate.gst.cgst)}</dd></div>
        <div className="muted"><dt>{t('sgst', { pct: pct(estimate.gst.rate / 2) })}</dt><dd>{formatINR(estimate.gst.sgst)}</dd></div>
        <div className="breakdown-grand">
          <dt>{t('total')} <small>{t('inclGst')}</small></dt>
          <dd>{formatINR(estimate.total)}</dd>
        </div>
      </dl>
      <p className="breakdown-eq">
        {t('perMonthEq', { amount: formatINR(estimate.perMonth) })} · {t('perDayEq', { amount: formatINR(estimate.perDay) })}
      </p>
    </div>
  );
}
