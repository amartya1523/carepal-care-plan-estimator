import { Link, NavLink } from 'react-router-dom';
import { useI18n } from '../lib/i18n.jsx';
import { Icon } from './Icon.jsx';

export function Header({ compareCount = 0 }) {
  const { t, toggle, lang } = useI18n();
  return (
    <header className="site-header no-print">
      <div className="container header-row">
        <Link to="/" className="logo" aria-label="TheCarePal home">
          <span className="logo-mark" aria-hidden="true">
            <svg viewBox="0 0 64 64" width="30" height="30"><rect width="64" height="64" rx="16" fill="currentColor" /><path d="M32 47s-15-8.6-15-19.2C17 22.4 21 19 25.4 19c3 0 5.2 1.6 6.6 3.8 1.4-2.2 3.6-3.8 6.6-3.8C43 19 47 22.4 47 27.8 47 38.4 32 47 32 47z" fill="#fff" /></svg>
          </span>
          <span className="logo-text">
            <strong>{t('brand')}</strong>
            <small>{t('tagline')}</small>
          </span>
        </Link>
        <nav className="header-actions">
          <NavLink to="/compare" className="header-link">
            <Icon name="compare" size={18} />
            <span className="hide-xs">{t('compare')}</span>
            {compareCount > 0 && <span className="pill-count">{compareCount}</span>}
          </NavLink>
          <button type="button" className="lang-toggle" onClick={toggle} aria-label="Switch language" lang={lang === 'en' ? 'hi' : 'en'}>
            <Icon name="globe" size={18} />
            {t('language')}
          </button>
        </nav>
      </div>
    </header>
  );
}
