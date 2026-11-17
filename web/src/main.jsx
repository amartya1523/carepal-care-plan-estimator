import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from './lib/i18n.jsx';
import { ConfigProvider } from './lib/config.jsx';
import App from './App.jsx';
import './styles/app.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <ConfigProvider>
          <App />
        </ConfigProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
