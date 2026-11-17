import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const ConfigContext = createContext(null);

/** Loads the live price list from the API once and shares it with the app. */
export function ConfigProvider({ children }) {
  const [state, setState] = useState({ config: null, error: null });

  // Reloads keep the current config on screen until the new one arrives.
  const loadConfig = useCallback(() => {
    api('/config')
      .then((config) => setState({ config, error: null }))
      .catch((error) => setState((s) => ({ config: s.config, error: s.config ? null : error })));
  }, []);

  useEffect(loadConfig, [loadConfig]);

  return <ConfigContext.Provider value={{ ...state, reload: loadConfig }}>{children}</ConfigContext.Provider>;
}

export const useConfig = () => useContext(ConfigContext);
