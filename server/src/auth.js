import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Minimal stateless admin session: a signed, expiring token.
 * Good enough for a single ops login; swap for Firebase Auth in production.
 */
export function createAuth({ username, password, sessionSecret, sessionHours }) {
  const sign = (payload) => createHmac('sha256', sessionSecret).update(payload).digest('base64url');

  return {
    checkCredentials(user, pass) {
      if (!password || !sessionSecret) return false; // admin disabled until configured
      // evaluate both so a wrong username takes as long as a wrong password
      const userOk = safeEqual(user, username);
      const passOk = safeEqual(pass, password);
      return userOk && passOk;
    },

    issueToken() {
      const payload = Buffer.from(JSON.stringify({
        sub: username,
        exp: Date.now() + sessionHours * 3600 * 1000,
      })).toString('base64url');
      return `${payload}.${sign(payload)}`;
    },

    verifyToken(token) {
      const [payload, signature] = String(token ?? '').split('.');
      if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
      try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
        return data.exp > Date.now() ? data : null;
      } catch {
        return null;
      }
    },
  };
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a ?? ''));
  const right = Buffer.from(String(b ?? ''));
  if (left.length !== right.length) {
    timingSafeEqual(left, left); // keep timing roughly constant
    return false;
  }
  return timingSafeEqual(left, right);
}

export function requireAdmin(auth) {
  return (req, res, next) => {
    const header = req.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const session = auth.verifyToken(token);
    if (!session) return res.status(401).json({ error: 'unauthorized' });
    req.admin = session;
    next();
  };
}
