import { InjectionToken, type Provider } from '@angular/core';
import {
  OGE_DEFAULT_PIVOT_MESSAGES,
  type OgePivotMessages,
} from '@oge-ui/pivot-engine';

// The catalog and its defaults are framework-free and live in
// `@oge-ui/pivot-engine` (ADR 0003), so the React pivot reads the same copy;
// re-exported here because both are public API of `@oge-ui/pivot`.
export { OGE_DEFAULT_PIVOT_MESSAGES, type OgePivotMessages };

export const OGE_PIVOT_MESSAGES = new InjectionToken<OgePivotMessages>(
  'OGE_PIVOT_MESSAGES',
  {
    factory: () => OGE_DEFAULT_PIVOT_MESSAGES,
  },
);

/** Application- or component-scoped pivot message overrides (i18n). */
export function provideOgePivotMessages(
  messages: Partial<OgePivotMessages>,
): Provider {
  return {
    provide: OGE_PIVOT_MESSAGES,
    useValue: { ...OGE_DEFAULT_PIVOT_MESSAGES, ...messages },
  };
}
