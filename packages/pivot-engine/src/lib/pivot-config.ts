/**
 * Application-wide pivot grid defaults, shared by both render layers
 * (ADR 0003): Angular's `provideOgePivotConfig()` and React's
 * `<OgePivotConfigProvider>` resolve against this object. The message
 * catalog keeps its own providers (`provideOgePivotMessages()` /
 * `<OgePivotMessagesProvider>`).
 */
export interface OgePivotConfig {
  /**
   * BCP 47 locale of every pivot grid's cell text — percentages
   * (`summaryDisplayMode: 'percent…'`), dates and declarative field
   * `format`s. `undefined` = the app locale (Angular `LOCALE_ID`;
   * `navigator.language` in React). A grid's own `locale` input / prop wins.
   */
  readonly locale: string | undefined;
}

export const OGE_DEFAULT_PIVOT_CONFIG: OgePivotConfig = {
  locale: undefined,
};

/** What `provideOgePivotConfig()` / `<OgePivotConfigProvider>` accept. */
export type OgePivotConfigInput = Partial<OgePivotConfig>;

/** Merges an override onto the defaults. */
export function resolveOgePivotConfig(
  input: OgePivotConfigInput | undefined,
): OgePivotConfig {
  return { ...OGE_DEFAULT_PIVOT_CONFIG, ...input };
}
