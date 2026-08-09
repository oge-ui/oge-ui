/** Container chrome preset. `raised` swaps the border for `--oge-shadow-card`. */
export type OgeCardStylingMode = 'outlined' | 'raised' | 'filled' | 'flat';

/**
 * Section flow. `horizontal` moves the `[ogeCardMedia]` element to the
 * inline-start column, spanning every other section.
 */
export type OgeCardOrientation = 'vertical' | 'horizontal';

/** Density preset — scales the section padding and type ramp together. */
export type OgeCardSize = 'sm' | 'md' | 'lg';

/**
 * Status rail on the inline-start edge — the toast's rail idiom on a static
 * surface.
 */
export type OgeCardSeverity = 'accent' | 'success' | 'warning' | 'danger';

/** Justification of the `[ogeCardActions]` row. */
export type OgeCardActionsAlign = 'start' | 'center' | 'end' | 'stretched';
