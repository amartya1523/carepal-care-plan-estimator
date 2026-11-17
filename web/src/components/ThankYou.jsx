import { useI18n } from '../lib/i18n.jsx';
import { EstimateBreakdown } from './EstimateBreakdown.jsx';
import { Icon } from './Icon.jsx';

export function ThankYou({ result, onRestart, shareActions }) {
  const { t } = useI18n();
  return (
    <section className="thank-you card">
      <div className="thank-you-badge"><Icon name="check" size={32} strokeWidth={2.6} /></div>
      <h2>{t('thanksTitle', { name: result.name })}</h2>
      <p>{t('thanksText', { slot: t(`thanksSlot_${result.callTime}`) })}</p>
      <p className="reference">{result.reference}</p>

      <ol className="next-steps">
        <li><span>1</span>{t('thanksStep1')}</li>
        <li><span>2</span>{t('thanksStep2')}</li>
        <li><span>3</span>{t('thanksStep3')}</li>
      </ol>

      <EstimateBreakdown estimate={result.estimate} />
      {shareActions}
      <button type="button" className="btn btn-ghost no-print" onClick={onRestart}>{t('startOver')}</button>
    </section>
  );
}
