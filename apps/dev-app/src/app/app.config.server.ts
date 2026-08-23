import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import {
  provideServerRendering,
  RenderMode,
  ServerRoute,
  withRoutes,
} from '@angular/ssr';
import { appConfig } from './app.config';

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
  { providers: [provideServerRendering(withRoutes(serverRoutes))] },
);
