import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
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
  OGE_OVERLAY_CONFIG,
  OgeAnchoredPanel,
  OgeMenuList,
  OgePopup,
  type OgeMenuCloseRequestEvent,
  type OgeMenuItem,
  type OgeMenuItemTemplateContext,
  type OgeMenuListItemClickEvent,
  type OgePopupPlacement,
} from '@oge-ui/overlay';
import { OgeButton } from '../button/button';
import { OGE_BUTTONS_CONFIG, type OgeButtonsMessages } from '../config';
import type {
  OgeButtonActionDoneEvent,
  OgeButtonActionFailedEvent,
  OgeButtonClickEvent,
  OgeButtonIconPosition,
  OgeButtonSeverity,
  OgeButtonSize,
  OgeButtonStylingMode,
  OgeClickGuardOptions,
} from '../button/button-types';
import { OgeDropDownContent } from './drop-down-button-content';
import type {
  OgeDropDownButtonItemClickEvent,
  OgeDropDownContentContext,
  OgeDropDownItemsFn,
  OgeDropDownSelectionChangedEvent,
} from './drop-down-button-types';

import { isThenable } from '../internal/thenable';

type ItemsState =
  | { status: 'static' }
  | { status: 'idle' }
  | { status: 'loading'; runId: number }
  | { status: 'ready'; items: readonly OgeMenuItem[] }
  | { status: 'error' };

/**
 * Button with an anchored menu panel — WAI-ARIA menu-button pattern with
 * full keyboard support, async/lazy items and an optional split mode:
 *
 * ```html
 * <oge-drop-down-button text="Export" [items]="exportItems" (itemClick)="run($event.item)" />
 *
 * <oge-drop-down-button
 *   text="Run"
 *   [splitButton]="true"
 *   [rememberLastAction]="true"
 *   [items]="runTargets"
 * />
 * ```
 *
 * `holdToConfirm`/`autoRepeat`/`useSubmitBehavior` are intentionally not
 * available on drop-down buttons. In non-split mode the trigger click only
 * toggles the panel — bind `itemClick` for selection; `clicked` fires solely
 * from the split main button.
 */
@Component({
  selector: 'oge-drop-down-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgeButton, OgeMenuList, OgePopup],
  host: {
    class: 'oge-drop-down-button',
    '[class.oge-drop-down-split]': 'splitButton()',
    '[class.oge-drop-down-open]': 'opened()',
    '[class.oge-disabled]': 'disabled()',
  },
  styleUrl: './drop-down-button.scss',
  template: `
    <oge-button
      #trigger
      [text]="mainText()"
      [hint]="hint()"
      [disabled]="disabled()"
      [stylingMode]="stylingMode()"
      [severity]="severity()"
      [size]="size()"
      [color]="color()"
      [iconPosition]="iconPosition()"
      [badge]="badge()"
      [(loading)]="loading"
      [action]="splitButton() ? effectiveMainAction() : undefined"
      [clickGuard]="splitButton() ? clickGuard() : false"
      [ariaHasPopup]="splitButton() ? undefined : 'menu'"
      [ariaExpanded]="splitButton() ? undefined : opened()"
      [ariaControls]="splitButton() ? undefined : panel.panelId"
      (clicked)="onMainClicked($event)"
      (actionDone)="actionDone.emit($event)"
      (actionFailed)="actionFailed.emit($event)"
      (keydown)="onTriggerKeydown($event)"
    >
      <ng-content select="[ogeButtonIcon]" />
      @if (!splitButton()) {
        <svg
          class="oge-drop-down-chevron"
          viewBox="0 0 16 16"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      }
    </oge-button>
    @if (splitButton()) {
      <oge-button
        #toggle
        class="oge-drop-down-toggle"
        [hint]="msg().dropDownToggle"
        [disabled]="disabled()"
        [stylingMode]="stylingMode()"
        [severity]="severity()"
        [size]="size()"
        [color]="color()"
        ariaHasPopup="menu"
        [ariaExpanded]="opened()"
        [ariaControls]="panel.panelId"
        (clicked)="togglePanel()"
        (keydown)="onTriggerKeydown($event)"
      >
        <svg
          class="oge-drop-down-chevron"
          viewBox="0 0 16 16"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </oge-button>
    }
    @if (opened()) {
      <oge-popup [panel]="panel">
        @if (contentTemplate(); as content) {
          <ng-container
            *ngTemplateOutlet="content.templateRef; context: contentContext"
          />
        } @else {
          @switch (itemsStatus()) {
            @case ('loading') {
              <div class="oge-menu-status-row" role="presentation">
                <svg
                  class="oge-menu-status-spinner"
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  aria-hidden="true"
                >
                  <path d="M8 1.5 A 6.5 6.5 0 1 1 1.5 8" />
                </svg>
                {{ msg().dropDownLoading }}
              </div>
            }
            @case ('error') {
              <div class="oge-menu-status-row" role="presentation">
                {{ msg().dropDownLoadError }}
              </div>
            }
            @default {
              @if (resolvedItems().length === 0) {
                <div class="oge-menu-status-row" role="presentation">
                  {{ msg().dropDownNoItems }}
                </div>
              } @else {
                <oge-menu-list
                  [items]="resolvedItems()"
                  [ariaLabel]="mainText() || hint()"
                  [itemTemplate]="itemTemplate()"
                  (itemClick)="onMenuItemClick($event)"
                  (closeRequest)="onMenuCloseRequest($event)"
                />
              }
            }
          }
        }
      </oge-popup>
    }
  `,
})
export class OgeDropDownButton {
  private readonly config = inject(OGE_BUTTONS_CONFIG);
  private readonly overlayConfig = inject(OGE_OVERLAY_CONFIG);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Label of the (main) trigger button. */
  readonly text = input('');
  readonly hint = input<string | undefined>(undefined);
  readonly disabled = input(false);
  readonly stylingMode = input<OgeButtonStylingMode | undefined>(undefined);
  readonly severity = input<OgeButtonSeverity | undefined>(undefined);
  readonly size = input<OgeButtonSize | undefined>(undefined);
  /** Custom main color (any CSS color) — overrides the severity palette. */
  readonly color = input<string | undefined>(undefined);
  readonly iconPosition = input<OgeButtonIconPosition>('before');
  readonly badge = input<string | number | boolean | undefined>(undefined);
  /** Async click handler of the split main button (single-flight, loading). */
  readonly action = input<(() => unknown) | undefined>(undefined);
  /** Click guard of the split main button. */
  readonly clickGuard = input<boolean | OgeClickGuardOptions>(false);
  /** Busy state of the (main) button — two-way. */
  readonly loading = model(false);

  /** `true` renders a separate chevron toggle next to an action main button. */
  readonly splitButton = input(false);
  /** Menu items — an array, or a function invoked lazily on first open. */
  readonly items = input<
    readonly OgeMenuItem[] | OgeDropDownItemsFn | undefined
  >(undefined);
  readonly dropdownPlacement = input<OgePopupPlacement>('bottom-start');
  /** Panel width: fixed pixels or `'anchor'` to match the button width. */
  readonly dropdownWidth = input<number | 'anchor' | undefined>(undefined);
  /**
   * Split mode: the last clicked menu item becomes the main button's label
   * and action for the session (IDE "Run" button pattern).
   */
  readonly rememberLastAction = input(false);
  /** Custom rendering for menu items (icons, badges…) — see `OgeMenuList`. */
  readonly itemTemplate = input<
    TemplateRef<OgeMenuItemTemplateContext> | undefined
  >(undefined);
  /** Panel visibility — two-way. */
  readonly opened = model(false);
  /** Per-instance overrides of user-facing strings. */
  readonly messages = input<Partial<OgeButtonsMessages> | undefined>(undefined);

  /** Fires when a menu item is activated; the panel closes afterwards. */
  readonly itemClick = output<OgeDropDownButtonItemClickEvent>();
  /** `rememberLastAction` mode: the remembered item changed. */
  readonly selectionChanged = output<OgeDropDownSelectionChangedEvent>();
  /** Split mode only: the main action button was clicked. */
  readonly clicked = output<OgeButtonClickEvent>();
  readonly actionDone = output<OgeButtonActionDoneEvent>();
  readonly actionFailed = output<OgeButtonActionFailedEvent>();

  private readonly triggerButton = viewChild.required<OgeButton>('trigger');
  private readonly toggleButton = viewChild<OgeButton>('toggle');
  private readonly menuList = viewChild(OgeMenuList);
  private readonly popupRef = viewChild(OgePopup, { read: ElementRef });
  protected readonly contentTemplate = contentChild(OgeDropDownContent);

  /** Anchored-panel model — public so templates/tests can read `panelId`. */
  readonly panel = new OgeAnchoredPanel({
    anchor: () => this.host.nativeElement,
    panel: () => this.popupRef()?.nativeElement ?? null,
    placement: () => this.dropdownPlacement(),
    width: () => this.dropdownWidth(),
    offset: () => this.overlayConfig.offset,
    viewportPadding: () => this.overlayConfig.viewportPadding,
    restoreFocus: () => this.focusTrigger(),
    onClosed: () => {
      this.pendingMenuFocus.set(null);
      if (this.opened()) this.opened.set(false);
    },
  });

  protected readonly msg = computed<OgeButtonsMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  private readonly lastAction = signal<OgeMenuItem | null>(null);
  private readonly itemsState = signal<ItemsState>({ status: 'idle' });
  private loadSeq = 0;
  private readonly pendingMenuFocus = signal<'first' | 'last' | null>(null);

  protected readonly itemsStatus = computed(() => this.itemsState().status);
  protected readonly resolvedItems = computed<readonly OgeMenuItem[]>(() => {
    const state = this.itemsState();
    if (state.status === 'ready') return state.items;
    if (state.status === 'static') {
      const items = this.items();
      return Array.isArray(items) ? items : [];
    }
    return [];
  });

  protected readonly mainText = computed(() => {
    const last = this.rememberActive() ? this.lastAction() : null;
    return last ? last.text : this.text();
  });

  protected readonly effectiveMainAction = computed<
    (() => unknown) | undefined
  >(() => {
    const last = this.rememberActive() ? this.lastAction() : null;
    const action = last?.action;
    if (action) return () => action();
    return this.action();
  });

  protected readonly contentContext: OgeDropDownContentContext = {
    $implicit: () => this.panel.close('select'),
  };

  private readonly rememberActive = computed(
    () => this.splitButton() && this.rememberLastAction(),
  );

  constructor() {
    // `opened` model ↔ panel model, loop-guarded by comparing states first.
    effect(() => {
      const shouldOpen = this.opened();
      untracked(() => {
        if (shouldOpen && !this.panel.isOpen()) {
          this.panel.open();
          this.ensureItemsLoaded();
        } else if (!shouldOpen && this.panel.isOpen()) {
          this.panel.close('api');
        }
      });
    });
    // Items input changes: array ↔ function, or a new function reference.
    effect(() => {
      const items = this.items();
      untracked(() => {
        this.itemsState.set(
          typeof items === 'function'
            ? { status: 'idle' }
            : { status: 'static' },
        );
        if (this.opened()) this.ensureItemsLoaded();
      });
    });
    // Focus the menu once it exists (keyboard opens). The popup is
    // transparent-but-focusable until measured, so this is safe immediately.
    effect(() => {
      const menu = this.menuList();
      const pending = this.pendingMenuFocus();
      if (menu && pending) {
        untracked(() => {
          menu.focus(pending);
          this.pendingMenuFocus.set(null);
        });
      }
    });
    effect(() => {
      if (!this.rememberActive()) untracked(() => this.lastAction.set(null));
    });
    // Placement/width input changes while open take effect immediately
    // (content growth is handled by the panel's own ResizeObserver).
    effect(() => {
      this.dropdownPlacement();
      this.dropdownWidth();
      untracked(() => {
        if (this.panel.isOpen()) this.panel.updatePosition();
      });
    });
    this.destroyRef.onDestroy(() => this.panel.destroy());
  }

  /** Moves keyboard focus to the trigger (split mode: the chevron toggle). */
  focus(): void {
    this.focusTrigger();
  }

  /** Opens the panel programmatically (same as `opened.set(true)`). */
  open(): void {
    this.opened.set(true);
  }

  /** Closes the panel programmatically. */
  close(): void {
    this.opened.set(false);
  }

  toggle(): void {
    this.opened.set(!this.opened());
  }

  protected togglePanel(): void {
    this.toggle();
  }

  protected onMainClicked(event: OgeButtonClickEvent): void {
    if (!this.splitButton()) {
      const willOpen = !this.opened();
      this.toggle();
      // APG: Enter/Space open focuses the first item. Keyboard-synthesized
      // clicks carry detail === 0.
      if (
        willOpen &&
        event.event instanceof MouseEvent &&
        event.event.detail === 0
      ) {
        this.pendingMenuFocus.set('first');
      }
      return;
    }
    this.clicked.emit(event);
    const last = this.rememberActive() ? this.lastAction() : null;
    if (last) {
      this.itemClick.emit({
        item: last,
        index: this.resolvedItems().indexOf(last),
        event: event.event,
      });
    }
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    // APG menu-button: tabbing off the trigger closes the open panel.
    if (event.key === 'Tab') {
      if (this.opened()) this.panel.close('tab');
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    event.stopPropagation();
    if (!this.opened()) this.opened.set(true);
    this.pendingMenuFocus.set(event.key === 'ArrowDown' ? 'first' : 'last');
  }

  protected onMenuItemClick(event: OgeMenuListItemClickEvent): void {
    this.itemClick.emit({
      item: event.item,
      index: event.index,
      event: event.event,
    });
    if (
      this.rememberActive() &&
      !event.item.disabled &&
      !event.item.separator
    ) {
      const previousItem = this.lastAction();
      if (previousItem !== event.item) {
        this.lastAction.set(event.item);
        this.selectionChanged.emit({ item: event.item, previousItem });
      }
    }
  }

  protected onMenuCloseRequest(event: OgeMenuCloseRequestEvent): void {
    if (event.reason === 'tab') {
      // Focus the trigger before the panel unmounts so the browser's default
      // Tab continues from there instead of a removed element.
      this.focusTrigger();
      this.panel.close('tab');
      return;
    }
    this.panel.close(event.reason);
  }

  private focusTrigger(): void {
    (this.toggleButton() ?? this.triggerButton()).focus();
  }

  private ensureItemsLoaded(): void {
    const items = this.items();
    if (typeof items !== 'function') return;
    const state = this.itemsState();
    if (state.status === 'ready' || state.status === 'loading') return;
    const result = items();
    if (!isThenable(result)) {
      this.itemsState.set({
        status: 'ready',
        items: result as readonly OgeMenuItem[],
      });
      return;
    }
    const runId = ++this.loadSeq;
    this.itemsState.set({ status: 'loading', runId });
    (result as Promise<readonly OgeMenuItem[]>).then(
      (loaded) => {
        const current = this.itemsState();
        if (current.status === 'loading' && current.runId === runId) {
          this.itemsState.set({ status: 'ready', items: loaded });
        }
      },
      () => {
        const current = this.itemsState();
        if (current.status === 'loading' && current.runId === runId) {
          this.itemsState.set({ status: 'error' });
        }
      },
    );
  }
}
