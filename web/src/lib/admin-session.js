// The admin token lives in sessionStorage: it survives a refresh but not closing the tab.
const KEY = 'carepal.admin';

export const getToken = () => {
  try { return window.sessionStorage.getItem(KEY); } catch { return null; }
};
export const setToken = (token) => {
  try { window.sessionStorage.setItem(KEY, token); } catch { /* ignore */ }
};
export const clearToken = () => {
  try { window.sessionStorage.removeItem(KEY); } catch { /* ignore */ }
};
