/** Code samples rendered on the Angular SSR, hydration and zoneless guide. */
import { demoSource } from '../../shared/demo-source';

export const APP_CONFIG = `// app.config.ts — the browser half
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // adopt the server DOM instead of re-rendering it; clicks and keys made
    // before hydration finishes are queued and replayed
    provideClientHydration(withEventReplay()),
    provideRouter(routes),
  ],
};`;

export const SERVER_CONFIG = `// app.config.server.ts — the server half, with the event-replay fold
import { ApplicationConfig, DOCUMENT, inject, mergeApplicationConfig } from '@angular/core';
import { BEFORE_APP_SERIALIZED } from '@angular/platform-server';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

/**
 * Angular 22.2 inserts the replay bootstrap <script> into <body> after it has
 * computed the hydration annotations, so nodes located by a path from <body>
 * (<oge-tab> projected into <oge-tab-panel>, <oge-step> into <oge-stepper>)
 * end up one sibling off and the client fails with NG0509. Folding the call
 * into the contract script restores the child list the annotations expect.
 */
function foldReplayBootstrap(doc: Document): void {
  const contract = doc.getElementById('ng-event-dispatch-contract');
  if (contract === null) return;
  for (const script of Array.from(doc.querySelectorAll('script'))) {
    if (script === contract || script.hasAttribute('type')) continue;
    const code = script.textContent ?? '';
    if (!code.startsWith('window.__jsaction_bootstrap(')) continue;
    contract.textContent = \`\${contract.textContent ?? ''}\\n\${code}\`;
    script.remove();
  }
}

export const serverConfig: ApplicationConfig = mergeApplicationConfig(appConfig, {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    {
      provide: BEFORE_APP_SERIALIZED,
      useFactory: () => {
        const doc = inject(DOCUMENT);
        return () => foldReplayBootstrap(doc);
      },
      multi: true,
    },
  ],
});`;

/** A host component that measures only in the browser. */
export const BROWSER_ONLY = demoSource({
  use: { '@oge-ui/grid': ['OgeGrid', 'OgeColumn'] },
  dataset: 'employees',
  template: `<oge-grid [data]="employees" keyField="id" [virtualScroll]="true" [style.height.px]="height()">
  <oge-column field="firstName" caption="First name" />
  <oge-column field="city" caption="City" />
</oge-grid>`,
  body: `// the server renders the default height; the browser sizes it after hydration
readonly height = signal(400);

constructor() {
  afterNextRender(() => {
    this.height.set(Math.max(300, window.innerHeight - 200));
  });
}`,
});

export const ZONELESS = `// main.ts — Angular 22 bootstraps zoneless when zone.js is not loaded;
// leave "zone.js" out of the polyfills in angular.json and that is all
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((error) => console.error(error));`;

export const LOCALE = `// app.config.ts — server and browser must agree on the locale
import { ApplicationConfig, LOCALE_ID } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [{ provide: LOCALE_ID, useValue: 'de-DE' }],
};`;
