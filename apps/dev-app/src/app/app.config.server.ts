import {
  ApplicationConfig,
  DOCUMENT,
  inject,
  mergeApplicationConfig,
} from '@angular/core';
import { BEFORE_APP_SERIALIZED } from '@angular/platform-server';
import {
  provideServerRendering,
  RenderMode,
  ServerRoute,
  withRoutes,
} from '@angular/ssr';
import { appConfig } from './app.config';
import { prepareReplayScripts } from './event-replay-script';

/**
 * Every route is prerendered at build time (`outputMode: "static"` in
 * project.json). Routes are discovered from `app.routes.ts`, so a new page
 * needs no registration here — the sitemap and the prerender list share the
 * same source of truth.
 */
const serverRoutes: ServerRoute[] = [
  { path: '**', renderMode: RenderMode.Prerender },
];

export const serverConfig: ApplicationConfig = mergeApplicationConfig(
  appConfig,
  {
    providers: [
      provideServerRendering(withRoutes(serverRoutes)),
      // folds the event-replay bootstrap call into the contract script: keeps
      // body-relative hydration paths valid (NG0509) and gives the static CSP
      // a single hash for every page (see event-replay-script.ts)
      {
        provide: BEFORE_APP_SERIALIZED,
        useFactory: () => {
          const doc = inject(DOCUMENT);
          return () => prepareReplayScripts(doc);
        },
        multi: true,
      },
    ],
  },
);
