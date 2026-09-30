import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  contentChild,
  inject,
  input,
} from '@angular/core';
import { OGE_CARD_CONFIG } from './config';
import { OgeCardAvatar, OgeCardHeaderActions } from './templates';
import type {
  OgeCardOrientation,
  OgeCardSeverity,
  OgeCardSize,
  OgeCardStylingMode,
} from './card-types';

/**
 * A content surface with optional header, media, action row and footer — one
 * component, not a sub-component trio: the sections are attribute slots
 * (`[ogeCardMedia]`, `[ogeCardActions]`, `[ogeCardFooter]`, `[ogeCardAvatar]`,
 * `[ogeCardHeaderActions]`) and everything else projected is the content.
 *
 * The card is deliberately non-interactive: there is no ARIA card pattern, so
 * it renders no role and never wraps itself in a link or button — nest one
 * primary `<a>`/`<button>` in the content instead, and add `role="article"`
 * or `role="region"` on the host yourself where the context calls for it.
 *
 * ```html
 * <oge-card header="Mountains" subheader="Alps, 2026" stylingMode="raised">
 *   <img ogeCardMedia src="alps.jpg" alt="" />
 *   <p>Four days above the tree line.</p>
 *   <div ogeCardActions align="end">
 *     <button type="button">Share</button>
 *   </div>
 * </oge-card>
 * ```
 */
@Component({
  selector: 'oge-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-card',
    '[class.oge-card-raised]': "stylingMode() === 'raised'",
    '[class.oge-card-filled]': "stylingMode() === 'filled'",
    '[class.oge-card-flat]': "stylingMode() === 'flat'",
    '[class.oge-card-horizontal]': "orientation() === 'horizontal'",
    '[class.oge-card-sm]': "size() === 'sm'",
    '[class.oge-card-lg]': "size() === 'lg'",
    '[class.oge-card-interactive]': 'interactive()',
    '[class.oge-card-loading]': 'loading()',
    '[class.oge-card-severity-accent]': "severity() === 'accent'",
    '[class.oge-card-severity-success]': "severity() === 'success'",
    '[class.oge-card-severity-warning]': "severity() === 'warning'",
    '[class.oge-card-severity-danger]': "severity() === 'danger'",
    '[attr.aria-busy]': 'loading() ? true : null',
  },
  styleUrl: './card.scss',
  template: `
    @if (hasHeader()) {
      <div class="oge-card-header">
        <ng-content select="[ogeCardAvatar]" />
        @if (header() || subheader()) {
          <div class="oge-card-titles">
            @if (header()) {
              <div class="oge-card-title">{{ header() }}</div>
            }
            @if (subheader()) {
              <div class="oge-card-subtitle">{{ subheader() }}</div>
            }
          </div>
        }
        <ng-content select="[ogeCardHeaderActions]" />
      </div>
    }
    <ng-content select="[ogeCardMedia]" />
    @if (loading()) {
      <div class="oge-card-skeleton" aria-hidden="true">
        <div class="oge-card-skeleton-line"></div>
        <div class="oge-card-skeleton-line"></div>
        <div class="oge-card-skeleton-line"></div>
      </div>
    } @else {
      <div class="oge-card-content"><ng-content /></div>
      <ng-content select="[ogeCardActions]" />
    }
    <ng-content select="[ogeCardFooter]" />
  `,
})
export class OgeCard {
  private readonly config = inject(OGE_CARD_CONFIG);

  /**
   * Header title. Named after the PrimeNG input rather than `title` — a
   * static `title` attribute would double as a native tooltip.
   */
  readonly header = input<string | undefined>(undefined);

  /** Line rendered under `header` in the muted color. */
  readonly subheader = input<string | undefined>(undefined);

  /**
   * Chrome preset: `outlined` (border, the default), `raised` (shadow),
   * `filled` (tinted surface) or `flat` (no chrome — for a card nested in
   * another surface).
   */
  readonly stylingMode = input<OgeCardStylingMode>(
    this.config.stylingMode ?? 'outlined',
  );

  /**
   * `horizontal` turns the card into a two-column grid with the
   * `[ogeCardMedia]` element spanning the inline-start column.
   */
  readonly orientation = input<OgeCardOrientation>(
    this.config.orientation ?? 'vertical',
  );

  /** Density preset — scales the section padding and type ramp together. */
  readonly size = input<OgeCardSize>(this.config.size ?? 'md');

  /**
   * Colored rail on the inline-start edge for status cards — the toast's rail
   * idiom on a static surface. `undefined` renders no rail.
   */
  readonly severity = input<OgeCardSeverity | undefined>(undefined);

  /**
   * Purely visual affordance for the documented clickable-card pattern: a
   * hover/focus-within lift and a keyboard focus ring on the surface. It adds
   * **no** role, tabindex or wrapper — pair it with one primary `<a>` in the
   * content whose hit area you stretch with CSS.
   */
  readonly interactive = input(false);

  /**
   * Replaces the content and action row with a shimmer skeleton and marks the
   * card `aria-busy`. Header, media and footer stay, so the card keeps its
   * footprint while the data arrives.
   */
  readonly loading = input(false);

  // Presence queries mirror the projection semantics exactly: `descendants:
  // false` matches only direct content children, same as `ng-content select`,
  // so a nested card's slots never leak into this card's header.
  private readonly avatar = contentChild(OgeCardAvatar, { descendants: false });
  private readonly headerActions = contentChild(OgeCardHeaderActions, {
    descendants: false,
  });

  /** The header row only renders when it would have something to show. */
  protected readonly hasHeader = computed(
    () =>
      !!this.header() ||
      !!this.subheader() ||
      !!this.avatar() ||
      !!this.headerActions(),
  );
}
