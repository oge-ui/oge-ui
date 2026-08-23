import { InjectionToken, type Provider } from '@angular/core';
import {
  OGE_DEFAULT_FORMS_CONFIG,
  OGE_DEFAULT_FORMS_MESSAGES,
  resolveOgeFormsConfig,
  type OgeFormsConfig,
  type OgeFormsConfigInput,
  type OgeFormsMessages,
} from '@oge-ui/behavior';

/**
 * The forms family's strings and defaults live in `@oge-ui/behavior` so both
 * render layers read the same table (ADR 0001); this file is the Angular
 * binding — the injection token and the provider — over them.
 */
export {
  OGE_DEFAULT_FORMS_CONFIG,
  OGE_DEFAULT_FORMS_MESSAGES,
  type OgeFormsConfig,
  type OgeFormsConfigInput,
  type OgeFormsMessages,
};

export const OGE_FORMS_CONFIG = new InjectionToken<OgeFormsConfig>(
  'OGE_FORMS_CONFIG',
  {
    factory: () => OGE_DEFAULT_FORMS_CONFIG,
  },
);

/**
 * Application-wide forms defaults. Message overrides are shallow-merged over
 * the built-in English strings, so partial translations are fine.
 */
export function provideOgeFormsConfig(config: OgeFormsConfigInput): Provider {
  return {
    provide: OGE_FORMS_CONFIG,
    useValue: resolveOgeFormsConfig(config),
  };
}
