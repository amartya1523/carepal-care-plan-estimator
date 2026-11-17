import { useCallback, useState } from 'react';
import { useConfig } from '../lib/config.jsx';
import { getToken, setToken, clearToken } from '../lib/admin-session.js';
import { LoginForm } from '../components/admin/LoginForm.jsx';
import { LeadsTab } from '../components/admin/LeadsTab.jsx';
import { RatesTab } from '../components/admin/RatesTab.jsx';
import { Icon } from '../components/Icon.jsx';

export function Admin() {
  const { config, reload } = useConfig();
  const [token, setTokenState] = useState(getToken);
  const [tab, setTab] = useState('leads');

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
  }, []);

  if (!token) {
    return <LoginForm onLogin={(t) => { setToken(t); setTokenState(t); }} />;
  }

  return (
    <main className="container page admin">
      <div className="admin-head">
        <div>
          <h1>Care plan leads</h1>
          <p className="muted">Families who asked for a call back from the website estimator.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={logout}><Icon name="logout" size={16} /> Log out</button>
      </div>

      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'leads'} className={tab === 'leads' ? 'is-active' : ''} onClick={() => setTab('leads')}>Leads</button>
        <button type="button" role="tab" aria-selected={tab === 'rates'} className={tab === 'rates' ? 'is-active' : ''} onClick={() => setTab('rates')}>Price list</button>
      </div>

      {tab === 'leads'
        ? <LeadsTab token={token} config={config} onUnauthorized={logout} />
        : <RatesTab token={token} onUnauthorized={logout} onSaved={reload} />}
    </main>
  );
}
