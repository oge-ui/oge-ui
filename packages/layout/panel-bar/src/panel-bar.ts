import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
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
} from '@angular/core';
// Flattening, the expandMode rules and the keyboard map live framework-free
// in `@oge-ui/behavior` (`panel-bar-core`); every expand / collapse runs the
// shared `runOgeExpansionToggle` pipeline — the React render layer calls the
// same functions.
import {
  flattenOgePanelBarItems,
  ogePanelBarExpansionAfter,
  ogePanelBarIndex,
  ogePanelBarInitialExpanded,
  ogePanelBarKeyAction,
  ogePanelBarKeyIntent,
  ogeResolveDirection,
  runOgeExpansionToggle,
  type OgePanelBarExpandMode,
  type OgePanelBarItem,
  type OgePanelBarItemClickEvent,
  type OgePanelBarItemCollapsingEvent,
  type OgePanelBarItemExpandingEvent,
  type OgePanelBarItemToggleEvent,
  type OgePanelBarNode,
  type OgePanelBarSelectionChangedEvent,
} from '@oge-ui/behavior';
import { OGE_ACCORDION_CONFIG } from '@oge-ui/layout/accordion';

/** Context of `[ogePanelBarContentTemplate]`. */
export interface OgePanelBarContentTemplateContext {
  /** The content item being rendered. */
  $implicit: OgePanelBarItem;
  /** 1-based nesting depth of the item. */
  level: number;
}

/** Context of `[ogePanelBarHeaderTemplate]`. */
export interface OgePanelBarHeaderTemplateContext {
  /** The item whose header is rendered. */
  $implicit: OgePanelBarItem;
  /** 1-based nesting depth of the item. */
  level: number;
  /** Whether the item's group is expanded. */
  expanded: boolean;
  /** Whether the item is the selected one. */
  selected: boolean;
}

/**
 * Renders the body of every content item (an item with `content` and no
 * `children`). Instantiated on the item's first expand, kept afterwards.
 *
 * ```html
 * <oge-panel-bar [items]="items">
 *   <ng-template ogePanelBarContentTemplate let-item>
 *     <app-profile-form [section]="item.key" />
 *   </ng-template>
 * </oge-panel-bar>
 * ```
 */
@Directive({ selector: '[ogePanelBarContentTemplate]' })
export class OgePanelBarContentTemplate {
  readonly templateRef = inject(TemplateRef<OgePanelBarContentTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgePanelBarContentTemplate,
    _ctx: unknown,
  ): _ctx is OgePanelBarContentTemplateContext {
    return true;
  }
}

/**
 * Replaces the icon / title / description / badge layout inside each header
 * button. It renders *inside* the `<button>`, so it must not contain
 * focusable controls.
 */
@Directive({ selector: '[ogePanelBarHeaderTemplate]' })
export class OgePanelBarHeaderTemplate {
  readonly templateRef = inject(TemplateRef<OgePanelBarHeaderTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgePanelBarHeaderTemplate,
    _ctx: unknown,
  ): _ctx is OgePanelBarHeaderTemplateContext {
    return true;
  }
}

declare const ngDevMode: boolean | undefined;

type Node = OgePanelBarNode<OgePanelBarItem>;

let nextId = 0;

/**
 * A vertical navigation stack whose headers expand into nested groups or
 * free content — Kendo's PanelBar. Leaves are selectable (`selectedKey`,
 * announced as `aria-current`), groups follow `expandMode`.
 *
 * ```html
 * <oge-panel-bar [items]="nav" expandMode="single" [(selectedKey)]="page" />
 * ```
 *
 * Built on the APG **disclosure** pattern, not treeview: groups may hold
 * free content, which a `role="tree"` cannot own. Every header is a real
 * `<button>` in the Tab sequence (`aria-expanded` + `aria-controls` on
 * groups); collapsed groups are `inert`. Up / Down / Home / End and
 * Right / Left (expand-or-enter / collapse-or-parent, mirrored in RTL) are
 * layered on top. Child groups render on first expand (`deferRendering`).
 */
@Component({
  selector: 'oge-panel-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  styleUrl: './panel-bar.scss',
  host: {
    class: 'oge-panel-bar',
    '[class.oge-panel-bar-full]': "expandMode() === 'full'",
    '[class.oge-disabled]': 'disabled()',
    '[attr.data-expand-mode]': 'expandMode()',
  },
  template: `
    @if (nodes().length === 0) {
      <div class="oge-panel-bar-empty">{{ noDataText() }}</div>
    } @else {
      <ul
        class="oge-panel-bar-group oge-panel-bar-root"
        role="list"
        [attr.aria-label]="ariaLabel() ?? null"
      >
        <ng-container
          *ngTemplateOutlet="levelTpl; context: { $implicit: rootIds() }"
        />
      </ul>
    }

    <ng-template #levelTpl let-ids>
      @for (id of asIds(ids); track id) {
        @let n = node(id);
        @if (n) {
          <li
            class="oge-panel-bar-item"
            [class.oge-panel-bar-item-group]="n.expandable"
            [class.oge-panel-bar-item-expanded]="isExpandedId(n.id)"
            [class.oge-panel-bar-item-selected]="isSelectedId(n.id)"
            [class.oge-panel-bar-item-disabled]="isDisabled(n)"
            [attr.data-level]="n.level"
          >
            <button
              type="button"
              class="oge-panel-bar-header"
              [style.--oge-panel-bar-level]="n.level"
              [id]="uid + '-h-' + n.id"
              [attr.data-node-id]="n.id"
              [attr.aria-expanded]="n.expandable ? isExpandedId(n.id) : null"
              [attr.aria-controls]="n.expandable ? uid + '-g-' + n.id : null"
              [attr.aria-current]="isSelectedId(n.id) ? 'true' : null"
              [attr.aria-disabled]="isDisabled(n) ? true : null"
              [tabindex]="isDisabled(n) ? -1 : 0"
              [attr.title]="n.item.hint ?? null"
              (click)="onHeaderClick(n, $event)"
              (keydown)="onHeaderKeydown(n, $event)"
            >
              @if (headerTemplate(); as tpl) {
                <ng-container
                  *ngTemplateOutlet="
                    tpl.templateRef;
                    context: {
                      $implicit: n.item,
                      level: n.level,
                      expanded: isExpandedId(n.id),
                      selected: isSelectedId(n.id),
                    }
                  "
                />
              } @else {
                @if (n.item.icon; as icon) {
                  <svg
                    class="oge-panel-bar-icon"
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
                <span class="oge-panel-bar-titles">
                  <span class="oge-panel-bar-title">{{ n.item.title }}</span>
                  @if (n.item.description) {
                    <span class="oge-panel-bar-description">{{
                      n.item.description
                    }}</span>
                  }
                </span>
                @if (n.item.badge !== undefined) {
                  <span class="oge-panel-bar-badge">{{ n.item.badge }}</span>
                }
              }
              @if (n.expandable) {
                <span class="oge-panel-bar-chevron" aria-hidden="true">
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
                </span>
              }
            </button>
            @if (n.expandable) {
              <div
                class="oge-panel-bar-panel"
                [class.oge-panel-bar-panel-open]="isExpandedId(n.id)"
                [class.oge-panel-bar-panel-animated]="animation() !== false"
                [style.--oge-panel-bar-transition]="animationDuration()"
                [id]="uid + '-g-' + n.id"
                [attr.inert]="isExpandedId(n.id) ? null : ''"
              >
                <div class="oge-panel-bar-panel-inner">
                  @if (shouldRender(n.id)) {
                    @if (n.hasChildren) {
                      <ul class="oge-panel-bar-group" role="list">
                        <ng-container
                          *ngTemplateOutlet="
                            levelTpl;
                            context: { $implicit: n.childIds }
                          "
                        />
                      </ul>
                    } @else {
                      <div class="oge-panel-bar-content">
                        @if (contentTemplate(); as tpl) {
                          <ng-container
                            *ngTemplateOutlet="
                              tpl.templateRef;
                              context: { $implicit: n.item, level: n.level }
                            "
                          />
                        } @else {
                          {{ n.item.content }}
                        }
                      </div>
                    }
                  }
                </div>
              </div>
            }
          </li>
        }
      }
    </ng-template>
  `,
})
export class OgePanelBar {
  private readonly config = inject(OGE_ACCORDION_CONFIG);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Unique DOM id prefix of this instance. */
  protected readonly uid = `oge-panel-bar-${nextId++}`;

  /** The item tree; an entry with `children` (or `content`) is an expandable group. */
  readonly items = input<readonly OgePanelBarItem[] | undefined>(undefined);
  /**
   * `multiple` (default) lets groups open independently; `single` collapses
   * a group's open siblings; `full` is `single` with the open root group
   * filling the host's height.
   */
  readonly expandMode = input<OgePanelBarExpandMode>('multiple');
  /**
   * The selected item — two-way. Holds the item's `key`, or its position id
   * (`p0-1`) when it has none.
   */
  readonly selectedKey = model<string | undefined>(undefined);
  /**
   * Ids (`key` or position id) of the expanded groups — two-way. The items'
   * own `expanded` flags seed it once.
   */
  readonly expandedKeys = model<readonly string[] | undefined>(undefined);
  /** Disables the whole panel bar. */
  readonly disabled = input(false);
  /**
   * Instantiate a group's children or content only on its first expand (kept
   * afterwards). `false` renders every level up front.
   */
  readonly deferRendering = input(true);
  /**
   * Height animation: `true` uses the default duration, a number overrides it
   * in milliseconds, `false` disables it. Suppressed under reduced motion.
   */
  readonly animation = input<boolean | number>(true);
  /** Enables Up/Down/Home/End and Right/Left header navigation. */
  readonly keyboardNavigation = input(true);
  /** Accessible name of the root list. */
  readonly ariaLabel = input<string | undefined>(undefined);

  /** A header was activated — before it toggles or selects. */
  readonly itemClick = output<OgePanelBarItemClickEvent>();
  /** Cancelable pre-event of a group expanding. */
  readonly itemExpanding = output<OgePanelBarItemExpandingEvent>();
  /** Cancelable pre-event of a group collapsing. */
  readonly itemCollapsing = output<OgePanelBarItemCollapsingEvent>();
  /** A group expanded. */
  readonly itemExpanded = output<OgePanelBarItemToggleEvent>();
  /** A group collapsed — also each sibling a `single` / `full` expand closed. */
  readonly itemCollapsed = output<OgePanelBarItemToggleEvent>();
  /** The selected item changed through a user click. */
  readonly selectionChanged = output<OgePanelBarSelectionChangedEvent>();

  protected readonly contentTemplate = contentChild(OgePanelBarContentTemplate);
  protected readonly headerTemplate = contentChild(OgePanelBarHeaderTemplate);

  protected readonly nodes = computed<Node[]>(() =>
    flattenOgePanelBarItems(this.items()),
  );
  private readonly byId = computed(() => ogePanelBarIndex(this.nodes()));
  protected readonly rootIds = computed(() =>
    this.nodes()
      .filter((n) => n.parentId === null)
      .map((n) => n.id),
  );

  private readonly expandedIds = signal<ReadonlySet<string>>(new Set());
  private readonly renderedIds = signal<ReadonlySet<string>>(new Set());
  private readonly seeded = new Set<string>();
  private lastEmittedKeys: readonly string[] | undefined = undefined;

  protected readonly noDataText = computed(() => this.config.messages.noData);
  protected readonly animationDuration = computed(() => {
    const value = this.animation();
    return typeof value === 'number' ? `${value}ms` : null;
  });

  constructor() {
    // Seed the items' own `expanded` flags once per id, honouring the mode.
    effect(() => {
      const nodes = this.nodes();
      const mode = this.expandMode();
      const initial = ogePanelBarInitialExpanded(nodes, mode);
      const fresh = nodes.filter((n) => !this.seeded.has(n.id));
      fresh.forEach((n) => this.seeded.add(n.id));
      const toOpen = fresh.filter((n) => initial.has(n.id));
      if (toOpen.length === 0) return;
      untracked(() => {
        let next = this.expandedIds();
        for (const n of toOpen) {
          next = ogePanelBarExpansionAfter(nodes, next, n.id, true, mode).next;
        }
        this.setExpanded(next);
      });
    });

    // expandedKeys → state (a consumer write; our own echo is skipped).
    effect(() => {
      const keys = this.expandedKeys();
      if (keys === undefined || keys === this.lastEmittedKeys) return;
      const alive = this.byId();
      untracked(() =>
        this.setExpanded(new Set(keys.filter((key) => alive.has(key))), false),
      );
    });
  }

  /** Whether the group with this id (`key` or position id) is expanded. */
  isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  /** Runs the expand pipeline; resolves whether the group ended up expanded. */
  expand(id: string): Promise<boolean> {
    const n = this.byId().get(id);
    return n ? this.requestToggle(n, true) : Promise.resolve(false);
  }

  /** Runs the collapse pipeline; resolves whether the group ended up collapsed. */
  collapse(id: string): Promise<boolean> {
    const n = this.byId().get(id);
    return n ? this.requestToggle(n, false) : Promise.resolve(false);
  }

  /** Expands a collapsed group, collapses an expanded one. */
  toggle(id: string): Promise<boolean> {
    const n = this.byId().get(id);
    if (!n) return Promise.resolve(false);
    return this.requestToggle(n, !this.expandedIds().has(n.id));
  }

  /**
   * Expands every enabled group. Only meaningful in `multiple` mode — a
   * dev-mode warning and a no-op otherwise.
   */
  expandAll(): void {
    if (this.expandMode() !== 'multiple') {
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        console.warn(
          '[oge-panel-bar] expandAll() requires expandMode="multiple" — ignored.',
        );
      }
      return;
    }
    for (const n of this.nodes()) {
      if (n.expandable && !this.expandedIds().has(n.id)) {
        void this.requestToggle(n, true);
      }
    }
  }

  /** Collapses every expanded group. */
  collapseAll(): void {
    for (const n of [...this.nodes()].reverse()) {
      if (this.expandedIds().has(n.id)) void this.requestToggle(n, false);
    }
  }

  /** Focuses a header by id, or the first enabled one. */
  focus(id?: string): void {
    const target =
      id ??
      this.nodes().find((n) => n.parentId === null && !this.isDisabled(n))?.id;
    if (target !== undefined) this.headerFor(target)?.focus();
  }

  protected node(id: string): Node | undefined {
    return this.byId().get(id);
  }

  protected asIds(ids: unknown): readonly string[] {
    return ids as readonly string[];
  }

  protected isExpandedId(id: string): boolean {
    return this.expandedIds().has(id);
  }

  protected isSelectedId(id: string): boolean {
    return this.selectedKey() === id;
  }

  protected isDisabled(n: Node): boolean {
    return n.disabled || this.disabled();
  }

  protected shouldRender(id: string): boolean {
    return !this.deferRendering() || this.renderedIds().has(id);
  }

  protected onHeaderClick(n: Node, event: Event): void {
    this.itemClick.emit({ item: n.item, key: n.key, level: n.level, event });
    if (this.isDisabled(n)) return;
    if (n.selectable) this.select(n, event);
    if (n.expandable) {
      void this.requestToggle(n, !this.expandedIds().has(n.id), event);
    }
  }

  protected onHeaderKeydown(n: Node, event: KeyboardEvent): void {
    if (!this.keyboardNavigation()) return;
    const rtl = ogeResolveDirection(this.host.nativeElement) === 'rtl';
    const intent = ogePanelBarKeyIntent(event.key, event, rtl);
    if (intent === null) return;
    const action = ogePanelBarKeyAction(
      this.nodes(),
      this.expandedIds(),
      n.id,
      intent,
    );
    if (!action) return;
    event.preventDefault();
    if (action.kind === 'focus') {
      this.headerFor(action.id)?.focus();
      return;
    }
    const target = this.byId().get(action.id);
    if (target)
      void this.requestToggle(target, action.kind === 'expand', event);
  }

  private select(n: Node, event?: Event): void {
    const previous = this.selectedKey();
    if (previous === n.id) return;
    this.selectedKey.set(n.id);
    this.selectionChanged.emit({
      item: n.item,
      key: n.key,
      previousKey: previous,
      event,
    });
  }

  private requestToggle(
    n: Node,
    expand: boolean,
    event?: Event,
  ): Promise<boolean> {
    return runOgeExpansionToggle<
      OgePanelBarItemExpandingEvent | OgePanelBarItemCollapsingEvent
    >({
      next: expand,
      current: this.expandedIds().has(n.id),
      disabled: !n.expandable || this.isDisabled(n),
      pending: false,
      preEvent: () => ({
        item: n.item,
        key: n.key,
        level: n.level,
        event,
        cancel: false,
      }),
      emitPre: (pre) =>
        expand ? this.itemExpanding.emit(pre) : this.itemCollapsing.emit(pre),
      commit: () => {
        if (!expand) this.restoreFocusFrom(n);
        const change = ogePanelBarExpansionAfter(
          this.nodes(),
          this.expandedIds(),
          n.id,
          expand,
          this.expandMode(),
        );
        this.setExpanded(change.next);
        for (const id of change.collapsed) {
          const sibling = this.byId().get(id);
          if (!sibling) continue;
          this.itemCollapsed.emit({
            item: sibling.item,
            key: sibling.key,
            level: sibling.level,
            event,
          });
        }
        const payload = { item: n.item, key: n.key, level: n.level, event };
        if (expand) this.itemExpanded.emit(payload);
        else this.itemCollapsed.emit(payload);
      },
    });
  }

  /** Applies a new expanded set, records rendered groups, echoes the model. */
  private setExpanded(next: ReadonlySet<string>, echo = true): void {
    this.expandedIds.set(next);
    if ([...next].some((id) => !this.renderedIds().has(id))) {
      this.renderedIds.update((ids) => new Set([...ids, ...next]));
    }
    if (!echo) {
      this.lastEmittedKeys = this.expandedKeys();
      return;
    }
    const keys = this.nodes()
      .filter((n) => next.has(n.id))
      .map((n) => n.id);
    this.lastEmittedKeys = keys;
    this.expandedKeys.set(keys);
  }

  /**
   * A collapsing group becomes `inert`, which would drop focus to `<body>`
   * if it held it — hand focus to the group's header first.
   */
  private restoreFocusFrom(n: Node): void {
    const panel = this.host.nativeElement.ownerDocument?.getElementById(
      `${this.uid}-g-${n.id}`,
    );
    const active = this.host.nativeElement.ownerDocument?.activeElement;
    if (panel && active && panel.contains(active))
      this.headerFor(n.id)?.focus();
  }

  private headerFor(id: string): HTMLButtonElement | undefined {
    const headers = this.host.nativeElement.querySelectorAll<HTMLButtonElement>(
      '.oge-panel-bar-header',
    );
    return Array.from(headers).find((el) => el.dataset['nodeId'] === id);
  }
}
