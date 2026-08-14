/**
 * The framework-free half of the layout family's presentational members
 * (ADR 0001): the vocabularies, the message catalogs and the config merge
 * rules for the card, the progress bar, the load indicator and the skeleton.
 * Both render layers resolve their defaults through these, so a default
 * changed here changes both layers at once.
 *
 * The interactive members of the family — accordion, splitter, toolbar —
 * carry enough state machinery to deserve their own modules.
 */

// --- card ------------------------------------------------------------------

/** Container chrome preset. `raised` swaps the border for `--oge-shadow-card`. */
export type OgeCardStylingMode = 'outlined' | 'raised' | 'filled' | 'flat';

/**
 * Section flow. `horizontal` moves the media element to the inline-start
 * column, spanning every other section.
 */
export type OgeCardOrientation = 'vertical' | 'horizontal';

/** Density preset — scales the section padding and type ramp together. */
export type OgeCardSize = 'sm' | 'md' | 'lg';

/**
 * Status rail on the inline-start edge — the toast's rail idiom on a static
 * surface.
 */
export type OgeCardSeverity = 'accent' | 'success' | 'warning' | 'danger';

/** Justification of the card's actions row. */
export type OgeCardActionsAlign = 'start' | 'center' | 'end' | 'stretched';

/**
 * Application-wide defaults for the card. There is deliberately no `messages`
 * block: the card renders no user-facing strings and no interactive chrome of
 * its own. The moment one appears it must move into a messages interface, per
 * the house i18n rule.
 */
export interface OgeCardConfig {
  /** Default for the `stylingMode` input. */
  stylingMode?: OgeCardStylingMode;
  /** Default for the `orientation` input. */
  orientation?: OgeCardOrientation;
  /** Default for the `size` input. */
  size?: OgeCardSize;
}

export const OGE_DEFAULT_CARD_CONFIG: OgeCardConfig = {};

export type OgeCardConfigInput = Partial<OgeCardConfig>;

export function resolveOgeCardConfig(
  input: OgeCardConfigInput | undefined,
): OgeCardConfig {
  return { ...OGE_DEFAULT_CARD_CONFIG, ...input };
}

// --- progress bar ----------------------------------------------------------

/** Fill color of the bar — the card/toast severity vocabulary. */
export type OgeProgressBarSeverity =
  'accent' | 'success' | 'warning' | 'danger';

/** The value reached `max` — fired once per completion (dx `onComplete`). */
export interface OgeProgressBarCompletedEvent {
  value: number;
}

/** Every user-facing string the progress bar renders, including aria labels. */
export interface OgeProgressBarMessages {
  /** Accessible name of the bar when the application supplies none. */
  progress: string;
}

export const OGE_DEFAULT_PROGRESS_BAR_MESSAGES: OgeProgressBarMessages = {
  progress: 'Progress',
};

export interface OgeProgressBarConfig {
  messages: OgeProgressBarMessages;
  /** Default for the `severity` input. */
  severity?: OgeProgressBarSeverity;
  /** Default for the `showLabel` input. */
  showLabel?: boolean;
}

export const OGE_DEFAULT_PROGRESS_BAR_CONFIG: OgeProgressBarConfig = {
  messages: OGE_DEFAULT_PROGRESS_BAR_MESSAGES,
};

export type OgeProgressBarConfigInput = Partial<
  Omit<OgeProgressBarConfig, 'messages'>
> & {
  messages?: Partial<OgeProgressBarMessages>;
};

export function resolveOgeProgressBarConfig(
  input: OgeProgressBarConfigInput | undefined,
): OgeProgressBarConfig {
  return {
    ...OGE_DEFAULT_PROGRESS_BAR_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_PROGRESS_BAR_MESSAGES, ...input?.messages },
  };
}

// --- load indicator --------------------------------------------------------

/** Every user-facing string the load indicator renders (aria labels). */
export interface OgeLoadIndicatorMessages {
  /** Accessible name when the application supplies none. */
  loading: string;
}

export const OGE_DEFAULT_LOAD_INDICATOR_MESSAGES: OgeLoadIndicatorMessages = {
  loading: 'Loading',
};

export interface OgeLoadIndicatorConfig {
  messages: OgeLoadIndicatorMessages;
}

export const OGE_DEFAULT_LOAD_INDICATOR_CONFIG: OgeLoadIndicatorConfig = {
  messages: OGE_DEFAULT_LOAD_INDICATOR_MESSAGES,
};

export type OgeLoadIndicatorConfigInput = {
  messages?: Partial<OgeLoadIndicatorMessages>;
};

export function resolveOgeLoadIndicatorConfig(
  input: OgeLoadIndicatorConfigInput | undefined,
): OgeLoadIndicatorConfig {
  return {
    ...OGE_DEFAULT_LOAD_INDICATOR_CONFIG,
    messages: { ...OGE_DEFAULT_LOAD_INDICATOR_MESSAGES, ...input?.messages },
  };
}

// --- skeleton --------------------------------------------------------------

/** What the placeholder stands in for. */
export type OgeSkeletonShape = 'text' | 'circle' | 'rectangle';

/**
 * `'shimmer'` is the card/accordion moving-gradient recipe, `'pulse'` the
 * grid filler rows' opacity beat, `'none'` a static block.
 */
export type OgeSkeletonAnimation = 'shimmer' | 'pulse' | 'none';

/**
 * Application-wide defaults for the skeleton. There is deliberately no
 * `messages` block: a skeleton is `aria-hidden` decoration and renders no
 * user-facing strings — the loading REGION owns the announcement
 * (`aria-busy` plus a visually-hidden status text). The moment a string
 * appears here it must move into a messages interface, per the house i18n
 * rule.
 */
export interface OgeSkeletonConfig {
  /** Default for the `shape` input. */
  shape?: OgeSkeletonShape;
  /** Default for the `animation` input. */
  animation?: OgeSkeletonAnimation;
}

export const OGE_DEFAULT_SKELETON_CONFIG: OgeSkeletonConfig = {};

export type OgeSkeletonConfigInput = Partial<OgeSkeletonConfig>;

export function resolveOgeSkeletonConfig(
  input: OgeSkeletonConfigInput | undefined,
): OgeSkeletonConfig {
  return { ...OGE_DEFAULT_SKELETON_CONFIG, ...input };
}
