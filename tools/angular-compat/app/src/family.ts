import type { EnvironmentProviders, Provider, Type } from '@angular/core';

/**
 * A family's host, as `apps/ssr-smoke` writes it (its `render.ts` type, here
 * without the server rendering that type sits beside).
 */
export interface SsrFamily {
  readonly name: string;
  readonly host: Type<unknown>;
  readonly providers?: readonly (Provider | EnvironmentProviders)[];
  /** Strings the family's components must have put in the markup. */
  readonly expect: readonly string[];
  /** Server-rendered elements the browser must adopt (SSR only; unused here). */
  readonly survives?: readonly string[];
}
