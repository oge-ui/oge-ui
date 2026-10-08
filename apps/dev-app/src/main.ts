import { bootstrapApplication } from '@angular/platform-browser';
import { inject as injectVercelAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Only where Vercel serves the site (the scripts live on that host): a local
// build — the SSR/CSP end-to-end specs serve one — has no `/_vercel/insights`
// or `/_vercel/speed-insights`, and under a Trusted Types policy the injected
// `<script src>` would throw before the app bootstraps.
if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
  injectVercelAnalytics();
  injectSpeedInsights();
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
