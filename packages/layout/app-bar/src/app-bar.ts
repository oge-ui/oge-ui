import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';
import {
  ogeAppBarAcceptsLabel,
  ogeAppBarRole,
  type OgeAppBarCenterAlign,
  type OgeAppBarColor,
  type OgeAppBarLandmark,
  type OgeAppBarPosition,
  type OgeAppBarPositionMode,
  type OgeAppBarSize,
} from '@oge-ui/behavior';
import { OGE_APP_BAR_CONFIG } from './config';

/**
 * A horizontal application bar with start / center / end sections — the
 * page header of an app shell, a bottom action bar on a phone:
 *
 * ```html
 * <oge-app-bar positionMode="sticky" landmark="banner" [elevated]="true">
 *   <button ogeAppBarStart type="button" aria-label="Open menu">☰</button>
 *   <h1>Inbox</h1>
 *   <button ogeAppBarEnd type="button">Sign out</button>
 * </oge-app-bar>
 * ```
 *
 * Unmarked content goes into the center section, which takes the remaining
 * width. `positionMode` `sticky` / `fixed` pins the bar to its `position`
 * edge and pads it with `env(safe-area-inset-*)` as a floor, so it clears a
 * notch or a home indicator when the app opts into `viewport-fit=cover`.
 *
 * The bar is chrome, not a widget: it adds no keyboard model, and its
 * controls stay in the normal Tab order (place an `oge-toolbar` inside for
 * the APG toolbar's single tab stop and arrow keys). A **landmark** is added
 * only on request — `landmark="banner"` for the page header,
 * `"contentinfo"` for a footer, `"navigation"` / `"region"` with an
 * `ariaLabel` for a named secondary bar — because banners must be unique
 * and top-level, so stamping one by default would produce duplicates in any
 * app that renders a bar inside a page header or a dialog.
 */
@Component({
  selector: 'oge-app-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-app-bar',
    '[class]': 'hostClasses()',
    '[attr.role]': 'role()',
    '[attr.aria-label]': 'resolvedLabel()',
  },
  template: `
    <div class="oge-app-bar-start">
      <ng-content select="[ogeAppBarStart]" />
    </div>
    <div
      class="oge-app-bar-center"
      [class.oge-app-bar-center-centered]="centerAlign() === 'center'"
    >
      <ng-content select="[ogeAppBarCenter]" />
      <ng-content />
    </div>
    <div class="oge-app-bar-end">
      <ng-content select="[ogeAppBarEnd]" />
    </div>
  `,
  styleUrl: './app-bar.scss',
})
export class OgeAppBar {
  private readonly config = inject(OGE_APP_BAR_CONFIG);

  /** Edge the bar belongs to. Default: config, else `top`. */
  readonly position = input<OgeAppBarPosition | undefined>(undefined);
  /**
   * `static` flows with the page, `sticky` sticks to its edge of the nearest
   * scroll container, `fixed` pins to the viewport. Default: config, else
   * `static`.
   */
  readonly positionMode = input<OgeAppBarPositionMode | undefined>(undefined);
  /** Surface colour. Default: config, else `default`. */
  readonly color = input<OgeAppBarColor | undefined>(undefined);
  /** Density preset — 48 / 56 / 64 px. Default: config, else `md`. */
  readonly size = input<OgeAppBarSize | undefined>(undefined);
  /** Draws a shadow on the bar's content edge. */
  readonly elevated = input(false);
  /** Landmark role the bar exposes; `none` (default) adds none. */
  readonly landmark = input<OgeAppBarLandmark>('none');
  /** Accessible name — written only when `landmark` is not `none`. */
  readonly ariaLabel = input<string | undefined>(undefined);
  /** Alignment of the center section's content. */
  readonly centerAlign = input<OgeAppBarCenterAlign>('start');

  protected readonly role = computed(() => ogeAppBarRole(this.landmark()));
  protected readonly resolvedLabel = computed(() =>
    ogeAppBarAcceptsLabel(this.landmark()) ? (this.ariaLabel() ?? null) : null,
  );

  protected readonly hostClasses = computed(() => {
    const position = this.position() ?? this.config.position ?? 'top';
    const mode = this.positionMode() ?? this.config.positionMode ?? 'static';
    const color = this.color() ?? this.config.color ?? 'default';
    const size = this.size() ?? this.config.size ?? 'md';
    return [
      `oge-app-bar-${position}`,
      `oge-app-bar-${mode}`,
      `oge-app-bar-color-${color}`,
      `oge-app-bar-${size}`,
      this.elevated() ? 'oge-app-bar-elevated' : '',
    ]
      .filter(Boolean)
      .join(' ');
  });
}
