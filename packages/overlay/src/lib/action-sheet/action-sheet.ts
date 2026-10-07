import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterRenderEffect,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  OgeActionSheetCore,
  ogeActionSheetDividerIndex,
  ogeActionSheetKeyIntent,
  ogeActionSheetOrder,
  ogeActionSheetTabStop,
  ogeOverlayMessage,
  type OgeActionSheetCloseReason,
  type OgeActionSheetClosedEvent,
  type OgeActionSheetClosingEvent,
  type OgeActionSheetItem,
  type OgeActionSheetItemClickEvent,
  type OgeActionSheetOpeningEvent,
  type OgeActionSheetResult,
} from '@oge-ui/behavior';
import { OGE_OVERLAY_CONFIG, type OgeOverlayMessages } from '../config';
import {
  OgeActionSheetItemTemplate,
  type OgeActionSheetItemTemplateContext,
} from './action-sheet-templates';

let nextActionSheetId = 0;

/**
 * A bottom sheet of actions for touch layouts — "Share, Edit, Delete,
 * Cancel" — opened from a button:
 *
 * ```html
 * <oge-button text="More" (clicked)="sheet.open()" />
 * <oge-action-sheet #sheet title="Photo" [items]="actions"
 *   (itemClick)="run($event.item)" />
 * ```
 *
 * The sheet is a modal `role="dialog"` labelled by its title, moved to
 * `document.body` while open (so transformed ancestors never clip it), with
 * the shared overlay behaviour: focus trap, ref-counted scroll lock, an inert
 * background, the Escape stack, backdrop and swipe-down dismissal and focus
 * restore. The actions are an APG menu (↑/↓ wrap, Home / End, one tab stop);
 * Cancel is a separate button. Choosing an action closes the sheet unless the
 * `itemClick` handler sets `keepOpen`; `open()` also returns a promise of the
 * chosen action (or `null`). The bottom edge pads with
 * `env(safe-area-inset-bottom)`.
 */
@Component({
  selector: 'oge-action-sheet',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'oge-action-sheet-host' },
  styleUrl: './action-sheet.scss',
  template: `
    @if (opened()) {
      <div
        #layer
        class="oge-action-sheet-layer"
        [class.oge-action-sheet-ready]="ready()"
      >
        <div
          #sheet
          class="oge-action-sheet"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          [attr.aria-labelledby]="title() ? titleId : null"
          [attr.aria-label]="title() ? null : (ariaLabel() ?? defaultLabel())"
          [attr.aria-describedby]="description() ? descriptionId : null"
        >
          <div class="oge-action-sheet-header">
            <span class="oge-action-sheet-handle" aria-hidden="true"></span>
            @if (title()) {
              <h2 class="oge-action-sheet-title" [id]="titleId">
                {{ title() }}
              </h2>
            }
            @if (description()) {
              <p class="oge-action-sheet-description" [id]="descriptionId">
                {{ description() }}
              </p>
            }
          </div>
          <div class="oge-action-sheet-content">
            <ng-content />
          </div>
          @if (ordered().length) {
            <div
              class="oge-action-sheet-menu"
              role="menu"
              [attr.aria-labelledby]="title() ? titleId : null"
              [attr.aria-label]="
                title() ? null : (ariaLabel() ?? defaultLabel())
              "
            >
              @for (
                item of ordered();
                track item.key ?? $index;
                let i = $index
              ) {
                @if (i === divider()) {
                  <div class="oge-action-sheet-divider" role="separator"></div>
                }
                <button
                  type="button"
                  role="menuitem"
                  class="oge-action-sheet-item"
                  [class.oge-action-sheet-item-destructive]="item.destructive"
                  [attr.aria-disabled]="item.disabled ? true : null"
                  [attr.data-oge-action-sheet-index]="i"
                  [attr.data-oge-action-sheet-focus]="
                    i === tabStop() ? '' : null
                  "
                  [tabindex]="i === tabStop() ? 0 : -1"
                  (click)="onItemClick($event, i)"
                  (keydown)="onItemKeydown($event, i)"
                  (focus)="focused.set(i)"
                >
                  @if (itemTemplate(); as tpl) {
                    <ng-container
                      *ngTemplateOutlet="
                        tpl.templateRef;
                        context: itemContext(item, i)
                      "
                    />
                  } @else {
                    @if (item.icon) {
                      <svg
                        class="oge-action-sheet-icon"
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path [attr.d]="item.icon" />
                      </svg>
                    }
                    <span class="oge-action-sheet-text">
                      <span class="oge-action-sheet-label">{{
                        item.text
                      }}</span>
                      @if (item.description) {
                        <span class="oge-action-sheet-item-description">{{
                          item.description
                        }}</span>
                      }
                    </span>
                  }
                </button>
              }
            </div>
          }
          @if (showCancel()) {
            <button
              type="button"
              class="oge-action-sheet-cancel"
              (click)="requestClose('cancel', null)"
            >
              {{ cancelText() ?? cancelLabel() }}
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class OgeActionSheet {
  private readonly config = inject(OGE_OVERLAY_CONFIG);

  /** Two-way open state. A direct `false` write closes without the `closing` event. */
  readonly opened = model(false);
  /** The actions, in order; `group: 'bottom'` actions render after a divider. */
  readonly items = input<readonly OgeActionSheetItem[]>([]);
  /** Heading of the sheet — also its accessible name. */
  readonly title = input<string | undefined>(undefined);
  /** Secondary text under the title (the dialog's description). */
  readonly description = input<string | undefined>(undefined);
  /** Accessible name when there is no `title`; falls back to the `actionSheetLabel` message. */
  readonly ariaLabel = input<string | undefined>(undefined);
  /** Renders the Cancel button (default `true`). */
  readonly showCancel = input(true);
  /** Text of the Cancel button; falls back to the `actionSheetCancel` message. */
  readonly cancelText = input<string | undefined>(undefined);
  /** Closes on a backdrop press (default `true`). */
  readonly closeOnBackdropClick = input(true);
  /** Closes on Escape (default `true`). */
  readonly closeOnEscape = input(true);
  /** Closes on a swipe down from the handle / header (default `true`). */
  readonly swipeToClose = input(true);
  /** Per-instance message overrides. */
  readonly messages = input<Partial<OgeOverlayMessages>>();

  /** Cancelable, before the sheet opens. */
  readonly opening = output<OgeActionSheetOpeningEvent>();
  /** Cancelable, before the sheet closes; carries the reason and the chosen action. */
  readonly closing = output<OgeActionSheetClosingEvent>();
  /** The sheet closed. */
  readonly closed = output<OgeActionSheetClosedEvent>();
  /** An action was chosen; set `keepOpen` to keep the sheet open. */
  readonly itemClick = output<OgeActionSheetItemClickEvent>();

  protected readonly itemTemplate = contentChild(OgeActionSheetItemTemplate, {
    descendants: false,
  });
  private readonly layerEl = viewChild<ElementRef<HTMLElement>>('layer');
  private readonly sheetEl = viewChild<ElementRef<HTMLElement>>('sheet');

  private readonly uid = `oge-action-sheet-${nextActionSheetId++}`;
  protected readonly titleId = `${this.uid}-title`;
  protected readonly descriptionId = `${this.uid}-description`;

  private readonly mergedMessages = computed(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));
  protected readonly defaultLabel = computed(() =>
    ogeOverlayMessage(this.mergedMessages(), 'actionSheetLabel'),
  );
  protected readonly cancelLabel = computed(() =>
    ogeOverlayMessage(this.mergedMessages(), 'actionSheetCancel'),
  );
  protected readonly ordered = computed(() =>
    ogeActionSheetOrder(this.items()),
  );
  protected readonly divider = computed(() =>
    ogeActionSheetDividerIndex(this.ordered()),
  );
  protected readonly focused = signal(-1);
  protected readonly tabStop = computed(() =>
    ogeActionSheetTabStop(this.ordered(), this.focused()),
  );
  protected readonly ready = signal(false);

  private readonly core = new OgeActionSheetCore({
    layer: () => this.layerEl()?.nativeElement ?? null,
    sheet: () => this.sheetEl()?.nativeElement ?? null,
    onDismiss: (reason) => {
      if (reason === 'escape' && !this.closeOnEscape()) return;
      if (reason === 'backdrop' && !this.closeOnBackdropClick()) return;
      if (reason === 'swipe' && !this.swipeToClose()) return;
      this.requestClose(reason, null);
    },
  });
  private resolvers: ((result: OgeActionSheetResult) => void)[] = [];
  private lastReason: OgeActionSheetCloseReason = 'api';
  private lastItem: OgeActionSheetItem | null = null;

  constructor() {
    let portaled: HTMLElement | null = null;
    let wasOpen = false;
    // Escape works from the moment the sheet opens — the layer (and the
    // activation below) only exist a render later
    effect(() => {
      const open = this.opened();
      untracked(() => {
        if (open) {
          this.core.arm();
        } else if (!wasOpen && this.core.isArmed()) {
          // dismissed before it ever rendered
          this.core.deactivate();
          this.settle(true);
        }
      });
    });
    afterRenderEffect(() => {
      const layer = this.layerEl()?.nativeElement ?? null;
      untracked(() => {
        if (layer) {
          // portal: transformed or clipping ancestors never affect the sheet
          if (layer.parentElement !== layer.ownerDocument.body) {
            layer.ownerDocument.body.appendChild(layer);
          }
          portaled = layer;
          if (!wasOpen) {
            wasOpen = true;
            this.core.activate();
            // next frame: the enter transition starts from the closed state
            requestAnimationFrame(() => this.ready.set(true));
          }
        } else if (wasOpen) {
          wasOpen = false;
          portaled = null;
          this.ready.set(false);
          this.focused.set(-1);
          this.core.deactivate();
          this.settle(true);
        }
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.core.destroy();
      portaled?.remove();
      portaled = null;
      this.settle(false);
    });
  }

  /**
   * Opens the sheet (runs the cancelable `opening`) and resolves with the
   * chosen action, or `null` when it is dismissed (or the open was vetoed).
   */
  open(): Promise<OgeActionSheetResult> {
    return new Promise((resolve) => {
      if (this.opened()) {
        this.resolvers.push(resolve);
        return;
      }
      const opening: OgeActionSheetOpeningEvent = { cancel: false };
      this.opening.emit(opening);
      if (opening.cancel) {
        resolve(null);
        return;
      }
      this.resolvers.push(resolve);
      this.lastReason = 'api';
      this.lastItem = null;
      this.opened.set(true);
      this.core.arm();
    });
  }

  /** Closes the sheet (reason `'api'`; runs the cancelable `closing`). */
  close(): void {
    this.requestClose('api', null);
  }

  /** Opens a closed sheet, closes an open one. */
  toggle(): void {
    if (this.opened()) this.close();
    else void this.open();
  }

  protected itemContext(
    item: OgeActionSheetItem,
    index: number,
  ): OgeActionSheetItemTemplateContext {
    return { $implicit: item, index };
  }

  protected onItemClick(event: Event, index: number): void {
    this.activate(index, event);
  }

  protected onItemKeydown(event: KeyboardEvent, index: number): void {
    const intent = ogeActionSheetKeyIntent(event.key, index, this.ordered());
    if (!intent) return;
    event.preventDefault();
    if (intent.kind === 'activate') {
      this.activate(intent.index, event);
      return;
    }
    this.focused.set(intent.index);
    this.sheetEl()
      ?.nativeElement.querySelector<HTMLElement>(
        `[data-oge-action-sheet-index="${intent.index}"]`,
      )
      ?.focus();
  }

  protected requestClose(
    reason: OgeActionSheetCloseReason,
    item: OgeActionSheetItem | null,
  ): void {
    if (!this.opened()) return;
    const closing: OgeActionSheetClosingEvent = { reason, item, cancel: false };
    this.closing.emit(closing);
    if (closing.cancel) return;
    this.lastReason = reason;
    this.lastItem = item;
    this.opened.set(false);
  }

  private activate(index: number, event: Event): void {
    const item = this.ordered()[index];
    if (!item || item.disabled) return;
    const click: OgeActionSheetItemClickEvent = {
      item,
      index,
      event,
      keepOpen: false,
    };
    this.itemClick.emit(click);
    if (!click.keepOpen) this.requestClose('action', item);
  }

  /** Resolves pending `open()` promises and, after a real close, emits `closed`. */
  private settle(emit: boolean): void {
    const reason = this.lastReason;
    const item = emit ? this.lastItem : null;
    this.lastReason = 'api';
    this.lastItem = null;
    const resolvers = this.resolvers;
    this.resolvers = [];
    if (emit) this.closed.emit({ reason, item });
    for (const resolve of resolvers) resolve(item);
  }
}
