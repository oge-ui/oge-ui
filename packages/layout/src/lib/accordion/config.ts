import { InjectionToken, type Provider } from '@angular/core';

/**
 * Every user-facing string in the accordion — override globally via
 * `provideOgeAccordionConfig({ messages: {...} })` or per component via
 * `[messages]`.
 */
export interface OgeAccordionMessages {
  /** Announced after the title of a panel flagged `invalid`. */
  invalidSection: string;
  /** Announced while an `expandGuard` promise is in flight. */
  pending: string;
  /** Shown while a panel's `contentLoader` is running. */
  loadingContent: string;
  /** Shown when a panel's `contentLoader` rejected. */
  contentLoadFailed: string;
  /** Label of the retry button on a failed content load. */
  retry: string;
  /** Shown in place of the panels when there are no visible items. */
  noData: string;
}

export const OGE_DEFAULT_ACCORDION_MESSAGES: OgeAccordionMessages = {
  invalidSection: 'section has errors',
  pending: 'working',
  loadingContent: 'Loading…',
  contentLoadFailed: 'Could not load this section.',
  retry: 'Retry',
  noData: 'No sections to display',
};

/** Application-wide defaults for the accordion. */
export interface OgeAccordionConfig {
  messages: OgeAccordionMessages;
  /** Default for the `hideToggle` input. */
  hideToggle?: boolean;
  /** Default for the `collapsedHeaderHeight` input (any CSS length). */
  collapsedHeaderHeight?: string;
  /** Default for the `expandedHeaderHeight` input (any CSS length). */
  expandedHeaderHeight?: string;
}

export const OGE_DEFAULT_ACCORDION_CONFIG: OgeAccordionConfig = {
  messages: OGE_DEFAULT_ACCORDION_MESSAGES,
};

export const OGE_ACCORDION_CONFIG = new InjectionToken<OgeAccordionConfig>(
  'OGE_ACCORDION_CONFIG',
  {
    factory: () => OGE_DEFAULT_ACCORDION_CONFIG,
  },
);

export type OgeAccordionConfigInput = Partial<
  Omit<OgeAccordionConfig, 'messages'>
> & {
  messages?: Partial<OgeAccordionMessages>;
};

/**
 * Application- or component-scoped accordion defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeAccordionConfig({
 *     messages: { contentLoadFailed: 'Bu bölüm yüklenemedi.', retry: 'Yeniden dene' },
 *   }),
 * ]
 * ```
 */
export function provideOgeAccordionConfig(
  config: OgeAccordionConfigInput,
): Provider {
  const { messages, ...rest } = config;
  return {
    provide: OGE_ACCORDION_CONFIG,
    useValue: {
      ...OGE_DEFAULT_ACCORDION_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_ACCORDION_MESSAGES, ...messages },
    } satisfies OgeAccordionConfig,
  };
}
