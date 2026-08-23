import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
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
