import { InjectionToken, type Provider } from '@angular/core';

/** Aria strings; `{token}` placeholders formatted at render. */
export interface OgeChartsAriaMessages {
  /** SVG root label; `{title}`, `{count}` (series). */
  readonly chartLabel: string;
  /** Pie SVG root label; `{title}`, `{count}` (slices). */
  readonly pieLabel: string;
  /** Screen-reader data table caption. */
  readonly tableCaption: string;
  /** First column header of the sr table (arguments). */
  readonly argumentHeader: string;
  /** Focusable plot region hint for keyboard users. */
  readonly plotHint: string;
  /** Legend list label. */
  readonly legendLabel: string;
  /** Range-selector start handle label. */
  readonly rangeStart: string;
  /** Range-selector end handle label. */
  readonly rangeEnd: string;
  /** Range-selector window label. */
  readonly rangeWindow: string;
}

/** Live-region announcement templates. */
export interface OgeChartsAnnouncementMessages {
  /** Crosshair moved; `{series}`, `{argument}`, `{value}`. */
  readonly point: string;
  readonly seriesHidden: string;
  readonly seriesShown: string;
  readonly zoomed: string;
  readonly zoomReset: string;
  /** Point selected; `{series}`, `{argument}`. */
  readonly selected: string;
}

/** Every user-facing string of the charts (house i18n rule). */
export interface OgeChartsMessages {
  readonly aria: OgeChartsAriaMessages;
  readonly announcements: OgeChartsAnnouncementMessages;
  readonly noData: string;
}

export const OGE_DEFAULT_CHARTS_MESSAGES: OgeChartsMessages = {
  aria: {
    chartLabel: '{title} chart with {count} series',
    pieLabel: '{title} pie chart with {count} slices',
    tableCaption: 'Chart data',
    argumentHeader: 'Argument',
    plotHint: 'Use arrow keys to inspect points, Enter to select',
    legendLabel: 'Chart legend',
    rangeStart: 'Range start',
    rangeEnd: 'Range end',
    rangeWindow: 'Selected range',
  },
  announcements: {
    point: '{series}, {argument}: {value}',
    seriesHidden: '{series} hidden',
    seriesShown: '{series} shown',
    zoomed: 'Zoomed',
    zoomReset: 'Zoom reset',
    selected: '{series}, {argument} selected',
  },
  noData: 'No data',
};

/** DI-level configuration of every chart in the injector's scope. */
export interface OgeChartsConfig {
  readonly messages: OgeChartsMessages;
  /** BCP 47 locale for every `Intl` format; unset = the browser locale. */
  readonly locale?: string;
  /** Rows of the screen-reader data table. */
  readonly a11yTableLimit?: number;
  /** Marker circles render only up to this many points per series. */
  readonly markerThreshold?: number;
}

export const OGE_DEFAULT_CHARTS_CONFIG: OgeChartsConfig = {
  messages: OGE_DEFAULT_CHARTS_MESSAGES,
  a11yTableLimit: 50,
  markerThreshold: 200,
};

export const OGE_CHARTS_CONFIG = new InjectionToken<OgeChartsConfig>(
  'OGE_CHARTS_CONFIG',
  { factory: () => OGE_DEFAULT_CHARTS_CONFIG },
);

export type OgeChartsConfigInput = Partial<
  Omit<OgeChartsConfig, 'messages'>
> & {
  messages?: Partial<OgeChartsMessages>;
};

/**
 * Configures every chart below the provider; shallow merge per top-level
 * key (a partial `messages` replaces whole nested blocks).
 */
export function provideOgeChartsConfig(config: OgeChartsConfigInput): Provider {
  const { messages, ...rest } = config;
  return {
    provide: OGE_CHARTS_CONFIG,
    useValue: {
      ...OGE_DEFAULT_CHARTS_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_CHARTS_MESSAGES, ...messages },
    } satisfies OgeChartsConfig,
  };
}
