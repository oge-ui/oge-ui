import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
// The vocabulary, the config merge, the descriptor normalization and every
// expand/collapse/render/keyboard decision live framework-free in
// `@oge-ui/behavior` (`accordion-core`), shared with the React render layer —
// this component is the Angular render of them.
import {
  accordionAriaDisabled,
  accordionItemDescriptor,
  accordionNavIntent,
  accordionPageDirection,
  canCollapseAccordionPanel,
  createTypeAheadBuffer,
  edgeEnabledIndex,
  expandedIdsAfterCollapse,
  expandedIdsAfterExpand,
  isAccordionTypeAheadKey,
  matchAccordionTitle,
  resolveAccordionIndex,
  runAsyncGuard,
  sameAccordionIds,
  sameAccordionKeys,
  shouldRenderAccordionPanel,
  stepEnabledIndex,
  type OgeAccordionLoadState,
} from '@oge-ui/behavior';
import type { OgeAccordionDescriptor } from './accordion-descriptor';
import { OgeAccordionItem } from './accordion-item';
import type {
  OgeAccordionCollapsedEvent,
  OgeAccordionCollapsingEvent,
  OgeAccordionContentFailedEvent,
  OgeAccordionContentLoadedEvent,
  OgeAccordionContentTemplateContext,
  OgeAccordionDisplayMode,
  OgeAccordionExpandedEvent,
  OgeAccordionExpandingEvent,
  OgeAccordionHeaderActionsTemplateContext,
  OgeAccordionHeaderTemplateContext,
  OgeAccordionItemClickEvent,
  OgeAccordionItemData,
  OgeAccordionSize,
  OgeAccordionStylingMode,
  OgeAccordionTogglePosition,
} from './accordion-types';
import { OGE_ACCORDION_CONFIG, type OgeAccordionMessages } from './config';
import {
  OgeAccordionContentTemplate,
  OgeAccordionHeaderActionsTemplate,
  OgeAccordionHeaderTemplate,
  OgeAccordionToggleIconTemplate,
} from './templates';

declare const ngDevMode: boolean | undefined;

let nextComponentId = 0;

/**
 * Vertically stacked disclosure panels following the WAI-ARIA APG accordion
 * pattern: each header title is a `<button>` inside a heading, every header
 * stays in the page Tab sequence, and arrow / Home / End / type-ahead
 * navigation is layered on top as an opt-in enhancement.
 *
 * Panels come from projected `<oge-accordion-item>` children, from the
 * data-driven `items` input, or both (children first).
 *
 * ```html
 * <oge-accordion [multiple]="true" [(expandedKeys)]="open">
 *   <oge-accordion-item key="account" title="Account" description="Name and e-mail">
 *     Account settings…
 *   </oge-accordion-item>
 *   <oge-accordion-item key="billing" title="Billing" [expandGuard]="confirmLeave">
 *     Billing settings…
 *   </oge-accordion-item>
 * </oge-accordion>
 * ```
 */
@Component({
  selector: 'oge-accordion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  styleUrl: './accordion.scss',
  host: {
    class: 'oge-accordion',
    '[class.oge-accordion-flat]': "displayMode() === 'flat'",
    '[class.oge-disabled]': 'disabled()',
    '[attr.data-styling-mode]': 'stylingMode()',
    '[attr.data-size]': 'size()',
    '[attr.data-toggle-position]': 'togglePosition()',
    '[attr.aria-label]': 'ariaLabel()',
    '(keydown)': 'onHostKeydown($event)',
  },
  template: `
    @if (descriptors().length === 0) {
      <div class="oge-accordion-empty">{{ mergedMessages().noData }}</div>
    }
    @for (d of descriptors(); track d.id; let i = $index) {
      <div
        class="oge-accordion-item"
        [class.oge-accordion-item-expanded]="isExpandedId(d.id)"
        [class.oge-accordion-item-disabled]="isDisabled(d)"
        [class.oge-accordion-item-invalid]="d.invalid"
        [class.oge-accordion-item-pending]="pendingIds().has(d.id)"
      >
        <div class="oge-accordion-header">
          <!--
            A native heading element wherever the level allows one; the APG
            only asks for "an element with role heading", but real h1–h6 are
            better understood by assistive tech and document outliners.
          -->
          @switch (headingLevel()) {
            @case (1) {
              <h1 class="oge-accordion-heading">
                <ng-container
                  *ngTemplateOutlet="toggleTpl; context: { d: d, i: i }"
                />
              </h1>
            }
            @case (2) {
              <h2 class="oge-accordion-heading">
                <ng-container
                  *ngTemplateOutlet="toggleTpl; context: { d: d, i: i }"
                />
              </h2>
            }
            @case (3) {
              <h3 class="oge-accordion-heading">
                <ng-container
                  *ngTemplateOutlet="toggleTpl; context: { d: d, i: i }"
                />
              </h3>
            }
            @case (4) {
              <h4 class="oge-accordion-heading">
                <ng-container
                  *ngTemplateOutlet="toggleTpl; context: { d: d, i: i }"
                />
              </h4>
            }
            @case (5) {
              <h5 class="oge-accordion-heading">
                <ng-container
                  *ngTemplateOutlet="toggleTpl; context: { d: d, i: i }"
                />
              </h5>
            }
            @case (6) {
              <h6 class="oge-accordion-heading">
                <ng-container
                  *ngTemplateOutlet="toggleTpl; context: { d: d, i: i }"
                />
              </h6>
            }
            @default {
              <div
                class="oge-accordion-heading"
                role="heading"
                [attr.aria-level]="headingLevel()"
              >
                <ng-container
                  *ngTemplateOutlet="toggleTpl; context: { d: d, i: i }"
                />
              </div>
            }
          }
          @if (d.headerActionsTemplate; as tpl) {
            <div class="oge-accordion-header-actions">
              <ng-container
                *ngTemplateOutlet="tpl; context: headerActionsContext(d, i)"
              />
            </div>
          }
        </div>
        <div
          #panelEl
          class="oge-accordion-panel"
          [class.oge-accordion-panel-open]="isExpandedId(d.id)"
          [class.oge-accordion-panel-animated]="animationEnabled()"
          [style.--oge-accordion-transition]="animationDuration()"
          [attr.role]="useRegionRole() ? 'region' : null"
          [id]="uid + '-panel-' + d.id"
          [attr.aria-labelledby]="uid + '-header-' + d.id"
          [attr.inert]="isExpandedId(d.id) ? null : ''"
          (transitionend)="onPanelTransitionEnd(d, i, $event)"
        >
          <div class="oge-accordion-panel-inner">
            <div
              class="oge-accordion-panel-body"
              [class.oge-accordion-fade-a]="fadePhase(d.id) === 1"
              [class.oge-accordion-fade-b]="fadePhase(d.id) === 2"
            >
              @if (loadState(d.id); as state) {
                @switch (state.status) {
                  @case ('loading') {
                    <div class="oge-accordion-skeleton" role="status">
                      <span class="oge-accordion-sr">{{
                        mergedMessages().loadingContent
                      }}</span>
                      <span class="oge-accordion-skeleton-line"></span>
                      <span class="oge-accordion-skeleton-line"></span>
                      <span class="oge-accordion-skeleton-line"></span>
                    </div>
                  }
                  @case ('failed') {
                    <div class="oge-accordion-error" role="alert">
                      <span>{{ mergedMessages().contentLoadFailed }}</span>
                      <button
                        type="button"
                        class="oge-accordion-retry"
                        (click)="retryLoad(d, i)"
                      >
                        {{ mergedMessages().retry }}
                      </button>
                    </div>
                  }
                  @default {
                    @if (shouldRender(d, i)) {
                      @if (d.contentTemplate; as tpl) {
                        <ng-container
                          *ngTemplateOutlet="
                            tpl;
                            context: contentContext(d, i, state.data)
                          "
                        />
                      } @else if (d.text) {
                        {{ d.text }}
                      }
                    }
                  }
                }
              } @else if (shouldRender(d, i)) {
                @if (d.contentTemplate; as tpl) {
                  <ng-container
                    *ngTemplateOutlet="
                      tpl;
                      context: contentContext(d, i, undefined)
                    "
                  />
                } @else if (d.text) {
                  {{ d.text }}
                }
              }
            </div>
          </div>
        </div>
      </div>
    }
    <div class="oge-accordion-defs" hidden><ng-content /></div>

    <ng-template #toggleTpl let-d="d" let-i="i">
      <button
        #toggleEl
        type="button"
        class="oge-accordion-toggle"
        [attr.data-toggle-position]="d.togglePosition ?? togglePosition()"
        [id]="uid + '-header-' + d.id"
        [attr.data-item-id]="d.id"
        [attr.aria-expanded]="isExpandedId(d.id)"
        [attr.aria-controls]="uid + '-panel-' + d.id"
        [attr.aria-disabled]="ariaDisabled(d, i)"
        [attr.tabindex]="isDisabled(d) ? -1 : 0"
        [attr.title]="d.hint ?? null"
        [style.--oge-accordion-header-height]="headerHeight(d)"
        (click)="onToggleClick(i, $event)"
        (focus)="onToggleFocus(i)"
        (keydown)="onToggleKeydown(i, $event)"
      >
        @if (!(d.hideToggle ?? hideToggle())) {
          <span class="oge-accordion-toggle-icon" aria-hidden="true">
            @if (d.toggleIconTemplate; as tpl) {
              <ng-container
                *ngTemplateOutlet="
                  tpl;
                  context: { $implicit: isExpandedId(d.id), index: i }
                "
              />
            } @else {
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path
                  d="M6 9l6 6 6-6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            }
          </span>
        }
        @if (d.headerTemplate; as tpl) {
          <ng-container *ngTemplateOutlet="tpl; context: headerContext(d, i)" />
        } @else {
          @if (d.icon; as icon) {
            <svg
              class="oge-accordion-icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
            >
              <path
                [attr.d]="icon"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          }
          <span class="oge-accordion-titles">
            <span class="oge-accordion-title">{{ d.title }}</span>
            @if (d.description) {
              <span class="oge-accordion-description">{{ d.description }}</span>
            }
          </span>
        }
        @if (d.badge !== undefined) {
          <span class="oge-accordion-badge">{{ d.badge }}</span>
        }
        @if (d.invalid) {
          <span class="oge-accordion-invalid-dot" aria-hidden="true"></span>
          <span class="oge-accordion-sr">{{
            mergedMessages().invalidSection
          }}</span>
        }
        @if (pendingIds().has(d.id)) {
          <span class="oge-accordion-spinner" aria-hidden="true"></span>
          <span class="oge-accordion-sr">{{ mergedMessages().pending }}</span>
        }
      </button>
    </ng-template>
  `,
})
export class OgeAccordion {
  private readonly config = inject(OGE_ACCORDION_CONFIG);
  private readonly host = inject(ElementRef<HTMLElement>);

  /** Unique DOM id prefix of this component instance. */
  protected readonly uid = `oge-accordion-${nextComponentId++}`;

  /** Data-driven panels rendered after the projected `<oge-accordion-item>` children. */
  readonly items = input<readonly OgeAccordionItemData[] | undefined>(
    undefined,
  );
  /**
   * Keys of the expanded panels — two-way. The multi-expand counterpart of
   * `selectedIndex`; only panels that declare a `key` can appear here.
   */
  readonly expandedKeys = model<readonly string[]>([]);
  /**
   * Index of the expanded panel in single-expand mode — two-way. `-1` means
   * none. In `multiple` mode it reports the first expanded panel.
   */
  readonly selectedIndex = model(-1);
  /** Allows more than one panel to stay expanded. */
  readonly multiple = input(false);
  /** Allows collapsing the last expanded panel, leaving none open. */
  readonly collapsible = input(false);
  /** Instantiate a panel's content only when it first expands. */
  readonly deferRendering = input(true);
  /**
   * Keep once-rendered panels mounted (hidden) so their state survives a
   * collapse. Ignored while `deferRendering` is `false`.
   */
  readonly keepAlive = input(true);
  /**
   * Height animation: `true` uses the default duration, a number overrides it
   * in milliseconds, `false` disables it. Always suppressed under
   * `prefers-reduced-motion`.
   */
  readonly animation = input<boolean | number>(true);
  /** Side of the header the chevron sits on — logical, so RTL mirrors it. */
  readonly togglePosition = input<OgeAccordionTogglePosition>('end');
  /** Hides the chevron entirely. Overridable per panel. */
  readonly hideToggle = input(this.config.hideToggle ?? false);
  /**
   * Minimum height of a collapsed header (any CSS length, e.g. `'48px'`).
   * `undefined` lets `size` and the padding tokens decide.
   */
  readonly collapsedHeaderHeight = input<string | undefined>(
    this.config.collapsedHeaderHeight,
  );
  /** Minimum height of an expanded header; falls back to `collapsedHeaderHeight`. */
  readonly expandedHeaderHeight = input<string | undefined>(
    this.config.expandedHeaderHeight,
  );
  /** `flat` removes the gutters between panels and joins them into one stack. */
  readonly displayMode = input<OgeAccordionDisplayMode>('default');
  /** Visual variant of the panels. */
  readonly stylingMode = input<OgeAccordionStylingMode>('outlined');
  /** Density of the header rows. */
  readonly size = input<OgeAccordionSize>('md');
  /** Disables the whole component. */
  readonly disabled = input(false);
  /** Enables Up/Down/Home/End and Ctrl+PageUp/PageDown header navigation. */
  readonly keyboardNavigation = input(true);
  /** Enables printable-character type-ahead over the panel titles. */
  readonly typeAhead = input(true);
  /** Expands a panel as soon as keyboard navigation moves focus onto it. */
  readonly selectOnFocus = input(false);
  /** `aria-level` of the heading wrapping each header button. */
  readonly headingLevel = input(3);
  /** Gives each panel `role="region"` (APG-optional; adds a landmark per panel). */
  readonly useRegionRole = input(true);
  /** Aria label of the accordion container. */
  readonly ariaLabel = input<string | undefined>(undefined);
  /** Per-instance overrides of the config `messages`. */
  readonly messages = input<Partial<OgeAccordionMessages>>({});

  /** Cancelable pre-event of a panel expanding. */
  readonly itemExpanding = output<OgeAccordionExpandingEvent>();
  /** Emitted after a panel expanded. */
  readonly itemExpanded = output<OgeAccordionExpandedEvent>();
  /** Cancelable pre-event of a panel collapsing. */
  readonly itemCollapsing = output<OgeAccordionCollapsingEvent>();
  /** Emitted after a panel collapsed. */
  readonly itemCollapsed = output<OgeAccordionCollapsedEvent>();
  /**
   * Emitted once the expand animation finished — the point at which the panel
   * has its final height. Fires immediately when the animation is off or
   * suppressed by `prefers-reduced-motion`.
   */
  readonly afterExpand = output<OgeAccordionExpandedEvent>();
  /** Emitted once the collapse animation finished. */
  readonly afterCollapse = output<OgeAccordionCollapsedEvent>();
  /** Emitted when a header button is activated, before the expand pipeline. */
  readonly itemClick = output<OgeAccordionItemClickEvent>();
  /** Emitted after a panel's `contentLoader` resolved. */
  readonly itemContentLoaded = output<OgeAccordionContentLoadedEvent>();
  /** Emitted after a panel's `contentLoader` rejected. */
  readonly itemContentFailed = output<OgeAccordionContentFailedEvent>();

  private readonly declaredItems = contentChildren(OgeAccordionItem);
  // descendants: false — templates inside an <oge-accordion-item> belong to
  // that panel, only direct children act as the shared items-mode templates.
  protected readonly itemsHeaderTemplate = contentChild(
    OgeAccordionHeaderTemplate,
    { descendants: false },
  );
  protected readonly itemsContentTemplate = contentChild(
    OgeAccordionContentTemplate,
    { descendants: false },
  );
  protected readonly itemsToggleIconTemplate = contentChild(
    OgeAccordionToggleIconTemplate,
    { descendants: false },
  );
  protected readonly itemsHeaderActionsTemplate = contentChild(
    OgeAccordionHeaderActionsTemplate,
    { descendants: false },
  );

  private readonly toggleElements =
    viewChildren<ElementRef<HTMLButtonElement>>('toggleEl');
  private readonly panelElements =
    viewChildren<ElementRef<HTMLElement>>('panelEl');

  /** Ids of the expanded panels — the single source of truth. */
  private readonly expandedIds = signal<ReadonlySet<string>>(new Set());
  private readonly _pendingIds = signal<ReadonlySet<string>>(new Set());
  /** Ids whose async `expandGuard` is currently in flight. */
  protected readonly pendingIds = this._pendingIds.asReadonly();
  private readonly renderedIds = signal<ReadonlySet<string>>(new Set());
  private readonly loadStates = signal<
    ReadonlyMap<string, OgeAccordionLoadState>
  >(new Map());
  private readonly fadePhases = signal<ReadonlyMap<string, number>>(new Map());
  private readonly seededIds = new Set<string>();
  /**
   * Last `expanded` value exchanged with each declarative child, so the
   * inbound effect can tell a consumer write from its own echo.
   */
  private readonly lastChildExpanded = new WeakMap<OgeAccordionItem, boolean>();
  /** Ids whose expand/collapse animation has not reported back yet. */
  private readonly awaitingAfterEvent = new Map<string, boolean>();
  /**
   * Last value this component pushed into `expandedKeys`. Lets the inbound
   * effect tell a real consumer change from its own echo — without it the
   * default `[]` would immediately undo each panel's initial `expanded`.
   */
  private lastEmittedKeys: readonly string[] = [];
  private readonly typeAheadBuffer = createTypeAheadBuffer();

  /** Effective messages: config defaults overlaid with `[messages]`. */
  protected readonly mergedMessages = computed<OgeAccordionMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  /** Normalized panels: projected children first, then `items`. */
  protected readonly descriptors = computed<readonly OgeAccordionDescriptor[]>(
    () => {
      const headerTpl = this.itemsHeaderTemplate()?.templateRef;
      const contentTpl = this.itemsContentTemplate()?.templateRef;
      const iconTpl = this.itemsToggleIconTemplate()?.templateRef;
      const actionsTpl = this.itemsHeaderActionsTemplate()?.templateRef;
      const fromChildren = this.declaredItems()
        .filter((item) => item.visible())
        .map((item) => ({
          id: item.key() ?? item.autoId,
          key: item.key(),
          title: item.title(),
          text: item.text(),
          description: item.description(),
          hideToggle: item.hideToggle(),
          togglePosition: item.togglePosition(),
          source: item,
          icon: item.icon(),
          badge: item.badge(),
          hint: item.hint(),
          disabled: item.disabled(),
          invalid: item.invalid(),
          // declarative panels sync through their two-way `expanded` model
          initiallyExpanded: false,
          item: undefined,
          expandGuard: item.expandGuard(),
          contentLoader: item.contentLoader(),
          headerTemplate: item.headerTemplate()?.templateRef,
          contentTemplate:
            item.lazyContent()?.templateRef ?? item.contentTemplateRef(),
          // the chevron is accordion-level chrome, so a component-level
          // toggle-icon template also applies to declarative children
          toggleIconTemplate: item.toggleIconTemplate()?.templateRef ?? iconTpl,
          headerActionsTemplate: item.headerActionsTemplate()?.templateRef,
        }));
      const fromItems = (this.items() ?? [])
        .filter((item) => item.visible !== false)
        .map((item, index) => ({
          ...accordionItemDescriptor(item, index),
          source: undefined,
          headerTemplate: headerTpl,
          contentTemplate: contentTpl,
          toggleIconTemplate: iconTpl,
          headerActionsTemplate: actionsTpl,
        }));
      return [...fromChildren, ...fromItems];
    },
  );

  constructor() {
    // Seed the initial `expanded` of each `items` panel exactly once — those
    // have no model to sync through, unlike declarative children.
    effect(() => {
      const ds = this.descriptors();
      const fresh = ds.filter(
        (d) => d.initiallyExpanded && !this.seededIds.has(d.id),
      );
      ds.forEach((d) => this.seededIds.add(d.id));
      if (fresh.length === 0) return;
      const allowMany = untracked(this.multiple);
      let next: ReadonlySet<string> = untracked(this.expandedIds);
      for (const d of fresh) {
        next = expandedIdsAfterExpand(next, d.id, allowMany);
        if (!allowMany) break;
      }
      this.expandedIds.set(next);
    });

    // Declarative child `[(expanded)]` → state. Declared before the outbound
    // effect so an initial `[expanded]="true"` binding wins on first run; a
    // child seen for the first time only pulls when it asks to be expanded.
    effect(() => {
      const ds = this.descriptors();
      const requests: { index: number; want: boolean }[] = [];
      for (const child of this.declaredItems()) {
        const want = child.expanded();
        const known = this.lastChildExpanded.get(child);
        if (known === undefined) {
          this.lastChildExpanded.set(child, want);
          if (!want) continue;
        } else if (known === want) {
          continue;
        } else {
          this.lastChildExpanded.set(child, want);
        }
        const index = ds.findIndex((entry) => entry.source === child);
        if (index !== -1) requests.push({ index, want });
      }
      if (requests.length === 0) return;
      // Route through the normal pipeline so an outside write is vetoable by
      // `itemExpanding` / `expandGuard` and still respects `collapsible`.
      untracked(() => {
        for (const request of requests) {
          if (request.want) void this.requestExpand(request.index);
          else void this.requestCollapse(request.index);
        }
      });
    });

    // expandedKeys → expandedIds. Declared before the reverse effect so an
    // initial key binding wins over the seeded `expanded` defaults.
    effect(() => {
      const keys = this.expandedKeys();
      if (sameAccordionKeys(keys, this.lastEmittedKeys)) return;
      this.lastEmittedKeys = keys;
      const ids = this.descriptors()
        .filter((d) => d.key !== undefined && keys.includes(d.key))
        .map((d) => d.id);
      const current = untracked(this.expandedIds);
      const keyed = new Set(
        this.descriptors()
          .filter((d) => d.key !== undefined)
          .map((d) => d.id),
      );
      // panels without a key are not addressable by expandedKeys — keep them
      const next = new Set([...current].filter((id) => !keyed.has(id)));
      ids.forEach((id) => next.add(id));
      if (!sameAccordionIds(next, current)) this.expandedIds.set(next);
    });

    // expandedIds → expandedKeys + selectedIndex.
    effect(() => {
      const ids = this.expandedIds();
      const ds = this.descriptors();
      const keys = ds
        .filter((d) => d.key !== undefined && ids.has(d.id))
        .map((d) => d.key as string);
      const currentKeys = untracked(this.expandedKeys);
      if (!sameAccordionKeys(keys, currentKeys)) {
        this.lastEmittedKeys = keys;
        this.expandedKeys.set(keys);
      }
      const index = ds.findIndex((d) => ids.has(d.id));
      if (index !== untracked(this.selectedIndex))
        this.selectedIndex.set(index);
    });

    // selectedIndex → expandedIds (single-expand two-way binding).
    effect(() => {
      const index = this.selectedIndex();
      const ds = this.descriptors();
      const ids = untracked(this.expandedIds);
      if (index < 0 || index >= ds.length) return;
      const target = ds[index];
      if (ids.has(target.id)) return;
      this.expandedIds.set(
        expandedIdsAfterExpand(ids, target.id, untracked(this.multiple)),
      );
    });

    // State → declarative child `[(expanded)]`.
    effect(() => {
      const ids = this.expandedIds();
      for (const d of this.descriptors()) {
        const child = d.source;
        if (!child) continue;
        const is = ids.has(d.id);
        if (untracked(child.expanded) === is) continue;
        this.lastChildExpanded.set(child, is);
        child.expanded.set(is);
      }
    });

    // Drop state for panels that disappeared.
    effect(() => {
      const alive = new Set(this.descriptors().map((d) => d.id));
      const ids = untracked(this.expandedIds);
      const pruned = new Set([...ids].filter((id) => alive.has(id)));
      if (pruned.size !== ids.size) this.expandedIds.set(pruned);
    });
  }

  /** Whether the panel at an index or with a key is currently expanded. */
  isExpanded(target: number | string): boolean {
    const d = this.descriptors()[this.resolveIndex(target)];
    return d ? this.expandedIds().has(d.id) : false;
  }

  /**
   * Runs the expand pipeline for the panel at an index or with a key. The
   * promise resolves `true` once the panel expanded and `false` if anything —
   * an unknown target, `itemExpanding`, or the `expandGuard` — vetoed it.
   */
  expand(target: number | string): Promise<boolean> {
    const index = this.resolveIndex(target);
    if (index === -1) return Promise.resolve(false);
    return this.requestExpand(index);
  }

  /** Runs the collapse pipeline; resolves whether the panel actually collapsed. */
  collapse(target: number | string): Promise<boolean> {
    const index = this.resolveIndex(target);
    if (index === -1) return Promise.resolve(false);
    return this.requestCollapse(index);
  }

  /** Expands the panel if collapsed, collapses it otherwise. */
  toggle(target: number | string): Promise<boolean> {
    const index = this.resolveIndex(target);
    if (index === -1) return Promise.resolve(false);
    const d = this.descriptors()[index];
    return this.expandedIds().has(d.id)
      ? this.requestCollapse(index)
      : this.requestExpand(index);
  }

  /**
   * Expands every enabled panel. Only meaningful with `multiple` — logs a
   * dev-mode warning and does nothing in single-expand mode.
   */
  expandAll(): void {
    if (!this.multiple()) {
      this.warn('expandAll() requires [multiple]="true" — ignored.');
      return;
    }
    this.descriptors().forEach((d, index) => {
      if (!this.expandedIds().has(d.id)) this.requestExpand(index);
    });
  }

  /**
   * Collapses every panel. In single-expand mode the last panel is kept open
   * unless `collapsible` is set, matching the interactive behavior.
   */
  collapseAll(): void {
    this.descriptors().forEach((_d, index) => this.requestCollapse(index));
  }

  /**
   * Expands every panel flagged `invalid` — call it after a failed form
   * submit so the user sees each section that needs attention.
   */
  expandInvalid(): void {
    const ds = this.descriptors();
    const invalid = ds
      .map((d, index) => ({ d, index }))
      .filter(({ d }) => d.invalid && !this.expandedIds().has(d.id));
    if (invalid.length === 0) return;
    if (!this.multiple()) {
      this.requestExpand(invalid[0].index);
      return;
    }
    invalid.forEach(({ index }) => this.requestExpand(index));
  }

  /** Focuses a panel's header button, or the first enabled one. */
  focus(target?: number | string): void {
    const index =
      target === undefined
        ? (edgeEnabledIndex(this.descriptors().length, 1, (i) =>
            this.isDisabled(this.descriptors()[i]),
          ) ?? -1)
        : this.resolveIndex(target);
    if (index !== -1) this.toggleElements()[index]?.nativeElement.focus();
  }

  protected isExpandedId(id: string): boolean {
    return this.expandedIds().has(id);
  }

  protected isDisabled(d: OgeAccordionDescriptor | undefined): boolean {
    return !d || d.disabled || this.disabled();
  }

  /**
   * APG: an expanded panel that the user is not allowed to collapse is
   * `aria-disabled`, not `disabled` — it must stay focusable.
   */
  protected ariaDisabled(
    d: OgeAccordionDescriptor,
    _index: number,
  ): boolean | null {
    return accordionAriaDisabled({
      disabled: this.isDisabled(d),
      expanded: this.expandedIds().has(d.id),
      canCollapse: this.canCollapse(d.id),
    });
  }

  protected animationEnabled(): boolean {
    return this.animation() !== false;
  }

  protected animationDuration(): string | null {
    const value = this.animation();
    return typeof value === 'number' ? `${value}ms` : null;
  }

  protected loadState(id: string): OgeAccordionLoadState | undefined {
    return this.loadStates().get(id);
  }

  protected fadePhase(id: string): number {
    return this.fadePhases().get(id) ?? 0;
  }

  protected shouldRender(d: OgeAccordionDescriptor, _index: number): boolean {
    return shouldRenderAccordionPanel({
      deferRendering: this.deferRendering(),
      keepAlive: this.keepAlive(),
      expanded: this.expandedIds().has(d.id),
      rendered: this.renderedIds().has(d.id),
    });
  }

  protected headerContext(
    d: OgeAccordionDescriptor,
    index: number,
  ): OgeAccordionHeaderTemplateContext {
    return {
      $implicit: d.item,
      index,
      expanded: this.expandedIds().has(d.id),
      title: d.title,
      description: d.description,
    };
  }

  protected headerActionsContext(
    d: OgeAccordionDescriptor,
    index: number,
  ): OgeAccordionHeaderActionsTemplateContext {
    return {
      $implicit: d.item,
      index,
      expanded: this.expandedIds().has(d.id),
    };
  }

  protected contentContext(
    d: OgeAccordionDescriptor,
    index: number,
    data: unknown,
  ): OgeAccordionContentTemplateContext {
    return { $implicit: d.item, index, data };
  }

  protected onToggleClick(index: number, event: Event): void {
    const d = this.descriptors()[index];
    if (!d) return;
    this.itemClick.emit({ index, key: d.key, item: d.item, event });
    if (this.isDisabled(d)) return;
    if (this.expandedIds().has(d.id)) this.requestCollapse(index, event);
    else this.requestExpand(index, event);
  }

  protected onToggleFocus(index: number): void {
    if (!this.selectOnFocus()) return;
    const d = this.descriptors()[index];
    if (!d || this.isDisabled(d) || this.expandedIds().has(d.id)) return;
    this.requestExpand(index);
  }

  protected onToggleKeydown(index: number, event: KeyboardEvent): void {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (this.keyboardNavigation()) {
      const intent = accordionNavIntent(event.key, event);
      if (intent !== null) {
        event.preventDefault();
        this.moveFocus(
          intent === 'next'
            ? this.step(index, 1)
            : intent === 'previous'
              ? this.step(index, -1)
              : this.edge(intent === 'first' ? 1 : -1),
        );
        return;
      }
    }
    if (this.typeAhead() && isAccordionTypeAheadKey(event.key, event)) {
      const prefix = this.typeAheadBuffer.push(event.key.toLowerCase());
      const ds = this.descriptors();
      const match = matchAccordionTitle(ds, prefix, index, (i) =>
        this.isDisabled(ds[i]),
      );
      if (match !== null) {
        event.preventDefault();
        this.moveFocus(match);
      }
    }
  }

  /**
   * Ctrl+PageDown / Ctrl+PageUp are handled on the host so they also work from
   * inside panel content — the APG-optional accordion shortcuts.
   */
  protected onHostKeydown(event: KeyboardEvent): void {
    if (!this.keyboardNavigation()) return;
    const direction = accordionPageDirection(event.key, event);
    if (direction === null) return;
    const from = this.focusedIndex();
    event.preventDefault();
    this.moveFocus(this.step(from, direction));
  }

  protected retryLoad(d: OgeAccordionDescriptor, index: number): void {
    this.startLoad(d, index);
  }

  private step(start: number, direction: 1 | -1): number | null {
    const ds = this.descriptors();
    return stepEnabledIndex(ds.length, start, direction, (i) =>
      this.isDisabled(ds[i]),
    );
  }

  private edge(direction: 1 | -1): number | null {
    const ds = this.descriptors();
    return edgeEnabledIndex(ds.length, direction, (i) =>
      this.isDisabled(ds[i]),
    );
  }

  private moveFocus(index: number | null): void {
    if (index === null) return;
    this.toggleElements()[index]?.nativeElement.focus();
  }

  /** Index of the header owning focus, or the panel focus currently sits in. */
  private focusedIndex(): number {
    const active = this.host.nativeElement.ownerDocument?.activeElement;
    if (!(active instanceof Element)) return -1;
    const id = active
      .closest('.oge-accordion-item')
      ?.querySelector('.oge-accordion-toggle')
      ?.getAttribute('data-item-id');
    return id === null || id === undefined
      ? -1
      : this.descriptors().findIndex((d) => d.id === id);
  }

  /** Expand pipeline: `itemExpanding` → `expandGuard` → commit → `itemExpanded`. */
  private requestExpand(index: number, event?: Event): Promise<boolean> {
    const d = this.descriptors()[index];
    if (!d || this.isDisabled(d) || this._pendingIds().has(d.id)) {
      return this.revertChild(d, false);
    }
    if (this.expandedIds().has(d.id)) return Promise.resolve(true);
    const expanding: OgeAccordionExpandingEvent = {
      index,
      key: d.key,
      item: d.item,
      event,
      cancel: false,
    };
    this.itemExpanding.emit(expanding);
    if (expanding.cancel) return this.revertChild(d, false);
    return new Promise<boolean>((resolve) => {
      runAsyncGuard(d.expandGuard, {
        allow: () => {
          this.commitExpand(d, index, event);
          resolve(true);
        },
        deny: () => {
          void this.revertChild(d, false);
          resolve(false);
        },
        pending: (active) => this.setPending(d.id, active),
        label: 'oge-accordion expandGuard',
      });
    });
  }

  /** Collapse pipeline: `itemCollapsing` → `expandGuard` → commit → `itemCollapsed`. */
  private requestCollapse(index: number, event?: Event): Promise<boolean> {
    const d = this.descriptors()[index];
    if (!d || this.isDisabled(d) || this._pendingIds().has(d.id)) {
      return this.revertChild(d, true);
    }
    if (!this.expandedIds().has(d.id)) return Promise.resolve(true);
    if (!this.canCollapse(d.id)) return this.revertChild(d, true);
    const collapsing: OgeAccordionCollapsingEvent = {
      index,
      key: d.key,
      item: d.item,
      event,
      cancel: false,
    };
    this.itemCollapsing.emit(collapsing);
    if (collapsing.cancel) return this.revertChild(d, true);
    return new Promise<boolean>((resolve) => {
      runAsyncGuard(d.expandGuard, {
        allow: () => {
          this.commitCollapse(d, index, event);
          resolve(true);
        },
        deny: () => {
          void this.revertChild(d, true);
          resolve(false);
        },
        pending: (active) => this.setPending(d.id, active),
        label: 'oge-accordion expandGuard',
      });
    });
  }

  /**
   * Puts a declarative child's `expanded` model back where the state actually
   * is after a veto, so a rejected `[(expanded)]` write does not leave the
   * binding out of sync with what the user sees.
   */
  private revertChild(
    d: OgeAccordionDescriptor | undefined,
    expanded: boolean,
  ): Promise<boolean> {
    const child = d?.source;
    if (child && child.expanded() !== expanded) {
      this.lastChildExpanded.set(child, expanded);
      child.expanded.set(expanded);
    }
    return Promise.resolve(false);
  }

  /**
   * Whether collapsing `id` is allowed: always with `collapsible`, otherwise
   * only while another panel stays expanded.
   */
  private canCollapse(id: string): boolean {
    return canCollapseAccordionPanel(
      this.expandedIds(),
      id,
      this.collapsible(),
    );
  }

  private commitExpand(
    d: OgeAccordionDescriptor,
    index: number,
    event?: Event,
  ): void {
    const current = this.expandedIds();
    this.expandedIds.set(
      expandedIdsAfterExpand(current, d.id, this.multiple()),
    );
    this.renderedIds.update((ids) => new Set(ids).add(d.id));
    if (d.contentLoader && !this.loadStates().has(d.id)) {
      this.startLoad(d, index);
    }
    // panels that lost their expansion in single mode
    if (!this.multiple()) {
      for (const id of current) {
        if (id === d.id) continue;
        const previous = this.descriptors().findIndex((x) => x.id === id);
        if (previous === -1) continue;
        const p = this.descriptors()[previous];
        this.itemCollapsed.emit({
          index: previous,
          key: p.key,
          item: p.item,
          event,
        });
      }
    }
    this.itemExpanded.emit({ index, key: d.key, item: d.item, event });
    this.scheduleAfterEvent(d, index, true);
  }

  private commitCollapse(
    d: OgeAccordionDescriptor,
    index: number,
    event?: Event,
  ): void {
    // A collapsed panel becomes `inert`, which would drop focus to <body> if
    // it still held it — hand focus back to the header first (Material's
    // MatExpansionPanelHeader does the same via _containsFocus).
    this.restoreFocusFromPanel(index);
    this.expandedIds.set(expandedIdsAfterCollapse(this.expandedIds(), d.id));
    if (this.deferRendering() && !this.keepAlive()) {
      this.renderedIds.update((ids) => {
        const copy = new Set(ids);
        copy.delete(d.id);
        return copy;
      });
      this.loadStates.update((states) => {
        const copy = new Map(states);
        copy.delete(d.id);
        return copy;
      });
    }
    this.itemCollapsed.emit({ index, key: d.key, item: d.item, event });
    this.scheduleAfterEvent(d, index, false);
  }

  /**
   * Moves focus to a panel's header when the panel is about to collapse while
   * it contains the active element.
   */
  private restoreFocusFromPanel(index: number): void {
    const panel = this.panelElements()[index]?.nativeElement;
    const active = this.host.nativeElement.ownerDocument?.activeElement;
    if (!panel || !active || !panel.contains(active)) return;
    this.toggleElements()[index]?.nativeElement.focus();
  }

  /**
   * Arms `afterExpand` / `afterCollapse`. When the panel actually animates the
   * event waits for `transitionend`; with the animation off — or suppressed by
   * `prefers-reduced-motion`, which zeroes the duration in CSS — it fires now.
   */
  private scheduleAfterEvent(
    d: OgeAccordionDescriptor,
    index: number,
    expanded: boolean,
  ): void {
    const payload = { index, key: d.key, item: d.item };
    if (!this.animationEnabled() || !this.panelAnimates(index)) {
      this.awaitingAfterEvent.delete(d.id);
      if (expanded) this.afterExpand.emit(payload);
      else this.afterCollapse.emit(payload);
      return;
    }
    this.awaitingAfterEvent.set(d.id, expanded);
  }

  /** Whether the panel element currently has a non-zero transition duration. */
  private panelAnimates(index: number): boolean {
    const panel = this.panelElements()[index]?.nativeElement;
    const view = panel?.ownerDocument?.defaultView;
    if (!panel || !view?.getComputedStyle) return false;
    return view
      .getComputedStyle(panel)
      .transitionDuration.split(',')
      .some((value) => parseFloat(value) > 0);
  }

  protected onPanelTransitionEnd(
    d: OgeAccordionDescriptor,
    index: number,
    event: TransitionEvent,
  ): void {
    if (event.propertyName !== 'grid-template-rows') return;
    if (event.target !== this.panelElements()[index]?.nativeElement) return;
    const expanded = this.awaitingAfterEvent.get(d.id);
    if (expanded === undefined) return;
    this.awaitingAfterEvent.delete(d.id);
    const payload = { index, key: d.key, item: d.item };
    if (expanded) this.afterExpand.emit(payload);
    else this.afterCollapse.emit(payload);
  }

  /** Resolved min-height of a header, honouring the expanded/collapsed pair. */
  protected headerHeight(d: OgeAccordionDescriptor): string | null {
    const expanded = this.expandedIds().has(d.id);
    const height = expanded
      ? (this.expandedHeaderHeight() ?? this.collapsedHeaderHeight())
      : this.collapsedHeaderHeight();
    return height ?? null;
  }

  private startLoad(d: OgeAccordionDescriptor, index: number): void {
    const loader = d.contentLoader;
    if (!loader) return;
    this.setLoadState(d.id, { status: 'loading' });
    let promise: Promise<unknown>;
    try {
      promise = loader();
    } catch (error) {
      this.setLoadState(d.id, { status: 'failed', error });
      this.itemContentFailed.emit({ index, key: d.key, item: d.item, error });
      return;
    }
    promise.then(
      (data) => {
        this.setLoadState(d.id, { status: 'loaded', data });
        // replay the fade so late-arriving content is not stamped in silently
        this.fadePhases.update((phases) => {
          const copy = new Map(phases);
          copy.set(d.id, copy.get(d.id) === 1 ? 2 : 1);
          return copy;
        });
        this.itemContentLoaded.emit({ index, key: d.key, item: d.item, data });
      },
      (error: unknown) => {
        this.setLoadState(d.id, { status: 'failed', error });
        this.itemContentFailed.emit({ index, key: d.key, item: d.item, error });
      },
    );
  }

  private setLoadState(id: string, state: OgeAccordionLoadState): void {
    this.loadStates.update((states) => new Map(states).set(id, state));
  }

  private setPending(id: string, pending: boolean): void {
    const next = new Set(this._pendingIds());
    if (pending) next.add(id);
    else next.delete(id);
    this._pendingIds.set(next);
  }

  private resolveIndex(target: number | string): number {
    return resolveAccordionIndex(this.descriptors(), target);
  }

  private warn(message: string): void {
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      console.warn(`[oge-accordion] ${message}`);
    }
  }
}
