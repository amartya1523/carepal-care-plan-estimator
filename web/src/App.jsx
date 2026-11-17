import { Routes, Route, Navigate } from 'react-router-dom';
import { useConfig } from './lib/config.jsx';
import { useI18n } from './lib/i18n.jsx';
import { PlanProvider } from './lib/plan.jsx';
import { Header } from './components/Header.jsx';
import { Estimator } from './pages/Estimator.jsx';
import { Admin } from './pages/Admin.jsx';
import { Compare } from './pages/Compare.jsx';
import { CompareProvider, useCompare } from './lib/compare.jsx';
import { EstimateActions } from './components/EstimateActions.jsx';

export default function App() {
  const { config, error, reload } = useConfig();
  const { t } = useI18n();

  if (error) {
    return (
      <div className="center-screen">
        <p>{t('err_network')}</p>
        <button type="button" className="btn btn-primary" onClick={reload}>Retry</button>
      </div>
    );
  }
  if (!config) return <div className="center-screen"><span className="spinner" aria-label="Loading" /></div>;

  return (
    <PlanProvider>
      <CompareProvider>
        <Shell />
      </CompareProvider>
    </PlanProvider>
  );
}

function Shell() {
  const { t } = useI18n();
  const { count } = useCompare();
  return (
    <>
      <Header compareCount={count} />
      <Routes>
        <Route path="/" element={<Estimator renderActions={(estimate) => <EstimateActions estimate={estimate} />} />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <footer className="site-footer no-print"><div className="container">{t('footer')}</div></footer>
    </>
  );
}
