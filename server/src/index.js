import { createApp } from './app.js';
import { settings } from './settings.js';

if (!settings.admin.password || !settings.admin.sessionSecret) {
  console.warn('ADMIN_PASSWORD or SESSION_SECRET not set: the admin page will reject every login. See .env.example.');
}

const { app } = createApp(settings);

app.listen(settings.port, () => {
  console.log(`CarePal estimator API on http://localhost:${settings.port}`);
});
