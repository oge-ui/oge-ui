import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import {
  OGE_OVERLAY_CONFIG,
  OgeAnchoredPanel,
  OgePopup,
  type OgePopupPlacement,
} from '@oge-ui/overlay';
import { OgeFieldChrome } from '../field/field-chrome';
import { OGE_INPUT_HOST, type OgeInputDropDownApi } from '../field/input-host';
import { OgeInputBase } from '../field/input-base';
import type {
  OgeSelectBoxCustomItemEvent,
  OgeSelectBoxDisabledExpr,
  OgeSelectBoxDisplayExpr,
  OgeSelectBoxGroupExpr,
  OgeSelectBoxItemClickEvent,
  OgeSelectBoxItemsFn,
  OgeSelectBoxSearchChangedEvent,
  OgeSelectBoxSearchExpr,
  OgeSelectBoxSearchMode,
  OgeSelectBoxSelectionChangedEvent,
  OgeSelectBoxValueExpr,
  OgeSelectItemTemplateContext,
} from './select-box-types';

type ItemsState<TItem> =
  | { status: 'static' }
  | { status: 'idle' }
  | { status: 'loading'; runId: number }
  | { status: 'ready'; items: readonly TItem[] }
  | { status: 'error' };

type SelectRow<TItem> =
  | { kind: 'group'; label: string }
  | { kind: 'item'; item: TItem; index: number };

/**
 * Drop-down select editor on the shared oge field chrome — WAI-ARIA combobox
 * with `aria-activedescendant` (DOM focus never leaves the input), optional
 * text search with debounce, `displayExpr`/`valueExpr` data mapping, lazy
 * item loading, flat-data grouping, custom values and the full label /
 * validation / clear-button chrome:
 *
 * ```html
 * <oge-select-box label="City" [items]="cities" [(value)]="city" />
 * <oge-select-box
 *   label="Assignee"
 *   [items]="users"
 *   displayExpr="name"
 *   valueExpr="id"
 *   [searchEnabled]="true"
 *   [showClearButton]="true"
 * />
 * ```
 *
 * Works standalone via `[(value)]`, with Signal Forms via `[formField]`, and
 * with reactive/template forms via `formControl`/`ngModel`. The popup is
 * rendered lazily on first open; client-side filtering is built in and
 * `searchChanged` + `[loading]` are the server-side filtering escape hatch.
 */
@Component({
  selector: 'oge-select-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgeFieldChrome, OgePopup],
  providers: [{ provide: OGE_INPUT_HOST, useExisting: OgeSelectBox }],
  host: {
    class: 'oge-input oge-select-box',
    '[class.oge-select-box-open]': 'opened()',
  },
  template: `
    <oge-field-chrome>
      <ng-content select="[ogeInputPrefix]" ngProjectAs="[ogeInputPrefix]" />
      <input
        #native
        class="oge-input-native"
        [class.oge-select-plain]="!searchEnabled()"
        type="text"
        role="combobox"
        aria-haspopup="listbox"
        autocomplete="off"
        [id]="inputId"
        [value]="inputText()"
        [placeholder]="placeholderText()"
        [disabled]="effectiveDisabled()"
        [readOnly]="readonly() || !searchEnabled()"
        [attr.name]="name() || null"
        [attr.title]="tooltip() ?? null"
        [attr.tabindex]="tabIndex()"
        [attr.aria-expanded]="opened()"
        [attr.aria-controls]="opened() ? listboxId : null"
        [attr.aria-autocomplete]="searchEnabled() ? 'list' : 'none'"
        [attr.aria-activedescendant]="activeDescendant()"
        [attr.aria-label]="labelMode() === 'hidden' && label() ? label() : null"
        [attr.aria-labelledby]="
          labelMode() !== 'hidden' && label() ? labelId : null
        "
        [attr.aria-describedby]="describedBy()"
        [attr.aria-invalid]="showError() ? 'true' : null"
        [attr.aria-required]="required() ? 'true' : null"
        (input)="onNativeInput($event)"
        (click)="onFieldClick()"
        (keydown)="onKeydown($event)"
        (focus)="handleFocus($event)"
        (blur)="handleBlur($event)"
      />
      <ng-content select="[ogeInputSuffix]" ngProjectAs="[ogeInputSuffix]" />
    </oge-field-chrome>
    @if (opened()) {
      <oge-popup [panel]="panel">
        <div
          class="oge-select-list"
          [class.oge-select-wrap]="wrapItemText()"
          role="listbox"
          [id]="listboxId"
          [style.maxHeight.px]="dropdownMaxHeight() ?? null"
          [attr.aria-labelledby]="
            labelMode() !== 'hidden' && label() ? labelId : null
          "
          [attr.aria-label]="
            labelMode() === 'hidden' && label() ? label() : null
          "
        >
          @if (loading() || itemsStatus() === 'loading') {
            <div class="oge-select-status" role="presentation">
              {{ msg().dropDownLoading }}
            </div>
          } @else if (itemsStatus() === 'error') {
            <div class="oge-select-status" role="presentation">
              {{ msg().dropDownLoadError }}
            </div>
          } @else if (rows().length === 0) {
            <div class="oge-select-status" role="presentation">
              {{ msg().noDataText }}
            </div>
          } @else {
            @for (row of rows(); track $index) {
              @if (row.kind === 'group') {
                <div class="oge-select-group" role="presentation">
                  {{ row.label }}
                </div>
              } @else {
                <!--
                  activedescendant pattern: options are never focusable and all
                  keyboard interaction lives on the combobox input above
                -->
                <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
                <div
                  class="oge-select-option"
                  role="option"
                  [id]="optionId(row.index)"
                  [class.oge-select-option-active]="row.index === activeIndex()"
                  [class.oge-select-option-selected]="
                    row.item === selectedItem()
                  "
                  [class.oge-disabled]="isItemDisabled(row.item)"
                  [attr.aria-selected]="row.item === selectedItem()"
                  [attr.aria-disabled]="
                    isItemDisabled(row.item) ? 'true' : null
                  "
                  [attr.title]="
                    useItemTextAsTitle() ? displayOf(row.item) : null
                  "
                  (mousedown)="$event.preventDefault()"
                  (mouseenter)="onOptionHover(row.index, row.item)"
                  (click)="selectItem(row.item, row.index, $event)"
                >
                  @if (itemTemplate(); as template) {
                    <ng-container
                      *ngTemplateOutlet="
                        template;
                        context: {
                          $implicit: row.item,
                          index: row.index,
                          selected: row.item === selectedItem(),
                          active: row.index === activeIndex(),
                        }
                      "
                    />
                  } @else {
                    <span class="oge-select-option-text">{{
                      displayOf(row.item)
                    }}</span>
                  }
                </div>
              }
            }
          }
        </div>
      </oge-popup>
    }
  `,
})
export class OgeSelectBox<TItem = unknown>
  extends OgeInputBase<unknown>
  implements FormValueControl<unknown>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlayConfig = inject(OGE_OVERLAY_CONFIG);

  /** Committed value (`valueExpr` of the selected item). `null` when empty. */
  readonly value = model<unknown>(null);
  /**
   * The selectable items: an array, or a function invoked lazily on first
   * open (sync or promise — loading/error rows render while pending). The
   * selected item is resolved from this full set, never the filtered one.
   */
  readonly items = input<readonly TItem[] | OgeSelectBoxItemsFn<TItem>>([]);
  /** Item → display text. Omitted, the item itself is stringified. */
  readonly displayExpr = input<OgeSelectBoxDisplayExpr<TItem> | undefined>(
    undefined,
  );
  /** Item → committed value. Omitted, the whole item is the value. */
  readonly valueExpr = input<OgeSelectBoxValueExpr<TItem> | undefined>(
    undefined,
  );
  /** Marks individual items as non-selectable. */
  readonly disabledExpr = input<OgeSelectBoxDisabledExpr<TItem> | undefined>(
    undefined,
  );
  /** Groups flat items under headers; items are re-ordered by first-seen group. */
  readonly groupBy = input<OgeSelectBoxGroupExpr<TItem> | undefined>(undefined);
  /** Enables typing into the field to filter the list. */
  readonly searchEnabled = input(false);
  readonly searchMode = input<OgeSelectBoxSearchMode>('contains');
  /** Which text the filter matches; defaults to the display text. */
  readonly searchExpr = input<OgeSelectBoxSearchExpr<TItem> | undefined>(
    undefined,
  );
  /** Debounce before typed text filters the list; `undefined` = config default (250ms). */
  readonly searchTimeout = input<number | undefined>(undefined);
  /** Characters required before the filter narrows the list. */
  readonly minSearchLength = input(0);
  /** Below `minSearchLength`: show the full list (`true`) or nothing (`false`). */
  readonly showDataBeforeSearch = input(false);
  /**
   * Lets typed text that matches no item become the value. `customItemCreating`
   * maps the text to an item (sync/async); unhandled, the text itself is the item.
   */
  readonly acceptCustomValue = input(false);
  /** Renders the chevron toggle in the field rail. */
  readonly showDropDownButton = input(true);
  /** Clicking the field opens the popup (select-only mode toggles it). */
  readonly openOnFieldClick = input(true);
  /** Shows a loading row instead of items — server-side filtering escape hatch. */
  readonly loading = input(false);
  readonly dropdownPlacement = input<OgePopupPlacement>('bottom-start');
  /** Popup width: fixed pixels or `'anchor'` to match the field box. */
  readonly dropdownWidth = input<number | 'anchor'>('anchor');
  /** Scrollable list height cap; `undefined` = the CSS default (320px). */
  readonly dropdownMaxHeight = input<number | undefined>(undefined);
  /** Wraps long option text instead of ellipsizing it. */
  readonly wrapItemText = input(false);
  /** Mirrors each option's display text into its `title` attribute. */
  readonly useItemTextAsTitle = input(false);
  /** Custom option row rendering. */
  readonly itemTemplate = input<
    TemplateRef<OgeSelectItemTemplateContext<TItem>> | undefined
  >(undefined);
  /** Popup visibility — two-way. */
  readonly opened = model(false);

  /** Fires whenever the resolved selected item changes (user or programmatic). */
  readonly selectionChanged =
    output<OgeSelectBoxSelectionChangedEvent<TItem>>();
  /** An option row was activated by click or keyboard. */
  readonly itemClick = output<OgeSelectBoxItemClickEvent<TItem>>();
  readonly dropDownOpened = output<void>();
  readonly dropDownClosed = output<void>();
  /** Raw search text on every keystroke — drive server-side filtering from here. */
  readonly searchChanged = output<OgeSelectBoxSearchChangedEvent>();
  /**
   * `acceptCustomValue` commit: assign `customItem` on the (mutable) payload
   * to map the text to an item — or `null` to reject it.
   */
  readonly customItemCreating = output<OgeSelectBoxCustomItemEvent<TItem>>();

  private readonly native = viewChild<ElementRef<HTMLInputElement>>('native');
  private readonly chromeRef = viewChild(OgeFieldChrome, { read: ElementRef });
  private readonly popupRef = viewChild(OgePopup, { read: ElementRef });

  /** Anchored-panel model — public so templates/tests can read `panelId`. */
  readonly panel = new OgeAnchoredPanel({
    // anchor on the bordered container, not the host — the host also holds
    // the label and subscript, which the popup must ignore
    anchor: () =>
      this.chromeRef()?.nativeElement.querySelector('.oge-input-container') ??
      this.hostEl.nativeElement,
    panel: () => this.popupRef()?.nativeElement ?? null,
    placement: () => this.dropdownPlacement(),
    width: () => this.dropdownWidth(),
    offset: () => this.overlayConfig.offset,
    viewportPadding: () => this.overlayConfig.viewportPadding,
    restoreFocus: () => this.focus(),
    onClosed: () => {
      this.activeIndex.set(-1);
      this.userNavigated = false;
      this.resetSearch();
      if (this.opened()) this.opened.set(false);
      this.dropDownClosed.emit();
    },
  });

  get listboxId(): string {
    return `${this.inputId}-listbox`;
  }

  // --- items source (array or lazy function) ---------------------------------

  private readonly itemsState = signal<ItemsState<TItem>>({
    status: 'static',
  });
  private loadSeq = 0;

  protected readonly itemsStatus = computed(() => this.itemsState().status);

  /** The full item set — empty until a lazy source resolves. */
  protected readonly resolvedItems = computed<readonly TItem[]>(() => {
    const state = this.itemsState();
    if (state.status === 'ready') return state.items;
    if (state.status === 'static') {
      const items = this.items();
      return Array.isArray(items) ? items : [];
    }
    return [];
  });

  /**
   * Custom value cache: an `acceptCustomValue` item is not in `items`, so
   * `selectedItem` falls back to it — otherwise the field text would blank.
   */
  private readonly customSelected = signal<TItem | null>(null);
  private customSeq = 0;

  /** The item whose `valueExpr` matches `value` — from the full item set. */
  readonly selectedItem = computed<TItem | null>(() => {
    const currentValue = this.value();
    if (currentValue == null) return null;
    const found = this.resolvedItems().find((item) =>
      Object.is(this.itemValue(item), currentValue),
    );
    if (found !== undefined) return found;
    const custom = this.customSelected();
    return custom !== null && Object.is(this.itemValue(custom), currentValue)
      ? custom
      : null;
  });

  /** Display text of the selected item (`''` when empty). */
  readonly displayText = computed(() => {
    const item = this.selectedItem();
    return item === null ? '' : this.displayOf(item);
  });

  // --- search / filter -------------------------------------------------------

  /** Search text while the user is filtering; `null` = not searching. */
  private readonly searchText = signal<string | null>(null);
  /** `searchText` after the `searchTimeout` debounce — drives the filter. */
  private readonly filterText = signal<string | null>(null);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly inputText = computed(
    () => this.searchText() ?? this.displayText(),
  );

  /**
   * Items after the client-side filter (and `groupBy` reordering); the popup
   * renders exactly these, keyboard indices point into this array.
   */
  protected readonly visibleItems = computed<readonly TItem[]>(() => {
    let items = this.filteredItems();
    const expr = this.groupBy();
    if (expr !== undefined) {
      const buckets = new Map<string, TItem[]>();
      for (const item of items) {
        const key = this.groupKeyOf(item);
        const bucket = buckets.get(key);
        if (bucket) bucket.push(item);
        else buckets.set(key, [item]);
      }
      items = Array.from(buckets.values()).flat();
    }
    return items;
  });

  private readonly filteredItems = computed<readonly TItem[]>(() => {
    const items = this.resolvedItems();
    if (!this.searchEnabled()) return items;
    const term = this.filterText();
    const typed = (term ?? '').trim();
    const min = this.minSearchLength();
    if (min > 0 && typed.length < min) {
      return this.showDataBeforeSearch() ? items : [];
    }
    if (term === null || typed.length === 0) return items;
    const trimmed = typed.toLocaleLowerCase();
    const startsWith = this.searchMode() === 'startswith';
    return items.filter((item) =>
      this.searchStrings(item).some((text) => {
        const lower = text.toLocaleLowerCase();
        return startsWith ? lower.startsWith(trimmed) : lower.includes(trimmed);
      }),
    );
  });

  /** Visible items interleaved with group headers for rendering. */
  protected readonly rows = computed<readonly SelectRow<TItem>[]>(() => {
    const items = this.visibleItems();
    const expr = this.groupBy();
    if (expr === undefined) {
      return items.map((item, index) => ({
        kind: 'item' as const,
        item,
        index,
      }));
    }
    const rows: SelectRow<TItem>[] = [];
    let previousKey: string | null = null;
    items.forEach((item, index) => {
      const key = this.groupKeyOf(item);
      if (index === 0 || key !== previousKey) {
        rows.push({ kind: 'group', label: key });
      }
      previousKey = key;
      rows.push({ kind: 'item', item, index });
    });
    return rows;
  });

  /** Index of the keyboard-active option within `visibleItems`. */
  protected readonly activeIndex = signal(-1);
  /** Arrow navigation happened since the last keystroke (custom-value gate). */
  private userNavigated = false;

  protected readonly activeDescendant = computed<string | null>(() =>
    this.opened() && this.activeIndex() >= 0
      ? this.optionId(this.activeIndex())
      : null,
  );

  // --- chevron feature block -------------------------------------------------

  override readonly dropdown: OgeInputDropDownApi = {
    visible: computed(
      () => this.showDropDownButton() && !this.effectiveDisabled(),
    ),
    expanded: computed(() => this.opened()),
    toggle: () => {
      if (this.effectiveDisabled() || this.readonly()) return;
      this.toggle();
      this.focus();
    },
  };

  // --- type-ahead (select-only mode) ----------------------------------------

  private typeBuffer = '';
  private typeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    // `opened` model ↔ panel model, loop-guarded by comparing states first.
    effect(() => {
      const shouldOpen = this.opened();
      untracked(() => {
        if (shouldOpen && !this.panel.isOpen()) {
          this.panel.open();
          this.ensureItemsLoaded();
          // type-ahead / Home / End may have activated an option before this
          // effect ran — only fall back to the selection when nothing is active
          if (this.activeIndex() < 0) this.initActiveFromSelection();
          this.dropDownOpened.emit();
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
    // Debounce searchText into filterText (clears any stale pending timer).
    effect(() => {
      const text = this.searchText();
      untracked(() => {
        if (this.searchTimer !== null) {
          clearTimeout(this.searchTimer);
          this.searchTimer = null;
        }
        const ms = this.searchTimeout() ?? this.config.searchTimeoutMs;
        if (text === null || !ms) {
          this.filterText.set(text);
          return;
        }
        this.searchTimer = setTimeout(() => {
          this.searchTimer = null;
          this.filterText.set(text);
        }, ms);
      });
    });
    // Filtering while open re-anchors the active option.
    effect(() => {
      this.visibleItems();
      untracked(() => {
        if (this.opened()) this.initActiveFromSelection();
      });
    });
    // Becoming disabled/readonly closes an open popup.
    effect(() => {
      const blocked = this.effectiveDisabled() || this.readonly();
      untracked(() => {
        if (blocked && this.panel.isOpen()) this.panel.close('api');
      });
    });
    // selectionChanged fires on every resolved-item change, including
    // programmatic value writes (DevExtreme parity) — but not on init.
    let firstRun = true;
    let previousItem: TItem | null = null;
    effect(() => {
      const item = this.selectedItem();
      untracked(() => {
        if (firstRun) {
          firstRun = false;
          previousItem = item;
          return;
        }
        if (item !== previousItem) {
          this.selectionChanged.emit({ item, previousItem });
          previousItem = item;
        }
      });
    });
    this.destroyRef.onDestroy(() => {
      if (this.typeTimer !== null) clearTimeout(this.typeTimer);
      if (this.searchTimer !== null) clearTimeout(this.searchTimer);
      this.panel.destroy();
    });
  }

  // --- public API ------------------------------------------------------------

  /** Opens the popup (same as `opened.set(true)`). */
  open(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.opened.set(true);
  }

  /** Closes the popup. */
  close(): void {
    this.opened.set(false);
  }

  toggle(): void {
    if (this.opened()) this.close();
    else this.open();
  }

  // --- template handlers -----------------------------------------------------

  protected onFieldClick(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    if (!this.opened()) {
      if (this.openOnFieldClick()) this.open();
      return;
    }
    // while searching, clicks reposition the caret — only select-only toggles
    if (!this.searchEnabled()) this.close();
  }

  protected onNativeInput(event: Event): void {
    if (!this.searchEnabled()) return;
    const text = (event.target as HTMLInputElement).value;
    this.userNavigated = false;
    this.searchText.set(text);
    this.inputChange.emit({ text, event });
    this.searchChanged.emit({ text });
    if (!this.opened()) this.open();
  }

  protected onOptionHover(index: number, item: TItem): void {
    if (!this.isItemDisabled(item)) this.activeIndex.set(index);
  }

  protected selectItem(item: TItem, index: number, event: Event): void {
    if (this.isItemDisabled(item)) return;
    this.itemClick.emit({ item, index, event });
    this.customSelected.set(null);
    this.commitNow(this.itemValue(item), event);
    this.resetSearch();
    this.close();
    this.focus();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const open = this.opened();
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!open) {
          // opening activates the selected option (or the first one) — the
          // opened-sync effect handles it, Alt or not
          this.open();
          return;
        }
        this.userNavigated = true;
        if (event.altKey && event.key === 'ArrowUp') {
          this.commitActive(event);
          return;
        }
        this.moveActive(event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      case 'Enter': {
        if (open) {
          event.preventDefault();
          // typed text wins over the auto-activated option when custom
          // values are on and the user has not arrowed through the list
          if (
            this.acceptCustomValue() &&
            this.searchText() !== null &&
            !this.userNavigated &&
            this.tryCreateCustomItem(event)
          ) {
            return;
          }
          this.commitActive(event);
          return;
        }
        this.handleEnterKey(event);
        return;
      }
      case 'Escape': {
        if (open) {
          event.preventDefault();
          this.close();
          return;
        }
        // two-stage Escape: popup already closed → clear the search text
        if (this.searchText()) {
          event.preventDefault();
          this.resetSearch();
        }
        return;
      }
      case 'Tab': {
        if (open) this.close();
        return;
      }
      case 'Home':
      case 'End': {
        // editable mode: Home/End move the text caret (APG)
        if (this.searchEnabled()) return;
        event.preventDefault();
        this.setActive(
          event.key === 'Home'
            ? this.edgeEnabledIndex(1)
            : this.edgeEnabledIndex(-1),
        );
        if (!open) this.open();
        return;
      }
      case 'PageDown':
      case 'PageUp': {
        if (open) {
          event.preventDefault();
          this.userNavigated = true;
          this.moveActive(event.key === 'PageDown' ? 10 : -10);
        }
        return;
      }
      case ' ': {
        if (this.searchEnabled()) return;
        event.preventDefault();
        if (!open) this.open();
        else this.commitActive(event);
        return;
      }
      default: {
        // select-only type-ahead on printable characters
        if (
          !this.searchEnabled() &&
          event.key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          event.preventDefault();
          this.typeAhead(event.key);
        }
      }
    }
  }

  // --- expression resolution (template-visible) ------------------------------

  protected displayOf(item: TItem): string {
    const expr = this.displayExpr();
    if (typeof expr === 'function') return expr(item);
    if (typeof expr === 'string') {
      return String((item as Record<string, unknown>)[expr] ?? '');
    }
    return typeof item === 'string' ? item : String(item ?? '');
  }

  protected isItemDisabled(item: TItem): boolean {
    const expr = this.disabledExpr();
    if (typeof expr === 'function') return expr(item);
    if (typeof expr === 'string') {
      return Boolean((item as Record<string, unknown>)[expr]);
    }
    return false;
  }

  protected optionId(index: number): string {
    return `${this.inputId}-option-${index}`;
  }

  private itemValue(item: TItem): unknown {
    const expr = this.valueExpr();
    if (typeof expr === 'function') return expr(item);
    if (typeof expr === 'string') {
      return (item as Record<string, unknown>)[expr];
    }
    return item;
  }

  private groupKeyOf(item: TItem): string {
    const expr = this.groupBy();
    if (typeof expr === 'function') return expr(item);
    if (typeof expr === 'string') {
      return String((item as Record<string, unknown>)[expr] ?? '');
    }
    return '';
  }

  private searchStrings(item: TItem): string[] {
    const expr = this.searchExpr();
    if (typeof expr === 'function') return [expr(item)];
    if (typeof expr === 'string') {
      return [String((item as Record<string, unknown>)[expr] ?? '')];
    }
    if (Array.isArray(expr)) {
      return expr.map((key) =>
        String((item as Record<string, unknown>)[key] ?? ''),
      );
    }
    return [this.displayOf(item)];
  }

  // --- lazy items ------------------------------------------------------------

  private ensureItemsLoaded(): void {
    const items = this.items();
    if (typeof items !== 'function') return;
    const state = this.itemsState();
    if (state.status === 'ready' || state.status === 'loading') return;
    const result = items();
    if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
      const runId = ++this.loadSeq;
      this.itemsState.set({ status: 'loading', runId });
      (result as PromiseLike<readonly TItem[]>).then(
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
    } else {
      this.itemsState.set({
        status: 'ready',
        items: result as readonly TItem[],
      });
    }
  }

  // --- custom values ---------------------------------------------------------

  /** Returns `true` when the typed text was handled (created or rejected). */
  private tryCreateCustomItem(event?: Event): boolean {
    const text = (this.searchText() ?? '').trim();
    if (!text) return false;
    // exact display match selects the existing item instead of creating one
    const items = this.resolvedItems();
    const existing = items.find(
      (item) =>
        this.displayOf(item).toLocaleLowerCase() === text.toLocaleLowerCase(),
    );
    if (existing !== undefined) {
      if (!this.isItemDisabled(existing)) {
        this.selectItem(
          existing,
          this.visibleItems().indexOf(existing),
          event ?? new Event('change'),
        );
      }
      return true;
    }
    const payload: OgeSelectBoxCustomItemEvent<TItem> = { text };
    this.customItemCreating.emit(payload);
    const candidate =
      payload.customItem !== undefined
        ? payload.customItem
        : (text as unknown as TItem);
    if (candidate === null) return true; // handler rejected the text
    if (typeof (candidate as PromiseLike<unknown>)?.then === 'function') {
      const runId = ++this.customSeq;
      (candidate as PromiseLike<TItem | null>).then(
        (resolved) => {
          if (runId === this.customSeq && resolved != null) {
            this.applyCustomItem(resolved, event);
          }
        },
        () => undefined,
      );
      return true;
    }
    this.applyCustomItem(candidate as TItem, event);
    return true;
  }

  private applyCustomItem(item: TItem, event?: Event): void {
    this.customSelected.set(item);
    this.commitNow(this.itemValue(item), event);
    this.resetSearch();
    this.close();
  }

  // --- active-option bookkeeping ---------------------------------------------

  private initActiveFromSelection(): void {
    const items = this.visibleItems();
    const selected = this.selectedItem();
    const selectedIndex = selected === null ? -1 : items.indexOf(selected);
    this.setActive(
      selectedIndex >= 0 ? selectedIndex : this.edgeEnabledIndex(1),
    );
  }

  /** First (`direction = 1`) or last (`-1`) enabled index, `-1` when none. */
  private edgeEnabledIndex(direction: 1 | -1): number {
    const items = this.visibleItems();
    const start = direction === 1 ? 0 : items.length - 1;
    for (let i = start; i >= 0 && i < items.length; i += direction) {
      if (!this.isItemDisabled(items[i])) return i;
    }
    return -1;
  }

  private moveActive(delta: number): void {
    const items = this.visibleItems();
    if (items.length === 0) return;
    const direction = delta > 0 ? 1 : -1;
    let index = this.activeIndex();
    if (index < 0) {
      this.setActive(this.edgeEnabledIndex(direction));
      return;
    }
    let remaining = Math.abs(delta);
    while (remaining > 0) {
      let candidate = index + direction;
      while (
        candidate >= 0 &&
        candidate < items.length &&
        this.isItemDisabled(items[candidate])
      ) {
        candidate += direction;
      }
      if (candidate < 0 || candidate >= items.length) break;
      index = candidate;
      remaining--;
    }
    this.setActive(index);
  }

  private setActive(index: number): void {
    this.activeIndex.set(index);
    if (index < 0) return;
    const id = this.optionId(index);
    const schedule =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (callback: FrameRequestCallback) => (callback(0), 0);
    // the option never receives real focus (activedescendant pattern), so it
    // must be scrolled into view manually — after the pending render
    schedule(() =>
      document.getElementById(id)?.scrollIntoView?.({ block: 'nearest' }),
    );
  }

  private commitActive(event: Event): void {
    const items = this.visibleItems();
    const index = this.activeIndex();
    if (index < 0 || index >= items.length) {
      this.close();
      return;
    }
    this.selectItem(items[index], index, event);
  }

  private typeAhead(char: string): void {
    if (!this.opened()) this.open();
    if (this.typeTimer !== null) clearTimeout(this.typeTimer);
    this.typeTimer = setTimeout(() => {
      this.typeBuffer = '';
      this.typeTimer = null;
    }, this.overlayConfig.typeAheadMs);
    const lower = char.toLocaleLowerCase();
    // repeating one character cycles through its matches instead of matching "aa"
    const cycling =
      this.typeBuffer.length > 0 &&
      Array.from(this.typeBuffer).every((c) => c.toLocaleLowerCase() === lower);
    this.typeBuffer += char;
    const query = cycling ? lower : this.typeBuffer.toLocaleLowerCase();
    const items = this.visibleItems();
    if (items.length === 0) return;
    const start = Math.max(this.activeIndex(), 0);
    for (let offset = cycling ? 1 : 0; offset <= items.length; offset++) {
      const index = (start + offset) % items.length;
      const item = items[index];
      if (this.isItemDisabled(item)) continue;
      if (this.displayOf(item).toLocaleLowerCase().startsWith(query)) {
        this.setActive(index);
        return;
      }
    }
  }

  private resetSearch(): void {
    if (this.searchText() !== null) this.searchText.set(null);
  }

  // --- base contract ---------------------------------------------------------

  protected override onFocusChanged(focused: boolean): void {
    if (focused) return;
    // custom values commit on blur; otherwise uncommitted search text
    // reverts to the selected display text
    if (
      this.acceptCustomValue() &&
      this.searchText() !== null &&
      this.tryCreateCustomItem()
    ) {
      return;
    }
    this.resetSearch();
    if (this.opened()) this.close();
  }

  protected nativeElement(): HTMLInputElement | null {
    return this.native()?.nativeElement ?? null;
  }

  protected emptyValue(): unknown {
    return null;
  }

  protected valueIsEmpty(value: unknown): boolean {
    return value == null;
  }
}
