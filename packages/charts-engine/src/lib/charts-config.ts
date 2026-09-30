/**
 * The charts' message catalog and configuration shape — single-sourced here so
 * the Angular `provideOgeChartsConfig()` and the React
 * `<OgeChartsConfigProvider>` resolve exactly the same defaults (ADR 0003).
 */

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

/** Configuration of every chart in scope (DI in Angular, context in React). */
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

/** What a provider accepts: every key optional, `messages` per block. */
export type OgeChartsConfigInput = Partial<
  Omit<OgeChartsConfig, 'messages'>
> & {
  messages?: Partial<OgeChartsMessages>;
};

/**
 * Merges a config input over `base` (the defaults, or an outer provider's
 * resolved config) — shallow per top-level key; a partial `messages` replaces
 * whole nested blocks.
 */
export function resolveOgeChartsConfig(
  config: OgeChartsConfigInput | undefined,
  base: OgeChartsConfig = OGE_DEFAULT_CHARTS_CONFIG,
): OgeChartsConfig {
  const { messages, ...rest } = config ?? {};
  return {
    ...base,
    ...rest,
    messages: { ...base.messages, ...messages },
  };
}

/**
 * A component's effective messages: its per-instance override over the
 * configured catalog, merged one level deeper (`aria` and `announcements`
 * key by key).
 */
export function mergeOgeChartsMessages(
  configured: OgeChartsMessages,
  override: Partial<OgeChartsMessages> | undefined,
): OgeChartsMessages {
  const local = override ?? {};
  return {
    ...configured,
    ...local,
    aria: { ...configured.aria, ...local.aria },
    announcements: { ...configured.announcements, ...local.announcements },
  };
}

/** Fills `{token}` placeholders (first occurrence each, like the templates). */
export function formatOgeChartMessage(
  template: string,
  tokens: Readonly<Record<string, string>>,
): string {
  let text = template;
  for (const [token, value] of Object.entries(tokens)) {
    text = text.replace(`{${token}}`, value);
  }
  return text;
}
