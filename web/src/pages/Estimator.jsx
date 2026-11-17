import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../lib/i18n.jsx';
import { usePlan } from '../lib/plan.jsx';
import { load, save } from '../lib/storage.js';
import { CareStep, CityStep, ScheduleStep, DurationStep, AddOnsStep } from '../components/steps.jsx';
import { LeadForm } from '../components/LeadForm.jsx';
import { ThankYou } from '../components/ThankYou.jsx';
import { EstimatePanel } from '../components/EstimatePanel.jsx';
import { Icon } from '../components/Icon.jsx';

const STEPS = [
  { id: 'care', Component: CareStep, isDone: ({ plan }) => Boolean(plan.service) },
  { id: 'city', Component: CityStep, isDone: ({ plan }) => Boolean(plan.city) },
  { id: 'schedule', Component: ScheduleStep, isDone: ({ errors }) => !errors.hours && !errors.shiftType },
  { id: 'duration', Component: DurationStep, isDone: ({ errors }) => !errors.durationId && !errors.customDays },
  { id: 'addons', Component: AddOnsStep, isDone: ({ estimate }) => Boolean(estimate) },
  { id: 'contact', Component: null, isDone: () => false },
];

export function Estimator({ renderActions = () => null }) {
  const { t } = useI18n();
  const planState = usePlan();
  const { dispatch } = planState;
  const [step, setStep] = useState(() => firstIncompleteStep(planState, load('carepal.step', 0)));
  const [result, setResult] = useState(null);
  const bodyRef = useRef(null);

  useEffect(() => save('carepal.step', step), [step]);

  const go = (next) => {
    setStep(next);
    // Move focus to the new heading for keyboard and screen reader users.
    requestAnimationFrame(() => {
      bodyRef.current?.querySelector('h2')?.focus({ preventScroll: true });
      bodyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const current = STEPS[step];
  const canContinue = current.isDone(planState);
  const isLast = step === STEPS.length - 2;

  if (result) {
    return (
      <main className="container page">
        <ThankYou
          result={result}
          shareActions={renderActions(result.estimate)}
          onRestart={() => { dispatch({ type: 'reset' }); setResult(null); go(0); }}
        />
      </main>
    );
  }

  return (
    <main className="container page">
      {step === 0 && (
        <section className="hero">
          <h1>{t('heroTitle')}</h1>
          <p>{t('heroText')}</p>
          <ul className="trust-row">
            <li><Icon name="shield" size={18} />{t('trust1')}</li>
            <li><Icon name="clock" size={18} />{t('trust2')}</li>
            <li><Icon name="rupee" size={18} />{t('trust3')}</li>
          </ul>
        </section>
      )}

      <div className="builder">
        <section className="builder-main card" ref={bodyRef}>
          <div className="progress" aria-label={t('stepOf', { n: step + 1, total: STEPS.length })}>
            <div className="progress-meta">
              <span>{t('stepOf', { n: step + 1, total: STEPS.length })}</span>
            </div>
            <div className="progress-track">
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={`progress-dot ${i < step ? 'is-done' : ''} ${i === step ? 'is-current' : ''}`}
                  onClick={() => i < step && go(i)}
                  disabled={i > step}
                  aria-label={`${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="step-body" key={current.id}>
            {current.Component ? <current.Component /> : <LeadForm onSubmitted={setResult} />}
          </div>

          <div className="step-nav no-print">
            {step > 0 && (
              <button type="button" className="btn btn-ghost" onClick={() => go(step - 1)}>
                <Icon name="arrowLeft" size={18} /> {t('back')}
              </button>
            )}
            {current.Component && (
              <button type="button" className="btn btn-primary" disabled={!canContinue} onClick={() => go(step + 1)}>
                {isLast ? t('seePrice') : t('next')} <Icon name="arrowRight" size={18} />
              </button>
            )}
          </div>
        </section>

        <EstimatePanel actions={renderActions(planState.estimate)} />
      </div>
    </main>
  );
}

/** Resume where the family left off, but never past a step they have not completed. */
function firstIncompleteStep(planState, saved) {
  for (let i = 0; i < Math.min(saved, STEPS.length - 1); i += 1) {
    if (!STEPS[i].isDone(planState)) return i;
  }
  return Math.min(saved, STEPS.length - 1);
}
