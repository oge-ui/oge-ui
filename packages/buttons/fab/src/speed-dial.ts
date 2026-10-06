import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  viewChild,
  viewChildren,
} from '@angular/core';
import {
  OGE_FAB_PLUS_PATH,
  ogeIsRtl,
  ogeSpeedDialDirection,
  ogeSpeedDialItemKey,
  ogeSpeedDialNavIndex,
  ogeSpeedDialToggleKey,
  ogeSpeedDialVertical,
  type OgeFabPosition,
  type OgeFabPositionMode,
  type OgeFabSeverity,
  type OgeFabSize,
  type OgeSpeedDialDirection,
  type OgeSpeedDialItem,
  type OgeSpeedDialItemClickEvent,
  type OgeSpeedDialLabelMode,
  type OgeSpeedDialOpenMode,
} from '@oge-ui/behavior';
import { OGE_FAB_CONFIG } from './config';
import { ogeFabLayerClasses } from './fab';

let nextId = 0;

/**
 * A floating action button that unfolds a short list of related actions —
 * the WAI-ARIA APG **menu button** pattern on a FAB:
 *
 * ```html
 * <oge-speed-dial
 *   label="Create"
 *   [items]="[
 *     { key: 'doc', label: 'Document', icon: docPath },
 *     { key: 'sheet', label: 'Spreadsheet', icon: sheetPath },
 *   ]"
 *   (itemClick)="create($event.item.key)"
 * />
 * ```
 *
 * The FAB is a `<button aria-haspopup="menu" aria-expanded>`; the actions
 * are `role="menuitem"`s. Opening moves focus to the action nearest the
 * FAB; the arrows along the dial's axis move and wrap, Home/End jump,
 * Escape closes and returns focus to the FAB, Tab closes and lets focus
 * move on, and a press outside closes it. Each action's `label` is its
 * accessible name and its tooltip-style text (`labelMode`).
 */
@Component({
  selector: 'oge-speed-dial',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-speed-dial oge-fab-layer',
    '[class]': 'hostClasses()',
    '[style.--oge-fab-offset]': 'offset() ?? null',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
  },
  template: `
    <button
      #toggle
      type="button"
      class="oge-fab-button oge-speed-dial-toggle"
      aria-haspopup="menu"
      [attr.aria-expanded]="opened()"
      [attr.aria-controls]="opened() ? menuId : null"
      [attr.aria-label]="label() || msg().speedDial"
      [disabled]="disabled()"
      (click)="onToggleClick()"
      (keydown)="onToggleKeydown($event)"
    >
      <svg
        class="oge-fab-icon oge-speed-dial-icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path [attr.d]="icon() ?? plusPath" />
      </svg>
    </button>
    @if (opened()) {
      <div
        class="oge-speed-dial-menu"
        role="menu"
        [id]="menuId"
        [attr.aria-label]="label() || msg().speedDial"
        [attr.aria-orientation]="vertical() ? 'vertical' : 'horizontal'"
      >
        @for (item of items(); track item.key; let i = $index) {
          <button
            #action
            type="button"
            role="menuitem"
            tabindex="-1"
            class="oge-speed-dial-action"
            [class.oge-speed-dial-action-disabled]="item.disabled"
            [class]="
              item.severity ? 'oge-speed-dial-action-' + item.severity : ''
            "
            [attr.aria-disabled]="item.disabled ? 'true' : null"
            [style.--oge-speed-dial-index]="i"
            (click)="onItemClick(item, i, $event)"
            (keydown)="onItemKeydown($event, i)"
          >
            @if (item.icon) {
              <svg
                class="oge-speed-dial-action-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path [attr.d]="item.icon" />
              </svg>
            }
            <span class="oge-speed-dial-label">{{ item.label }}</span>
          </button>
        }
      </div>
    }
  `,
  styleUrl: './fab.scss',
})
export class OgeSpeedDial {
  private readonly config = inject(OGE_FAB_CONFIG);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly toggleButton =
    viewChild.required<ElementRef<HTMLButtonElement>>('toggle');
  private readonly actions =
    viewChildren<ElementRef<HTMLButtonElement>>('action');

  /** The actions, nearest the FAB first. */
  readonly items = input<readonly OgeSpeedDialItem[]>([]);
  /** Accessible name of the FAB and the menu; fallback `messages.speedDial`. */
  readonly label = input<string | undefined>(undefined);
  /** SVG path data of the FAB glyph; default a plus that turns to ✕ open. */
  readonly icon = input<string | undefined>(undefined);
  /** Unfold direction; default away from the pinned edge (up from a bottom FAB). */
  readonly direction = input<OgeSpeedDialDirection | undefined>(undefined);
  /** Corner or edge the FAB is pinned to (logical: RTL mirrors). */
  readonly position = input<OgeFabPosition | undefined>(undefined);
  /** `fixed` (viewport), `absolute` (positioned ancestor) or `static` (flow). */
  readonly positionMode = input<OgeFabPositionMode | undefined>(undefined);
  /** 40 / 56 / 72 px. */
  readonly size = input<OgeFabSize | undefined>(undefined);
  /** FAB colour — the button severity vocabulary (default `accent`). */
  readonly severity = input<OgeFabSeverity | undefined>(undefined);
  /** Gap to the pinned edges (any CSS length); default `16px`. */
  readonly offset = input<string | undefined>(undefined);
  /** `click` toggles on press; `hover` also opens while a mouse hovers it. */
  readonly openMode = input<OgeSpeedDialOpenMode>('click');
  /** Action labels: beside the hovered/focused action, every action, or never. */
  readonly labelMode = input<OgeSpeedDialLabelMode>('hover');
  /** Disables the FAB (and so the dial). */
  readonly disabled = input(false);
  /** Whether the actions are shown — two-way (`[(opened)]`). */
  readonly opened = model(false);

  /** An action was activated (click, Enter or Space); the dial then closes. */
  readonly itemClick = output<OgeSpeedDialItemClickEvent>();

  protected readonly plusPath = OGE_FAB_PLUS_PATH;
  protected readonly menuId = `oge-speed-dial-${nextId++}-menu`;
  protected readonly msg = computed(() => this.config.messages);
  private readonly resolvedPosition = computed<OgeFabPosition>(
    () => this.position() ?? this.config.position ?? 'bottom-end',
  );
  protected readonly resolvedDirection = computed(() =>
    ogeSpeedDialDirection(this.resolvedPosition(), this.direction()),
  );
  protected readonly vertical = computed(() =>
    ogeSpeedDialVertical(this.resolvedDirection()),
  );

  protected readonly hostClasses = computed(() =>
    [
      ogeFabLayerClasses({
        position: this.resolvedPosition(),
        positionMode:
          this.positionMode() ?? this.config.positionMode ?? 'fixed',
        size: this.size() ?? this.config.size ?? 'md',
        severity: this.severity() ?? this.config.severity ?? 'accent',
      }),
      `oge-speed-dial-${this.resolvedDirection()}`,
      `oge-speed-dial-labels-${this.labelMode()}`,
      // labels sit on the side away from the screen edge
      this.resolvedPosition().endsWith('start')
        ? 'oge-speed-dial-labels-after'
        : 'oge-speed-dial-labels-before',
      this.resolvedPosition().startsWith('top')
        ? 'oge-speed-dial-labels-below'
        : 'oge-speed-dial-labels-above',
      this.opened() ? 'oge-speed-dial-open' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );

  private hoverOpened = false;

  constructor() {
    // a press outside closes the dial — listener only while open, SSR-safe
    effect((onCleanup) => {
      if (!this.opened() || typeof document === 'undefined') return;
      const onDown = (event: PointerEvent): void => {
        if (!this.host.nativeElement.contains(event.target as Node))
          this.setOpened(false);
      };
      document.addEventListener('pointerdown', onDown, true);
      onCleanup(() =>
        document.removeEventListener('pointerdown', onDown, true),
      );
    });
  }

  /** Opens the dial (focus stays where it is — the gesture paths move it). */
  open(): void {
    this.setOpened(true);
  }

  /** Closes the dial. */
  close(): void {
    this.setOpened(false);
  }

  /** Toggles the dial. */
  toggle(): void {
    this.setOpened(!this.opened());
  }

  /** Moves focus to the FAB. */
  focus(): void {
    this.toggleButton().nativeElement.focus();
  }

  private setOpened(next: boolean): void {
    if (next && this.disabled()) return;
    if (!next) this.hoverOpened = false;
    if (this.opened() !== next) this.opened.set(next);
  }

  private isDisabled = (index: number): boolean =>
    !!this.items()[index]?.disabled;

  private openAndFocus(which: 'first' | 'last'): void {
    this.setOpened(true);
    if (!this.opened()) return;
    const count = this.items().length;
    const index = ogeSpeedDialNavIndex(count, -1, which, this.isDisabled);
    afterNextRender(() => this.focusAction(index), { injector: this.injector });
  }

  private focusAction(index: number): void {
    if (index < 0) return;
    this.actions()[index]?.nativeElement.focus();
  }

  private rtl(): boolean {
    return ogeIsRtl(this.host.nativeElement);
  }

  protected onToggleClick(): void {
    if (this.opened() && !this.hoverOpened) {
      this.setOpened(false);
      return;
    }
    // a hover-opened dial stays open on press and takes focus into the menu
    this.hoverOpened = false;
    this.openAndFocus('first');
  }

  protected onToggleKeydown(event: KeyboardEvent): void {
    const intent = ogeSpeedDialToggleKey(
      event.key,
      this.resolvedDirection(),
      this.opened(),
      this.rtl(),
    );
    if (!intent) return;
    event.preventDefault();
    if (intent.type === 'open') this.openAndFocus(intent.focus);
    else if (intent.type === 'close') this.setOpened(false);
  }

  protected onItemKeydown(event: KeyboardEvent, index: number): void {
    const intent = ogeSpeedDialItemKey(
      event.key,
      this.resolvedDirection(),
      this.rtl(),
    );
    if (!intent) return;
    if (intent.type === 'move') {
      event.preventDefault();
      this.focusAction(
        ogeSpeedDialNavIndex(
          this.items().length,
          index,
          intent.to,
          this.isDisabled,
        ),
      );
    } else if (intent.type === 'close') {
      if (intent.restoreFocus) event.preventDefault();
      // Tab: park focus on the FAB first so the browser's Tab continues
      // from there once the menu is gone
      this.focus();
      this.setOpened(false);
    }
  }

  protected onItemClick(
    item: OgeSpeedDialItem,
    index: number,
    event: MouseEvent,
  ): void {
    if (item.disabled) return;
    this.itemClick.emit({ item, index, event });
    this.focus();
    this.setOpened(false);
  }

  protected onPointerEnter(event: PointerEvent): void {
    if (this.openMode() !== 'hover' || event.pointerType === 'touch') return;
    if (this.opened()) return;
    this.setOpened(true);
    this.hoverOpened = this.opened();
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (this.openMode() !== 'hover' || event.pointerType === 'touch') return;
    if (!this.hoverOpened) return;
    // keep it open while the keyboard focus is inside
    if (this.host.nativeElement.contains(document.activeElement)) return;
    this.setOpened(false);
  }
}
