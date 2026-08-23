import { BootstrapContext } from '@angular/platform-browser';
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { serverConfig } from './app/app.config.server';

/**
 * Build-time prerender entry. Every route in `app.routes.ts` is rendered to
 * its own static HTML so crawlers (Google and AI assistants alike) receive the
 * page's real title, description, canonical URL and content without running
 * JavaScript. `main.ts` stays the browser entry.
 */
const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(App, serverConfig, context);

export default bootstrap;
