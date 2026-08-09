import { InjectionToken, type Provider } from '@angular/core';

/**
 * Every user-facing string in the splitter — override globally via
 * `provideOgeSplitterConfig({ messages: {...} })` or per component via
 * `[messages]`.
 */
export interface OgeSplitterMessages {
  /**
   * Accessible name of a separator. `{{first}}` and `{{second}}` are replaced
   * with the 1-based indexes of the panes it sits between.
   */
  separator: string;
  /** Announced on a separator whose primary pane is collapsed. */
  collapsed: string;
  /** Title of the collapse grip on a collapsible pane's separator. */
  collapsePane: string;
  /** Title of the grip once the pane is collapsed. */
  expandPane: string;
  /** Shown in place of the panes when there are none to display. */
  noData: string;
}

export const OGE_DEFAULT_SPLITTER_MESSAGES: OgeSplitterMessages = {
  separator: 'Resize panes {{first}} and {{second}}',
  collapsed: 'collapsed',
  collapsePane: 'Collapse pane',
  expandPane: 'Expand pane',
  noData: 'No panes to display',
};

/** Application-wide defaults for the splitter. */
export interface OgeSplitterConfig {
  messages: OgeSplitterMessages;
  /** Default for the `separatorSize` input, in pixels. */
  separatorSize?: number;
  /** Default for the `step` input, in share points. */
  step?: number;
  /** Default for the `showCollapseGrips` input. */
  showCollapseGrips?: boolean;
}

export const OGE_DEFAULT_SPLITTER_CONFIG: OgeSplitterConfig = {
  messages: OGE_DEFAULT_SPLITTER_MESSAGES,
};

export const OGE_SPLITTER_CONFIG = new InjectionToken<OgeSplitterConfig>(
  'OGE_SPLITTER_CONFIG',
  {
    factory: () => OGE_DEFAULT_SPLITTER_CONFIG,
  },
);

export type OgeSplitterConfigInput = Partial<
  Omit<OgeSplitterConfig, 'messages'>
> & {
  messages?: Partial<OgeSplitterMessages>;
};

/**
 * Application- or component-scoped splitter defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeSplitterConfig({
 *     separatorSize: 8,
 *     messages: { collapsePane: 'Paneli daralt', expandPane: 'Paneli aç' },
 *   }),
 * ]
 * ```
 */
export function provideOgeSplitterConfig(
  config: OgeSplitterConfigInput,
): Provider {
  const { messages, ...rest } = config;
  return {
    provide: OGE_SPLITTER_CONFIG,
    useValue: {
      ...OGE_DEFAULT_SPLITTER_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_SPLITTER_MESSAGES, ...messages },
    } satisfies OgeSplitterConfig,
  };
}
