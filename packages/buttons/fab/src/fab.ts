import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import type {
  OgeFabClickEvent,
  OgeFabPosition,
  OgeFabPositionMode,
  OgeFabSeverity,
  OgeFabSize,
} from '@oge-ui/behavior';
import { OGE_FAB_CONFIG } from './config';

/**
 * A floating action button — the screen's one primary action, pinned to a
 * corner or an edge of the viewport (`positionMode="fixed"`, the default),
 * of the nearest positioned ancestor (`absolute`) or left in the flow
 * (`static`):
 *
 * ```html
 * <oge-fab label="New message" [icon]="plusPath" (clicked)="compose()" />
 * <oge-fab label="Compose" [extended]="true" position="bottom-center" />
 * ```
 *
 * Pinned edges keep `env(safe-area-inset-*)` as a floor under the
 * `--oge-fab-offset` gap, so the button never slides under a phone's home
 * indicator or notch. An icon-only FAB takes its accessible name from
 * `label`; `extended` shows the label as text beside the icon. Pass
 * `[icon]` as SVG path data, or project your own `aria-hidden` icon.
 */
@Component({
  selector: 'oge-fab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-fab oge-fab-layer',
    '[class]': 'hostClasses()',
    '[style.--oge-fab-offset]': 'offset() ?? null',
  },
  template: `
    <button
      #button
      type="button"
      class="oge-fab-button"
      [disabled]="disabled()"
      [attr.aria-label]="extended() ? null : label() || null"
      (click)="onClick($event)"
    >
      @if (icon(); as path) {
        <svg
          class="oge-fab-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path [attr.d]="path" />
        </svg>
      }
      <ng-content />
      @if (extended()) {
        <span class="oge-fab-label">{{ label() }}</span>
      }
    </button>
  `,
  styleUrl: './fab.scss',
})
export class OgeFab {
  private readonly config = inject(OGE_FAB_CONFIG);
  private readonly button =
    viewChild.required<ElementRef<HTMLButtonElement>>('button');

  /** Accessible name — and the visible text when `extended`. */
  readonly label = input('');
  /** SVG path data (`d`, 24×24 viewBox) of the icon; or project your own. */
  readonly icon = input<string | undefined>(undefined);
  /** Shows `label` beside the icon in a pill (Material's extended FAB). */
  readonly extended = input(false);
  /** Corner or edge the FAB is pinned to (logical: RTL mirrors). */
  readonly position = input<OgeFabPosition | undefined>(undefined);
  /** `fixed` (viewport), `absolute` (positioned ancestor) or `static` (flow). */
  readonly positionMode = input<OgeFabPositionMode | undefined>(undefined);
  /** 40 / 56 / 72 px. */
  readonly size = input<OgeFabSize | undefined>(undefined);
  /** Fill colour — the button severity vocabulary (default `accent`). */
  readonly severity = input<OgeFabSeverity | undefined>(undefined);
  /** Gap to the pinned edges (any CSS length); default `16px`. */
  readonly offset = input<string | undefined>(undefined);
  /** Disables the button. */
  readonly disabled = input(false);

  /** The FAB was pressed. */
  readonly clicked = output<OgeFabClickEvent>();

  protected readonly hostClasses = computed(() =>
    ogeFabLayerClasses({
      position: this.position() ?? this.config.position ?? 'bottom-end',
      positionMode: this.positionMode() ?? this.config.positionMode ?? 'fixed',
      size: this.size() ?? this.config.size ?? 'md',
      severity: this.severity() ?? this.config.severity ?? 'accent',
      extended: this.extended(),
    }),
  );

  /** Moves focus to the button. */
  focus(): void {
    this.button().nativeElement.focus();
  }

  protected onClick(event: MouseEvent): void {
    this.clicked.emit({ event });
  }
}

/** Host classes shared by `oge-fab` and `oge-speed-dial` (their positioning layer). */
export function ogeFabLayerClasses(state: {
  position: OgeFabPosition;
  positionMode: OgeFabPositionMode;
  size: OgeFabSize;
  severity: OgeFabSeverity;
  extended?: boolean;
}): string {
  return [
    `oge-fab-${state.positionMode}`,
    `oge-fab-position-${state.position}`,
    `oge-fab-size-${state.size}`,
    `oge-fab-severity-${state.severity}`,
    state.extended ? 'oge-fab-extended' : '',
  ]
    .filter(Boolean)
    .join(' ');
}
