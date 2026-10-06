import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import {
  TitleStrategy,
  provideRouter,
  withInMemoryScrolling,
} from '@angular/router';
import { appRoutes } from './app.routes';
import { OgeTitleStrategy } from './shared/title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Every route is prerendered (app.config.server.ts), so the browser
    // hydrates that DOM instead of throwing it away and rendering again;
    // event replay queues clicks made before hydration finishes. The
    // hydration crawl (apps/dev-app-e2e/ssr/hydration.spec.ts) runs against
    // this production build and fails on any NG05xx mismatch.
    //
    // Production builds only: the dev server backs the interaction e2e suite,
    // whose specs type right after `goto` — and hydration re-applies `[value]`
    // bindings, discarding text typed into the server DOM before it finished.
    ...(isDevMode() ? [] : [provideClientHydration(withEventReplay())]),
    // Search-friendly document titles derived from the short route titles.
    { provide: TitleStrategy, useClass: OgeTitleStrategy },
    provideRouter(
      appRoutes,
      // A new page starts at its top; back/forward restores where you were.
      // Without this the router keeps the previous route's scroll position,
      // so opening a component page dropped you mid-document.
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),
  ],
};
