import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import {
  OGE_PART_OWNED_ATTRIBUTES,
  OgeAdaptiveSheetCore,
  ogeApplyAttributes,
  ogeClassNames,
  ogeSafeAttributes,
  type OgeAdaptivePresentation,
  type OgeClassValue,
  type OgeHtmlAttributes,
} from '@oge-ui/behavior';
import type { OgeAnchoredPanel } from '../panel/anchored-panel';

let nextSheetTitleId = 0;

/**
 * Presentational chrome for an anchored panel: fixed positioning, popup
 * surface tokens and the panel's generated id. The owner renders it inline
 * behind an `@if (panel.isOpen())` and projects arbitrary content:
 *
 * ```html
 * @if (panel.isOpen()) {
 *   <oge-popup [panel]="panel">…content…</oge-popup>
 * }
 * ```
 *
 * With `adaptive` set to `'sheet'` or `'fullscreen'` the same content is
 * presented as a modal bottom sheet / full-screen dialog instead: a titled
 * `role="dialog"` surface with a close button, scroll lock, inert
 * background, a Tab trap and focus restore (`OgeAdaptiveSheetCore`). Content
 * marked `[ogePopupSheetHeader]` renders under the title (a search field),
 * `[ogePopupSheetFooter]` pinned at the bottom (a Done action); both are
 * projected only while adaptive matters to the owner.
 *
 * `panelClass` and `panelAttributes` put the consumer's own classes and
 * attributes (`data-testid`, `aria-describedby`…) on the panel element; the
 * attribute bag goes through `ogeSafeAttributes`, so event handlers and
 * script URLs are never written.
 */
@Component({
  selector: 'oge-popup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-popup',
    '[class]': 'panelClassText()',
    '[id]': 'panel().panelId',
    '[class.oge-popup-adaptive]': 'isAdaptive()',
    '[class.oge-popup-adaptive-sheet]': "adaptive() === 'sheet'",
    '[class.oge-popup-adaptive-fullscreen]': "adaptive() === 'fullscreen'",
    '[style.top.px]': 'isAdaptive() ? null : (panel().position()?.top ?? 0)',
    '[style.left.px]': 'isAdaptive() ? null : (panel().position()?.left ?? 0)',
    '[style.width.px]':
      'isAdaptive() ? null : (panel().position()?.width ?? null)',
    // Transparent until the first measure so the panel never flashes at
    // (0,0) — opacity (not visibility) keeps the subtree focusable. The
    // ready class then plays the fade/scale entrance from that state. An
    // adaptive surface is not anchored and shows at once.
    '[style.opacity]': "isAdaptive() || panel().position() ? null : '0'",
    '[class.oge-popup-ready]': 'isAdaptive() || panel().position() !== null',
    '[attr.data-placement]':
      'isAdaptive() ? null : (panel().position()?.placement ?? null)',
  },
  styleUrl: './popup.scss',
  template: `
    <div
      class="oge-popup-sheet"
      [attr.role]="isAdaptive() ? 'dialog' : null"
      [attr.aria-modal]="isAdaptive() ? 'true' : null"
      [attr.aria-labelledby]="isAdaptive() ? titleId : null"
    >
      @if (isAdaptive()) {
        <div class="oge-popup-sheet-header">
          @if (adaptive() === 'sheet') {
            <div class="oge-popup-sheet-handle" aria-hidden="true"></div>
          }
          <h2 class="oge-popup-sheet-title" [id]="titleId">
            {{ adaptiveTitle() }}
          </h2>
          <button
            type="button"
            class="oge-popup-sheet-close"
            [attr.aria-label]="closeLabel() || null"
            [attr.title]="closeLabel() || null"
            (click)="dismiss()"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                fill="none"
              />
            </svg>
          </button>
        </div>
      }
      <ng-content select="[ogePopupSheetHeader]" />
      <div class="oge-popup-sheet-body"><ng-content /></div>
      <ng-content select="[ogePopupSheetFooter]" />
    </div>
  `,
})
export class OgePopup {
  /** The anchored-panel model driving id, position and visibility. */
  readonly panel = input.required<OgeAnchoredPanel>();
  /**
   * Presentation: anchored (`'popup'`, the default), a modal bottom sheet
   * (`'sheet'`) or a full-screen dialog (`'fullscreen'`). Popup editors
   * resolve it from their `adaptiveMode` / `adaptiveBreakpoint`.
   */
  readonly adaptive = input<OgeAdaptivePresentation>('popup');
  /** Dialog title while adaptive — editors pass their field label. */
  readonly adaptiveTitle = input('');
  /** Aria label of the adaptive close (✕) button — from the owner's messages. */
  readonly closeLabel = input('');
  /** Extra classes on the panel element, next to `oge-popup`. */
  readonly panelClass = input<OgeClassValue>();
  /**
   * Extra attributes on the panel element. Event handlers, `style`, `class`,
   * unsafe URLs and the attributes the panel sets itself (`id`, `popover`,
   * `data-placement`) are left out.
   */
  readonly panelAttributes = input<OgeHtmlAttributes>();

  protected readonly panelClassText = computed(() =>
    ogeClassNames(this.panelClass()),
  );

  protected readonly titleId = `oge-popup-sheet-title-${nextSheetTitleId++}`;
  protected readonly isAdaptive = computed(() => this.adaptive() !== 'popup');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly sheet = new OgeAdaptiveSheetCore({
    element: () => this.host.nativeElement,
    onDismiss: () => this.dismiss(),
  });

  private appliedAttributes: readonly string[] = [];

  constructor() {
    effect(() => {
      this.appliedAttributes = ogeApplyAttributes(
        this.host.nativeElement,
        ogeSafeAttributes(
          this.panelAttributes(),
          OGE_PART_OWNED_ATTRIBUTES.popup,
        ),
        this.appliedAttributes,
      );
    });
    afterRenderEffect(() => {
      if (this.isAdaptive()) this.sheet.activate();
      else this.sheet.deactivate();
    });
    inject(DestroyRef).onDestroy(() => this.sheet.destroy());
  }

  /** Closes the panel the way Escape would (focus returns to the field). */
  protected dismiss(): void {
    this.panel().close('escape');
  }
}
