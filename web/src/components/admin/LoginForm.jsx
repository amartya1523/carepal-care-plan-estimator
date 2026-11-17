import { useState } from 'react';
import { api } from '../../lib/api.js';

export function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token } = await api('/admin/login', { method: 'POST', body: { username, password } });
      onLogin(token);
    } catch (err) {
      setError(err.status === 401 ? 'Wrong username or password.' : err.status === 429 ? 'Too many attempts, try again in a few minutes.' : 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container page">
      <form className="card login-card" onSubmit={submit}>
        <h1>Operations login</h1>
        <p className="muted">Leads, exports and price list for the care team.</p>
        <label className="field">
          <span>Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p className="form-alert" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
