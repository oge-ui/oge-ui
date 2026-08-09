import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  edgeEnabledIndex,
  fitToolbarItems,
  stepEnabledIndex,
  type DataSource,
  type OgeToolbarFitResult,
} from '@oge-ui/core';
import {
  OgeAnchoredPanel,
  OgeMenuList,
  OgePopup,
  type OgeMenuCloseRequestEvent,
  type OgeMenuItem,
  type OgeMenuListItemClickEvent,
  type OgePopupCloseReason,
} from '@oge-ui/overlay';
import { OgeElementAttrs } from '../attrs';
import { OGE_TOOLBAR_CONFIG, type OgeToolbarMessages } from './config';
import type { OgeToolbarDescriptor } from './toolbar-descriptor';
import { OgeToolbarItem } from './toolbar-item';
import {
  OgeToolbarItemTemplate,
  OgeToolbarMenuItemTemplate,
} from './templates';
import type {
  OgeToolbarDisplayMode,
  OgeToolbarItemActiveChangedEvent,
  OgeToolbarItemClickEvent,
  OgeToolbarItemData,
  OgeToolbarItemHoldEvent,
  OgeToolbarItemLocation,
  OgeToolbarMenuClosedEvent,
  OgeToolbarMenuClosingEvent,
  OgeToolbarMenuOpeningEvent,
  OgeToolbarOrientation,
  OgeToolbarOverflow,
  OgeToolbarOverflowChangedEvent,
  OgeToolbarSize,
  OgeToolbarStylingMode,
} from './toolbar-types';

let nextToolbarId = 0;

/** Elements the roving tabindex may land on. */
const STOP_SELECTOR = 'button, [href], input, select, textarea, [tabindex]';

/**
 * WAI-ARIA APG toolbar: a `role="toolbar"` container with a roving tabindex,
 * three location groups and — unlike the presentation-only reference
 * toolbars — an overflow menu for the commands that stop fitting.
 *
 * Items come from declarative `<oge-toolbar-item>` children, from a
 * data-driven `[items]` array, or both (children first); anything the item
 * model does not describe is projected into the `[ogeToolbarBefore]`,
 * `[ogeToolbarCenter]` and `[ogeToolbarAfter]` slots:
 *
 * ```html
 * <oge-toolbar ariaLabel="Document actions">
 *   <oge-toolbar-item text="Add" (itemClick)="add()" />
 *   <oge-toolbar-item type="separator" />
 *   <oge-toolbar-item text="Export" location="after" />
 *   <oge-select-box ogeToolbarAfter [items]="views" />
 * </oge-toolbar>
 * ```
 *
 * Projected slot content always stays on the bar — only items the toolbar
 * owns can move into the menu, because only those can be re-stamped there.
 *
 * **Projecting a conditional group:** Angular projects an `@if` block with
 * more than one root node into the *default* slot, even when every root
 * carries the slot attribute (verified against Angular 22). Wrap such a group
 * in one element — `.oge-toolbar-cluster` lays it out like the bar itself:
 *
 * ```html
 * @if (hasPendingChanges()) {
 *   <span ogeToolbarAfter class="oge-toolbar-cluster">
 *     <button type="button">Save</button>
 *     <button type="button">Discard</button>
 *   </span>
 * }
 * ```
 */
@Component({
  selector: 'oge-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgePopup, OgeMenuList, OgeElementAttrs],
  styleUrl: './toolbar.scss',
  host: {
    class: 'oge-toolbar',
    role: 'toolbar',
    '[class.oge-toolbar-vertical]': "orientation() === 'vertical'",
    '[class.oge-toolbar-wrap]': "overflow() === 'wrap'",
    '[class.oge-toolbar-scroll]': "overflow() === 'scroll'",
    '[class.oge-toolbar-extended]': "overflow() === 'extended'",
    '[class.oge-toolbar-sm]': "size() === 'sm'",
    '[class.oge-toolbar-lg]': "size() === 'lg'",
    '[class.oge-toolbar-filled]': "stylingMode() === 'filled'",
    '[class.oge-toolbar-flat]': "stylingMode() === 'flat'",
    '[class.oge-disabled]': 'disabled()',
    '[attr.aria-orientation]':
      "orientation() === 'vertical' ? 'vertical' : null",
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-labelledby]': 'ariaLabelledBy() ?? null',
    '[attr.aria-disabled]': 'disabled() ? true : null',
    '(keydown)': 'onKeydown($event)',
    '(focusin)': 'onFocusIn($event)',
  },
  template: `
    <div class="oge-toolbar-defs" hidden><ng-content /></div>

    @if (scrollArrows()) {
      <button
        type="button"
        class="oge-toolbar-scroll-btn oge-toolbar-scroll-back"
        [attr.aria-label]="msg().scrollBackward"
        [title]="msg().scrollBackward"
        [disabled]="!canScrollBack() || disabled()"
        (click)="scrollStepBy(-1)"
      >
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m10 4-4 4 4 4" />
        </svg>
      </button>
    }

    <div class="oge-toolbar-sections" #sections (scroll)="measureScroll()">
      <div class="oge-toolbar-section oge-toolbar-section-before">
        <ng-content select="[ogeToolbarBefore]" />
        @for (d of beforeItems(); track d.id) {
          <ng-container
            *ngTemplateOutlet="itemTpl; context: { $implicit: d }"
          />
        }
      </div>
      <div class="oge-toolbar-section oge-toolbar-section-center">
        <ng-content select="[ogeToolbarCenter]" />
        @for (d of centerItems(); track d.id) {
          <ng-container
            *ngTemplateOutlet="itemTpl; context: { $implicit: d }"
          />
        }
      </div>
      <div class="oge-toolbar-section oge-toolbar-section-after">
        <ng-content select="[ogeToolbarAfter]" />
        @for (d of afterItems(); track d.id) {
          <ng-container
            *ngTemplateOutlet="itemTpl; context: { $implicit: d }"
          />
        }
      </div>
      @if (isEmpty()) {
        <div class="oge-toolbar-empty">{{ msg().noData }}</div>
      }
    </div>

    @if (scrollArrows()) {
      <button
        type="button"
        class="oge-toolbar-scroll-btn oge-toolbar-scroll-forward"
        [attr.aria-label]="msg().scrollForward"
        [title]="msg().scrollForward"
        [disabled]="!canScrollForward() || disabled()"
        (click)="scrollStepBy(1)"
      >
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m6 4 4 4-4 4" />
        </svg>
      </button>
    }

    @if (extendedToggleVisible()) {
      <button
        type="button"
        class="oge-toolbar-extend-btn"
        [class.oge-toolbar-extend-open]="extendedOpen()"
        [attr.aria-label]="msg().moreCommands"
        [title]="msg().moreCommands"
        [attr.aria-expanded]="extendedOpen()"
        [attr.aria-controls]="extendedRowId"
        [disabled]="disabled()"
        (click)="toggleExtendedRow()"
      >
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
    }

    @if (extendedToggleVisible() && extendedOpen()) {
      <div class="oge-toolbar-extended-row" [id]="extendedRowId">
        @for (d of menuDescriptors(); track d.id) {
          <ng-container
            *ngTemplateOutlet="itemTpl; context: { $implicit: d }"
          />
        }
      </div>
    }

    @if (menuVisible()) {
      <button
        #menuButton
        type="button"
        class="oge-toolbar-menu-btn"
        [attr.aria-label]="msg().overflowMenu"
        [title]="msg().overflowMenu"
        [attr.aria-haspopup]="'menu'"
        [attr.aria-expanded]="menuOpen()"
        [attr.aria-controls]="menuOpen() ? menuPanel.panelId : null"
        [disabled]="disabled()"
        (click)="toggleMenu($event)"
      >
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="3" cy="8" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="13" cy="8" r="1.4" />
        </svg>
      </button>
      @if (menuOpen()) {
        <oge-popup [panel]="menuPanel">
          <oge-menu-list
            [items]="menuItems()"
            [ariaLabel]="msg().overflowMenu"
            [itemTemplate]="menuItemTemplate() ? menuRow : undefined"
            (itemClick)="onMenuItemClick($event)"
            (closeRequest)="onMenuCloseRequest($event)"
          />
        </oge-popup>
      }
    }

    <ng-template #menuRow let-index="index">
      <ng-container
        *ngTemplateOutlet="
          menuItemTemplate()!.templateRef;
          context: menuContextAt(index)
        "
      />
    </ng-template>

    <ng-template #itemTpl let-d>
      <div
        class="oge-toolbar-item"
        [class.oge-toolbar-item-spacer]="d.type === 'spacer'"
        [class.oge-toolbar-item-separator]="d.type === 'separator'"
        [class.oge-toolbar-item-custom]="!!d.contentTemplate"
        [class]="d.cssClass ?? ''"
        [attr.data-item-id]="d.id"
        [style.inline-size]="itemWidth(d)"
        [ogeAttrs]="d.htmlAttributes"
        (pointerdown)="onItemPointerDown(d, $event)"
        (pointerup)="cancelHold()"
        (pointerleave)="cancelHold()"
        (pointercancel)="cancelHold()"
        (contextmenu)="onItemContextMenu(d, $event)"
      >
        @if (d.contentTemplate) {
          <ng-container
            *ngTemplateOutlet="
              d.contentTemplate;
              context: { $implicit: d.item, index: d.index, inMenu: false }
            "
          />
        } @else if (itemTemplate() && d.item) {
          <ng-container
            *ngTemplateOutlet="
              itemTemplate()!.templateRef;
              context: { $implicit: d.item, index: d.index, inMenu: false }
            "
          />
        } @else {
          @switch (d.type) {
            @case ('separator') {
              <span
                class="oge-toolbar-separator"
                role="separator"
                [attr.aria-orientation]="
                  orientation() === 'vertical' ? 'horizontal' : 'vertical'
                "
              ></span>
            }
            @case ('spacer') {
              <span class="oge-toolbar-gap" aria-hidden="true"></span>
            }
            @case ('label') {
              <span class="oge-toolbar-label">{{ d.text }}</span>
            }
            @default {
              <button
                type="button"
                class="oge-toolbar-btn"
                [class.oge-toolbar-btn-accent]="d.severity === 'accent'"
                [class.oge-toolbar-btn-danger]="d.severity === 'danger'"
                [class.oge-toolbar-btn-icon-only]="!textVisible(d)"
                [disabled]="d.disabled || disabled()"
                [attr.aria-pressed]="d.active === undefined ? null : d.active"
                [attr.aria-label]="textVisible(d) ? null : (d.text ?? null)"
                [attr.title]="
                  d.hint ?? (textVisible(d) ? null : d.text) ?? null
                "
                (click)="activate(d, $event, false)"
              >
                @if (iconVisible(d)) {
                  @if (d.iconClass) {
                    <i
                      class="oge-toolbar-icon"
                      [class]="d.iconClass"
                      aria-hidden="true"
                    ></i>
                  } @else if (d.icon) {
                    <svg
                      class="oge-toolbar-icon"
                      viewBox="0 0 16 16"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path [attr.d]="d.icon" />
                    </svg>
                  }
                }
                @if (textVisible(d)) {
                  <span class="oge-toolbar-btn-text">{{ d.text }}</span>
                }
                @if (iconVisible(d)) {
                  @if (d.suffixIconClass) {
                    <i
                      class="oge-toolbar-icon oge-toolbar-icon-suffix"
                      [class]="d.suffixIconClass"
                      aria-hidden="true"
                    ></i>
                  } @else if (d.suffixIcon) {
                    <svg
                      class="oge-toolbar-icon oge-toolbar-icon-suffix"
                      viewBox="0 0 16 16"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path [attr.d]="d.suffixIcon" />
                    </svg>
                  }
                }
              </button>
            }
          }
        }
      </div>
    </ng-template>
  `,
})
export class OgeToolbar {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly config = inject(OGE_TOOLBAR_CONFIG);

  /** DOM id prefix; also the fallback identity of auto-keyed items. */
  readonly toolbarId = `oge-toolbar-${nextToolbarId++}`;

  /** Data-driven entries, merged after the declarative children. */
  readonly items = input<readonly OgeToolbarItemData[] | undefined>(undefined);
  /**
   * Remote command list. Loaded once through `@oge-ui/core`'s `DataSource`
   * contract and merged after `items`; a source that publishes `changes`
   * triggers a reload.
   */
  readonly dataSource = input<DataSource<OgeToolbarItemData> | undefined>(
    undefined,
  );
  /** Main axis — drives the arrow keys and `aria-orientation`. */
  readonly orientation = input<OgeToolbarOrientation>('horizontal');
  /**
   * What happens when the items outgrow the toolbar: `'menu'` collapses them
   * into an overflow menu, `'wrap'` flows onto more lines (the reference
   * `multiline` mode), `'none'` lets the row overflow.
   */
  readonly overflow = input<OgeToolbarOverflow>('menu');
  /** Disables every item and takes the toolbar out of the Tab sequence. */
  readonly disabled = input(false);
  /** Density preset. */
  readonly size = input<OgeToolbarSize>(this.config.size ?? 'md');
  /** Container chrome preset. */
  readonly stylingMode = input<OgeToolbarStylingMode>(
    this.config.stylingMode ?? 'outlined',
  );
  /** Default for every item's `showText`. */
  readonly showText = input<OgeToolbarDisplayMode>('always');
  /** Default for every item's `showIcon`. */
  readonly showIcon = input<OgeToolbarDisplayMode>('always');
  /** Whether arrow navigation wraps around the ends (APG: optional). */
  readonly wrap = input(true);
  /**
   * Turns the arrow/Home/End handling off entirely. The controls then keep
   * their natural Tab order instead of a roving tabindex.
   */
  readonly keyboardNavigation = input(true);
  /** Pixels a scroll button moves the row in `overflow: 'scroll'`. */
  readonly scrollStep = input(120);
  /** Milliseconds a pointer must rest on an item before `itemHold` fires. */
  readonly itemHoldTimeout = input(750);
  /** Accessible name; falls back to `messages.toolbar`. */
  readonly ariaLabel = input<string | undefined>(undefined);
  /** Id of a visible label — wins over `ariaLabel` when both are set. */
  readonly ariaLabelledBy = input<string | undefined>(undefined);
  /** Per-instance overrides of the config strings. */
  readonly messages = input<Partial<OgeToolbarMessages> | undefined>(undefined);

  /** An item was activated, on the bar or from the overflow menu. */
  readonly itemClick = output<OgeToolbarItemClickEvent>();
  /** Cancelable — set `cancel` to keep the overflow menu closed. */
  readonly menuOpening = output<OgeToolbarMenuOpeningEvent>();
  /** The overflow menu opened. */
  readonly menuOpened = output<void>();
  /** Cancelable — set `cancel` to keep the overflow menu open. */
  readonly menuClosing = output<OgeToolbarMenuClosingEvent>();
  /** The overflow menu closed. */
  readonly menuClosed = output<OgeToolbarMenuClosedEvent>();
  /** The set of items living in the overflow menu changed. */
  readonly overflowChanged = output<OgeToolbarOverflowChangedEvent>();
  /** A toggle item's pressed state changed. */
  readonly activeChanged = output<OgeToolbarItemActiveChangedEvent>();
  /** An item was held for `itemHoldTimeout` (touch long-press or mouse hold). */
  readonly itemHold = output<OgeToolbarItemHoldEvent>();
  /** An item was right-clicked / long-pressed for a context menu. */
  readonly itemContextMenu = output<OgeToolbarItemHoldEvent>();

  private readonly declaredItems = contentChildren(OgeToolbarItem);
  /**
   * Replaces the default rendering of every `items` entry. Queried with
   * `descendants: false` so it cannot steal an `<oge-toolbar-item>` child's
   * own template — the same slot directive is legal in both places.
   */
  protected readonly itemTemplate = contentChild(OgeToolbarItemTemplate, {
    descendants: false,
  });
  /** Replaces the default rendering of an item inside the overflow menu. */
  protected readonly menuItemTemplate = contentChild(
    OgeToolbarMenuItemTemplate,
    {
      descendants: false,
    },
  );

  private readonly sectionsEl = viewChild<ElementRef<HTMLElement>>('sections');
  private readonly menuButton =
    viewChild<ElementRef<HTMLElement>>('menuButton');
  private readonly popupRef = viewChild(OgePopup, { read: ElementRef });

  private readonly containerSize = signal(0);
  private readonly menuButtonSize = signal(0);
  private readonly gapSize = signal(0);
  private readonly itemSizes = signal<ReadonlyMap<string, number>>(new Map());

  protected readonly menuOpen = signal(false);
  protected readonly extendedOpen = signal(false);
  protected readonly canScrollBack = signal(false);
  protected readonly canScrollForward = signal(false);
  protected readonly hasScrollOverflow = signal(false);

  /** DOM id of the second row, for the toggle's `aria-controls`. */
  readonly extendedRowId = `${this.toolbarId}-extended`;

  /** Rows loaded from `dataSource`, merged after `items`. */
  private readonly loadedItems = signal<readonly OgeToolbarItemData[]>([]);
  /** Entries added through `addItem()`, merged last. */
  private readonly addedItems = signal<readonly OgeToolbarItemData[]>([]);
  /**
   * Per-id overrides written by `hideItem()` / `enableItem()`. `items` stays
   * the source of truth — this layer sits on top of it, so a re-supplied array
   * does not silently undo an imperative call.
   */
  private readonly overrides = signal<
    ReadonlyMap<string, { visible?: boolean; disabled?: boolean }>
  >(new Map());

  /** Index into the current stop list that holds the single `tabindex="0"`. */
  private readonly focusedStop = signal(0);

  protected readonly msg = computed<OgeToolbarMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  protected readonly resolvedAriaLabel = computed(() =>
    this.ariaLabelledBy() ? null : (this.ariaLabel() ?? this.msg().toolbar),
  );

  /** Declarative children first, then `items` — the house merge order. */
  protected readonly descriptors = computed<readonly OgeToolbarDescriptor[]>(
    () => {
      const overrides = this.overrides();
      const fromChildren = this.declaredItems()
        .filter((item) => {
          const override = overrides.get(item.key() ?? item.autoId);
          return (override?.visible ?? item.visible()) !== false;
        })
        .map((item) => ({
          id: item.key() ?? item.autoId,
          key: item.key(),
          type: item.type(),
          text: item.text(),
          icon: item.icon(),
          hint: item.hint(),
          location: item.location(),
          locateInMenu: item.locateInMenu(),
          overflowPriority: item.overflowPriority(),
          showText: item.showText(),
          showIcon: item.showIcon(),
          disabled:
            overrides.get(item.key() ?? item.autoId)?.disabled ??
            item.disabled(),
          cssClass: item.cssClass(),
          severity: item.severity(),
          active: item.active(),
          suffixIcon: item.suffixIcon(),
          iconClass: item.iconClass(),
          suffixIconClass: item.suffixIconClass(),
          width: item.width(),
          htmlAttributes: item.htmlAttributes(),
          item: undefined,
          source: item,
          contentTemplate: item.contentTemplate()?.templateRef,
        }));
      const dataItems = [
        ...(this.items() ?? []),
        ...this.loadedItems(),
        ...this.addedItems(),
      ];
      const fromItems = dataItems
        .map((item, index) => ({ item, index }))
        .filter(({ item, index }) => {
          const override = overrides.get(item.key ?? `i${index}`);
          return (override?.visible ?? item.visible) !== false;
        })
        .map(({ item, index }) => ({
          id: item.key ?? `i${index}`,
          key: item.key,
          type: item.type ?? ('button' as const),
          text: item.text,
          icon: item.icon,
          suffixIcon: item.suffixIcon,
          iconClass: item.iconClass,
          suffixIconClass: item.suffixIconClass,
          hint: item.hint,
          width: item.width,
          htmlAttributes: item.htmlAttributes,
          location: item.location ?? ('before' as const),
          locateInMenu: item.locateInMenu ?? ('auto' as const),
          overflowPriority: item.overflowPriority,
          showText: item.showText,
          showIcon: item.showIcon,
          disabled:
            overrides.get(item.key ?? `i${index}`)?.disabled ??
            item.disabled ??
            false,
          cssClass: item.cssClass,
          severity: item.severity ?? ('default' as const),
          active: item.active,
          item,
          source: undefined,
          contentTemplate: undefined,
        }));
      return [...fromChildren, ...fromItems].map((d, index) => ({
        ...d,
        index,
      }));
    },
  );

  /**
   * Whether the projection slots hold anything. `ng-content` has no signal
   * counterpart and Angular 22 has no per-render hook (`afterRender` is gone;
   * `afterRenderEffect` only re-runs for its own dependencies), so the slots
   * are watched with a `MutationObserver` — the empty notice must not appear
   * next to content the toolbar does not own.
   */
  private readonly hasSlotContent = signal(false);

  protected readonly isEmpty = computed(
    () => this.descriptors().length === 0 && !this.hasSlotContent(),
  );

  /** Descriptors in visual order — the order the fitting math reasons about. */
  private readonly ordered = computed<readonly OgeToolbarDescriptor[]>(() => {
    const ds = this.descriptors();
    return [
      ...ds.filter((d) => d.location === 'before'),
      ...ds.filter((d) => d.location === 'center'),
      ...ds.filter((d) => d.location === 'after'),
    ];
  });

  /** Only these two modes take entries off the bar. */
  private readonly collapses = computed(
    () => this.overflow() === 'menu' || this.overflow() === 'extended',
  );

  private readonly fit = computed<OgeToolbarFitResult>(() => {
    const ordered = this.ordered();
    if (!this.collapses()) {
      return {
        inline: ordered.map((_, i) => i),
        inMenu: [],
        menuVisible: false,
      };
    }
    const sizes = this.itemSizes();
    return fitToolbarItems({
      containerSize: this.containerSize(),
      items: ordered.map((d) => ({
        // an unmeasured item is treated as free, so it renders inline once
        // and is measured on the next frame instead of guessing at its width
        size: sizes.get(d.id) ?? 0,
        policy: d.locateInMenu,
        priority: d.overflowPriority,
      })),
      menuButtonSize: this.menuButtonSize(),
      gap: this.gapSize(),
    });
  });

  /** Scroll buttons are `overflow: 'scroll'` only, and only when needed. */
  protected readonly scrollArrows = computed(
    () => this.overflow() === 'scroll' && this.hasScrollOverflow(),
  );

  private readonly inlineIds = computed(() => {
    const ordered = this.ordered();
    return new Set(this.fit().inline.map((i) => ordered[i].id));
  });

  protected readonly menuDescriptors = computed<
    readonly OgeToolbarDescriptor[]
  >(() => {
    const ordered = this.ordered();
    return this.fit().inMenu.map((i) => ordered[i]);
  });

  protected readonly menuVisible = computed(
    () => this.overflow() === 'menu' && this.menuDescriptors().length > 0,
  );

  protected readonly extendedToggleVisible = computed(
    () => this.overflow() === 'extended' && this.menuDescriptors().length > 0,
  );

  protected readonly beforeItems = computed(() => this.inlineIn('before'));
  protected readonly centerItems = computed(() => this.inlineIn('center'));
  protected readonly afterItems = computed(() => this.inlineIn('after'));

  protected readonly menuItems = computed<OgeMenuItem<number>[]>(() =>
    this.menuDescriptors().map((d) => ({
      text: this.menuTextVisible(d) ? (d.text ?? '') : '',
      value: d.index,
      icon: this.menuIconVisible(d) ? d.icon : undefined,
      iconClass: this.menuIconVisible(d) ? d.iconClass : undefined,
      hint: d.hint,
      disabled: d.disabled || this.disabled(),
      separator: d.type === 'separator' || d.type === 'spacer',
      severity: d.severity === 'danger' ? ('danger' as const) : undefined,
      checked: d.active,
    })),
  );

  readonly menuPanel = new OgeAnchoredPanel({
    anchor: () => this.menuButton()?.nativeElement ?? null,
    panel: () => this.popupRef()?.nativeElement ?? null,
    restoreFocus: () => this.menuButton()?.nativeElement.focus(),
    onClosed: (reason) => {
      this.menuOpen.set(false);
      this.menuClosed.emit({ reason });
    },
  });

  private previousMenuKeys = '';

  /**
   * Writing direction, read once per measure pass instead of per keystroke.
   * `getComputedStyle` forces a style recalculation, and the arrow keys are
   * the hottest path this component has.
   */
  private rtl = false;
  /** Host padding on the main axis, refreshed with the other style metrics. */
  private paddingSize = 0;

  /**
   * The focusable stops, cached between DOM changes. Rebuilding this list
   * walks the whole subtree, and it is needed on every render pass *and*
   * every arrow key — recomputing it per call is the difference between one
   * traversal per mutation and one per keystroke.
   */
  private stopCache: HTMLElement[] | null = null;

  /** Coalesces resize bursts into one measure per frame. */
  private measureFrame: number | null = null;

  constructor() {
    afterNextRender(() => {
      // ResizeObserver is absent in the jsdom test environment (measured, not
      // assumed) — the toolbar then simply keeps every item inline.
      if (typeof ResizeObserver !== 'undefined') {
        // A drag-resize fires this many times per frame; measuring on each
        // one would read layout repeatedly for a single painted result.
        const observer = new ResizeObserver(() => this.scheduleMeasure());
        observer.observe(this.host.nativeElement);
        this.destroyRef.onDestroy(() => observer.disconnect());
      }
      this.measure();
      const sections = this.sectionsEl()?.nativeElement;
      if (sections && typeof MutationObserver !== 'undefined') {
        // Only the three section elements' direct children matter: slot
        // content lands there. `subtree` would also fire for every icon and
        // label the toolbar renders itself.
        const observer = new MutationObserver(() => {
          this.stopCache = null;
          this.detectSlotContent();
        });
        for (const section of Array.from(sections.children)) {
          observer.observe(section, { childList: true });
        }
        this.destroyRef.onDestroy(() => observer.disconnect());
      }
      this.detectSlotContent();
    });
    // Measurement and focus are deliberately two effects. Moving the roving
    // anchor changes `focusedStop` on every arrow key; if that shared one
    // effect with the measure pass, every keystroke would force a style
    // recalculation for a layout that cannot have changed.
    afterRenderEffect(() => {
      this.descriptors();
      this.overflow();
      this.orientation();
      // The density presets move the padding and gap custom properties, which
      // is the other half of what `measureStyleMetrics` reads.
      this.size();
      this.stylingMode();
      untracked(() => {
        this.stopCache = null;
        this.measure();
      });
    });
    // Reporting tracks the menu contents themselves, not the inputs that
    // happen to change them: the set also moves when nothing but the container
    // width did, and a resize never re-runs the measure effect above.
    afterRenderEffect(() => {
      this.menuDescriptors();
      untracked(() => this.reportOverflow());
    });
    afterRenderEffect(() => {
      this.focusedStop();
      this.disabled();
      this.keyboardNavigation();
      this.descriptors();
      untracked(() => this.applyRovingTabindex());
    });
    // Remote command list. `load({})` is enough — a toolbar has no paging,
    // sorting or filtering to push down — and a source that publishes
    // `changes` re-loads.
    effect((onCleanup) => {
      const source = this.dataSource();
      if (!source) {
        this.loadedItems.set([]);
        return;
      }
      let stale = false;
      const reload = () => {
        void source.load({}).then((result) => {
          // a toolbar never groups, so the flat arm of LoadResult is the only
          // one that can come back here
          if (!stale) {
            this.loadedItems.set(result.data as readonly OgeToolbarItemData[]);
          }
        });
      };
      reload();
      const subscription = source.changes?.subscribe(() => reload());
      onCleanup(() => {
        stale = true;
        subscription?.unsubscribe();
      });
    });
    this.destroyRef.onDestroy(() => {
      this.cancelHold();
      if (
        this.measureFrame !== null &&
        typeof cancelAnimationFrame === 'function'
      ) {
        cancelAnimationFrame(this.measureFrame);
      }
      this.menuPanel.destroy();
    });
  }

  /** Focuses the toolbar's current roving-tabindex stop. */
  focus(): void {
    const stops = this.stops();
    stops[this.activeStop(stops)]?.focus();
  }

  /** Opens the overflow menu, subject to `menuOpening`. */
  openMenu(event?: Event): void {
    if (this.menuOpen() || !this.menuVisible() || this.disabled()) return;
    const pre: OgeToolbarMenuOpeningEvent = { cancel: false, event };
    this.menuOpening.emit(pre);
    if (pre.cancel) return;
    this.menuOpen.set(true);
    this.menuPanel.open();
    this.menuOpened.emit();
  }

  /** Closes the overflow menu, subject to `menuClosing`. */
  closeMenu(reason: OgePopupCloseReason = 'api'): void {
    if (!this.menuOpen()) return;
    const pre: OgeToolbarMenuClosingEvent = { cancel: false, reason };
    this.menuClosing.emit(pre);
    if (pre.cancel) return;
    this.menuPanel.close(reason);
  }

  /** Opens the overflow menu when closed, closes it otherwise. */
  toggleMenu(event?: Event): void {
    if (this.menuOpen()) this.closeMenu('api');
    else this.openMenu(event);
  }

  /**
   * Re-measures the toolbar and recomputes what fits. Signal changes and
   * container resizes already do this; call it after something the toolbar
   * cannot observe changed a control's size — a late-loading web font, a
   * stylesheet swap, a theme change.
   */
  refreshOverflow(): void {
    this.itemSizes.set(new Map());
    this.measure();
  }

  /**
   * Appends a runtime entry. `items` stays the declared source of truth;
   * entries added here are merged after it, so a re-supplied `items` array
   * does not drop them.
   */
  addItem(item: OgeToolbarItemData): void {
    this.addedItems.set([...this.addedItems(), item]);
  }

  /** Removes an entry added by `addItem()`, or hides an `items` entry. */
  removeItem(key: string): void {
    const added = this.addedItems();
    if (added.some((item) => item.key === key)) {
      this.addedItems.set(added.filter((item) => item.key !== key));
      return;
    }
    this.hideItem(key, true);
  }

  /**
   * Hides (or re-shows) an entry without touching the `items` array. Works for
   * both sources, so it needs a `key`: the auto id of a keyless
   * `<oge-toolbar-item>` is internal and cannot be addressed.
   */
  hideItem(key: string, hidden = true): void {
    this.override(key, { visible: !hidden });
  }

  /**
   * Enables (or disables) an entry without touching the `items` array. Like
   * {@link hideItem}, it addresses either source by `key`.
   */
  enableItem(key: string, enabled = true): void {
    this.override(key, { disabled: !enabled });
  }

  /** Drops every `hideItem()` / `enableItem()` override. */
  clearItemOverrides(): void {
    this.overrides.set(new Map());
  }

  private override(
    key: string,
    patch: { visible?: boolean; disabled?: boolean },
  ): void {
    const next = new Map(this.overrides());
    next.set(key, { ...next.get(key), ...patch });
    this.overrides.set(next);
  }

  /** Shows or hides the second row of `overflow: 'extended'`. */
  toggleExtendedRow(): void {
    this.extendedOpen.set(!this.extendedOpen());
  }

  protected scrollStepBy(direction: 1 | -1): void {
    const el = this.sectionsEl()?.nativeElement;
    if (!el) return;
    const vertical = this.orientation() === 'vertical';
    const amount = this.scrollStep() * direction;
    if (vertical) {
      el.scrollTop += amount;
    } else {
      el.scrollLeft += this.rtl ? -amount : amount;
    }
    this.measureScroll();
  }

  /** `showText` resolved for the bar: `'always'` and `'onBar'` show it there. */
  protected textVisible(d: OgeToolbarDescriptor): boolean {
    const mode = d.showText ?? this.showText();
    return (mode === 'always' || mode === 'onBar') && d.text !== undefined;
  }

  /** `showText` resolved for a menu row: `'always'` and `'inMenu'` show it. */
  protected menuTextVisible(d: OgeToolbarDescriptor): boolean {
    const mode = d.showText ?? this.showText();
    return mode === 'always' || mode === 'inMenu';
  }

  /** `showIcon` resolved for the bar: `'always'` and `'onBar'` show it there. */
  protected iconVisible(d: OgeToolbarDescriptor): boolean {
    const mode = d.showIcon ?? this.showIcon();
    return mode === 'always' || mode === 'onBar';
  }

  /**
   * `showIcon` resolved for a menu row — the icon twin of `menuTextVisible`.
   * Without it a command lost its icon the moment it collapsed into the menu.
   */
  protected menuIconVisible(d: OgeToolbarDescriptor): boolean {
    const mode = d.showIcon ?? this.showIcon();
    return mode === 'always' || mode === 'inMenu';
  }

  private holdTimer: ReturnType<typeof setTimeout> | null = null;

  protected onItemPointerDown(
    d: OgeToolbarDescriptor,
    event: PointerEvent,
  ): void {
    this.cancelHold();
    if (d.disabled || this.disabled()) return;
    this.holdTimer = setTimeout(() => {
      this.holdTimer = null;
      this.itemHold.emit(this.itemEventFor(d, event));
    }, this.itemHoldTimeout());
  }

  protected cancelHold(): void {
    if (this.holdTimer === null) return;
    clearTimeout(this.holdTimer);
    this.holdTimer = null;
  }

  protected onItemContextMenu(d: OgeToolbarDescriptor, event: Event): void {
    this.cancelHold();
    if (d.disabled || this.disabled()) return;
    this.itemContextMenu.emit(this.itemEventFor(d, event));
  }

  private itemEventFor(
    d: OgeToolbarDescriptor,
    event: Event,
  ): OgeToolbarItemHoldEvent {
    return { index: d.index, key: d.key, item: d.item, event };
  }

  /** `width` as a CSS length: a bare number is pixels. */
  protected itemWidth(d: OgeToolbarDescriptor): string | null {
    const width = d.width;
    if (width === undefined) return null;
    return typeof width === 'number' ? `${width}px` : width;
  }

  protected menuContextAt(index: number) {
    const d = this.menuDescriptors()[index];
    return { $implicit: d?.item, index: d?.index ?? index, inMenu: true };
  }

  protected activate(
    d: OgeToolbarDescriptor,
    event: Event,
    inMenu: boolean,
  ): void {
    if (d.disabled || this.disabled()) return;
    const payload: OgeToolbarItemClickEvent = {
      index: d.index,
      key: d.key,
      item: d.item,
      inMenu,
      event,
    };
    this.itemClick.emit(payload);
    d.source?.itemClick.emit(payload);

    // A defined `active` is what makes an item a toggle (the reference
    // `toggleable` flag); every activation flips it.
    if (d.active === undefined) return;
    const active = !d.active;
    const change: OgeToolbarItemActiveChangedEvent = {
      index: d.index,
      key: d.key,
      item: d.item,
      active,
      event,
    };
    // declarative children own a two-way model; `items` entries are data the
    // toolbar must not mutate, so the app applies the change
    d.source?.active.set(active);
    d.source?.activeChanged.emit(change);
    this.activeChanged.emit(change);
  }

  protected onMenuItemClick(event: OgeMenuListItemClickEvent): void {
    const index = event.item.value as number;
    const d = this.descriptors().find((entry) => entry.index === index);
    this.closeMenu('select');
    if (d) this.activate(d, event.event, true);
  }

  protected onMenuCloseRequest(event: OgeMenuCloseRequestEvent): void {
    this.closeMenu(event.reason);
  }

  /** Keeps the roving anchor on whatever the user actually focused. */
  protected onFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const stops = this.stops();
    const index = stops.findIndex((el) => el === target || el.contains(target));
    if (index !== -1) this.focusedStop.set(index);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled() || !this.keyboardNavigation()) return;
    // A text-entry control owns its arrow and Home/End keys for caret
    // movement — the APG warns against stealing them, and the grid's search
    // box lives on this toolbar.
    if (isTextEntry(event.target)) return;
    const stops = this.stops();
    if (stops.length === 0) return;

    const vertical = this.orientation() === 'vertical';
    const rtl = this.rtl;
    const nextKey = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    const prevKey = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
    const current = this.activeStop(stops);
    const disabledAt = (i: number) => isStopDisabled(stops[i]);

    let target: number | null = null;
    if (event.key === nextKey) {
      target = stepEnabledIndex(
        stops.length,
        current,
        1,
        disabledAt,
        this.wrap(),
      );
    } else if (event.key === prevKey) {
      target = stepEnabledIndex(
        stops.length,
        current,
        -1,
        disabledAt,
        this.wrap(),
      );
    } else if (event.key === 'Home') {
      target = edgeEnabledIndex(stops.length, 1, disabledAt);
    } else if (event.key === 'End') {
      target = edgeEnabledIndex(stops.length, -1, disabledAt);
    } else {
      return;
    }

    event.preventDefault();
    if (target === null || target === current) return;
    this.focusedStop.set(target);
    stops[target].focus();
  }

  private inlineIn(
    location: OgeToolbarItemLocation,
  ): readonly OgeToolbarDescriptor[] {
    const inline = this.inlineIds();
    return this.descriptors().filter(
      (d) => d.location === location && inline.has(d.id),
    );
  }

  /**
   * Anything inside a section that is not one of the toolbar's own item
   * wrappers came from a projection slot.
   */
  private detectSlotContent(): void {
    const sections = this.sectionsEl()?.nativeElement;
    if (!sections) return;
    const found = Array.from(
      sections.querySelectorAll<HTMLElement>('.oge-toolbar-section > *'),
    ).some((child) => !child.classList.contains('oge-toolbar-item'));
    if (found !== this.hasSlotContent()) this.hasSlotContent.set(found);
  }

  /** Focusable stops in DOM order, the overflow button last. */
  private stops(): HTMLElement[] {
    if (this.stopCache !== null) return this.stopCache;
    const el = this.sectionsEl()?.nativeElement;
    const inSections = el
      ? Array.from(el.querySelectorAll<HTMLElement>(STOP_SELECTOR)).filter(
          (node) => node.closest('.oge-popup') === null,
        )
      : [];
    const button = this.menuButton()?.nativeElement;
    this.stopCache = button ? [...inSections, button] : inSections;
    return this.stopCache;
  }

  /** Clamped roving anchor, moved off a disabled stop. */
  private activeStop(stops: readonly HTMLElement[]): number {
    if (stops.length === 0) return 0;
    const wanted = Math.min(Math.max(this.focusedStop(), 0), stops.length - 1);
    if (!isStopDisabled(stops[wanted])) return wanted;
    return (
      edgeEnabledIndex(stops.length, 1, (i) => isStopDisabled(stops[i])) ?? 0
    );
  }

  private applyRovingTabindex(): void {
    const stops = this.stops();
    if (stops.length === 0) return;
    // With keyboard navigation off there is no roving anchor: every control
    // keeps its natural place in the Tab order (the reference
    // `allowKeyboard` flag).
    if (!this.keyboardNavigation()) {
      stops.forEach((el) => el.removeAttribute('tabindex'));
      return;
    }
    const active = this.activeStop(stops);
    stops.forEach((el, i) => {
      const value = i === active && !this.disabled() ? '0' : '-1';
      if (el.getAttribute('tabindex') !== value) {
        el.setAttribute('tabindex', value);
      }
    });
  }

  private reportOverflow(): void {
    const keys = this.menuDescriptors().map((d) => d.id);
    const serialized = keys.join(' ');
    if (serialized === this.previousMenuKeys) return;
    this.previousMenuKeys = serialized;
    this.overflowChanged.emit({ keys, count: keys.length });
  }

  /**
   * Coalesces bursts of resize notifications into one pass per frame. A resize
   * only moves the container edge — it cannot change an item's own size — so
   * this deliberately runs {@link measureContainer} and not the full pass.
   */
  private scheduleMeasure(): void {
    if (this.measureFrame !== null) return;
    if (typeof requestAnimationFrame !== 'function') {
      this.measureContainer();
      return;
    }
    this.measureFrame = requestAnimationFrame(() => {
      this.measureFrame = null;
      this.measureContainer();
    });
  }

  /**
   * The scroll-position half of the measurement. Scrolling cannot change an
   * item's size, so a scroll event must never pay for the full pass — it only
   * refreshes which scroll buttons are live.
   */
  protected measureScroll(): void {
    if (this.overflow() !== 'scroll') return;
    const sections = this.sectionsEl()?.nativeElement;
    if (!sections) return;
    const vertical = this.orientation() === 'vertical';
    const size = vertical ? sections.clientHeight : sections.clientWidth;
    const total = vertical ? sections.scrollHeight : sections.scrollWidth;
    const offset = Math.abs(
      vertical ? sections.scrollTop : sections.scrollLeft,
    );
    this.hasScrollOverflow.set(total > size + 1);
    this.canScrollBack.set(offset > 1);
    this.canScrollForward.set(offset < total - size - 1);
  }

  /**
   * The full pass: style metrics, container box and every item's size. Only the
   * paths that can actually invalidate an item's width run this — a content or
   * density change, and the explicit `refreshOverflow()`.
   */
  protected measure(): void {
    this.measureStyleMetrics();
    this.measureContainer();
    this.measureItems();
  }

  /**
   * The only `getComputedStyle` read the toolbar makes, kept off the resize
   * path. Direction, padding and gap all come from CSS custom properties that
   * change with `size` / `stylingMode` / `orientation` / the writing mode —
   * never with the container's width — so re-reading them per resize frame
   * would be a forced style recalculation for a value that cannot have moved.
   */
  private measureStyleMetrics(): void {
    const style = getComputedStyle(this.host.nativeElement);
    this.rtl = style.direction === 'rtl';
    const vertical = this.orientation() === 'vertical';
    const padding = vertical
      ? parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
      : parseFloat(style.paddingInlineStart || style.paddingLeft) +
        parseFloat(style.paddingInlineEnd || style.paddingRight);
    this.paddingSize = Number.isFinite(padding) ? padding : 0;
    const gap = parseFloat(vertical ? style.rowGap : style.columnGap);
    if (Number.isFinite(gap) && gap !== this.gapSize()) this.gapSize.set(gap);
  }

  /**
   * The cheap half, safe to run on every resize frame: the container edge, the
   * overflow button and the scroll offsets. Layout reads only, no style reads.
   */
  private measureContainer(): void {
    const host = this.host.nativeElement;
    if (!this.sectionsEl()) return;
    const vertical = this.orientation() === 'vertical';

    const box = vertical ? host.clientHeight : host.clientWidth;
    const available = box - this.paddingSize;
    if (available !== this.containerSize()) this.containerSize.set(available);

    const button = this.menuButton()?.nativeElement;
    if (button) {
      const size = vertical ? button.offsetHeight : button.offsetWidth;
      if (size > 0 && size !== this.menuButtonSize()) {
        this.menuButtonSize.set(size);
      }
    }

    if (this.overflow() === 'scroll') {
      this.measureScroll();
    } else if (this.hasScrollOverflow()) {
      this.hasScrollOverflow.set(false);
    }
  }

  /**
   * The expensive half — one layout read per rendered item. An item's size is
   * independent of the container's, so this runs on content/density changes
   * only, not while the user drags a window edge.
   */
  private measureItems(): void {
    const sections = this.sectionsEl()?.nativeElement;
    if (!sections) return;
    const vertical = this.orientation() === 'vertical';
    const current = this.itemSizes();
    // The map is cloned only once a real change is found, so a steady toolbar
    // re-measures without allocating.
    let next: Map<string, number> | null = null;
    for (const el of sections.querySelectorAll<HTMLElement>(
      '.oge-toolbar-item[data-item-id]',
    )) {
      const id = el.getAttribute('data-item-id');
      if (id === null) continue;
      const size = vertical ? el.offsetHeight : el.offsetWidth;
      if (size > 0 && current.get(id) !== size) {
        next ??= new Map(current);
        next.set(id, size);
      }
    }
    if (next) this.itemSizes.set(next);
  }
}

/** Text-entry controls keep their own arrow / Home / End behavior. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (!(target instanceof HTMLInputElement)) return false;
  return !['button', 'checkbox', 'radio', 'reset', 'submit'].includes(
    target.type,
  );
}

function isStopDisabled(el: HTMLElement | undefined): boolean {
  if (!el) return true;
  if (el.getAttribute('aria-disabled') === 'true') return true;
  return (
    (el as HTMLButtonElement).disabled === true || el.hasAttribute('disabled')
  );
}
