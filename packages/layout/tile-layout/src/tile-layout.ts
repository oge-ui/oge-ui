import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  LOCALE_ID,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  contentChild,
  contentChildren,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import {
  OGE_TILE_LAYOUT_DEFAULTS,
  beginPointerGesture,
  createAutoScroller,
  createOgeLayoutAnimator,
  getOgeLiveAnnouncer,
  ogeEditorIsMac,
  ogeIsRtl,
  ogeScrollParent,
  ogeTileLayoutAutoRows,
  ogeTileLayoutClampResize,
  ogeTileLayoutGrabIntent,
  ogeTileLayoutGrabText,
  ogeTileLayoutKeyIntent,
  ogeTileLayoutKeyboardHint,
  ogeTileLayoutLiveTarget,
  ogeTileLayoutMoveState,
  ogeTileLayoutMovedText,
  ogeTileLayoutPreviewOrder,
  ogeTileLayoutResizeSpan,
  ogeTileLayoutResizeState,
  ogeTileLayoutResizedText,
  ogeTileLayoutResolve,
  ogeTileLayoutShortcuts,
  ogeTileLayoutSizeText,
  ogeTileLayoutStep,
  ogeTileLayoutTabStop,
  ogeTileLayoutTemplateColumns,
  ogeTileLayoutTileLabel,
  ogeTileLayoutToState,
  ogeTileLayoutUnchangedText,
  sanitizeOgeTileLayoutState,
  type OgeAutoScroller,
  type OgeLayoutAnimator,
  type OgePointerGestureHandle,
  type OgeRect,
  type OgeTileLayoutRect,
  type OgeTileLayoutResolvedTile,
} from '@oge-ui/behavior';
import { OGE_TILE_LAYOUT_CONFIG, type OgeTileLayoutMessages } from './config';
import {
  OgeTileLayoutContentTemplate,
  OgeTileLayoutHeaderTemplate,
  type OgeTileLayoutTemplateContext,
} from './templates';
import { OgeTileLayoutItem } from './tile-layout-item';
import type {
  OgeTileLayoutChangeSource,
  OgeTileLayoutChangedEvent,
  OgeTileLayoutItemData,
  OgeTileLayoutKey,
  OgeTileLayoutReorderedEvent,
  OgeTileLayoutReorderingEvent,
  OgeTileLayoutResizable,
  OgeTileLayoutResizedEvent,
  OgeTileLayoutResizingEvent,
  OgeTileLayoutSpan,
  OgeTileLayoutState,
} from './tile-layout-types';

let nextLayoutId = 0;

/** A tile's data plus the captured slots of a declarative child. */
interface TileSource extends OgeTileLayoutItemData {
  readonly child?: OgeTileLayoutItem;
}

/** Everything one rendered tile needs, resolved once per change. */
interface TileRow {
  readonly tile: OgeTileLayoutResolvedTile<TileSource>;
  readonly key: OgeTileLayoutKey;
  readonly id: string;
  readonly label: string;
  readonly hasTitle: boolean;
  readonly colSpan: number;
  readonly rowSpan: number;
  readonly shortcuts: string | null;
  /** Display position — differs from the committed index while a drag previews. */
  readonly order: number;
  readonly context: OgeTileLayoutTemplateContext;
}

const DRAG_EXCLUDED =
  'button, a[href], input, select, textarea, [contenteditable=""], [contenteditable="true"], [data-oge-no-drag]';

/** Pointer travel (px) needed before a live drag re-targets again. */
const RETARGET_TRAVEL = 8;

/**
 * A dashboard of tiles on a CSS grid: column and row spans, drag to reorder
 * by the header, a corner handle to resize, and keyboard twins for both —
 * with a serializable layout state:
 *
 * ```html
 * <oge-tile-layout
 *   [columns]="4"
 *   [items]="tiles"
 *   resizable
 *   [(state)]="layout"
 *   ariaLabel="Sales dashboard"
 * >
 *   <ng-template ogeTileLayoutContentTemplate let-item>
 *     <app-kpi [id]="item.key" />
 *   </ng-template>
 * </oge-tile-layout>
 * ```
 *
 * No APG pattern exists, so the semantics follow the kanban board: a labelled
 * `role="list"` of tiles, each a focusable `role="group"` with
 * `aria-roledescription` ("tile"), labelled by its header. The tiles share one
 * roving tab stop (arrows / Home / End move between them); content inside a
 * tile keeps its own place in the Tab order, and the tile's keys only act
 * while the tile itself is focused. Space picks the focused tile up (arrows
 * move it with a live preview, Space drops it, Escape cancels),
 * `Ctrl+Arrow` (`⌘` on Apple platforms) moves it at once and
 * `Ctrl+Shift+Arrow` resizes it (horizontal arrows mirror in RTL); the
 * pointer drop runs the same commit, so `reordering` / `resizing` (cancelable)
 * → `reordered` / `resized` → `layoutChanged` fire identically for both, and
 * every change is announced through the shared live region.
 *
 * Layout changes glide: neighbours reflow live under a drag, the dropped
 * tile settles into its slot, added tiles fade in and removed ones fade out
 * (the shared `createOgeLayoutAnimator`; off under reduced motion).
 */
@Component({
  selector: 'oge-tile-layout',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    // Declarative <oge-tile-layout-item> children hand their projected
    // content over as templates the layout stamps in its own tiles; Angular
    // hydration cannot match content projected that way (NG0500), so the
    // layout re-renders on the client instead of hydrating.
    ngSkipHydration: 'true',
    class: 'oge-tile-layout',
    '[class.oge-tile-layout-dragging]': 'dragKey() !== null',
    '[class.oge-tile-layout-grabbing]': 'grabKey() !== null',
    '[class.oge-tile-layout-resizing]': 'resizePreview() !== null',
  },
  styleUrl: './tile-layout.scss',
  template: `
    <div
      #list
      class="oge-tile-layout-list"
      role="list"
      [attr.aria-label]="ariaLabel() ?? msg().layoutLabel"
      [style.--oge-tile-layout-columns]="templateColumns()"
      [style.--oge-tile-layout-rows]="autoRows()"
      [style.--oge-tile-layout-gap]="resolvedGap() + 'px'"
    >
      @for (row of rows(); track row.key) {
        <div
          role="listitem"
          class="oge-tile-layout-cell"
          [class.oge-tile-layout-cell-placeholder]="dragKey() === row.key"
          [style.--oge-tile-col-span]="row.colSpan"
          [style.--oge-tile-row-span]="row.rowSpan"
          [style.order]="row.order"
        >
          <div
            role="group"
            class="oge-tile-layout-tile"
            [class.oge-tile-layout-tile-dragged]="dragKey() === row.key"
            [class.oge-tile-layout-tile-grabbed]="grabKey() === row.key"
            [class.oge-tile-layout-tile-resized]="
              resizePreview()?.key === row.key
            "
            [attr.data-oge-tile-key]="row.key"
            [attr.aria-roledescription]="msg().tileRoleDescription"
            [attr.aria-labelledby]="row.hasTitle ? row.id + '-title' : null"
            [attr.aria-label]="row.hasTitle ? null : row.label"
            [attr.aria-describedby]="hintId"
            [attr.aria-keyshortcuts]="row.shortcuts"
            [style.left.px]="dragKey() === row.key ? dragBox().left : null"
            [style.top.px]="dragKey() === row.key ? dragBox().top : null"
            [style.width.px]="dragKey() === row.key ? dragBox().width : null"
            [style.height.px]="dragKey() === row.key ? dragBox().height : null"
            [tabindex]="tabStop() === row.key ? 0 : -1"
            (keydown)="onTileKeydown($event, row)"
            (focus)="focusKey.set(row.key)"
            (focusout)="onTileFocusOut(row)"
          >
            <div
              class="oge-tile-layout-header"
              [class.oge-tile-layout-header-draggable]="row.tile.reorderable"
              [attr.title]="row.tile.reorderable ? msg().dragHint : null"
              (pointerdown)="onHeaderPointerDown($event, row)"
            >
              @if (row.tile.reorderable) {
                <svg
                  class="oge-tile-layout-grip"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"
                  />
                </svg>
              }
              <div class="oge-tile-layout-title" [id]="row.id + '-title'">
                @if (row.tile.item.child; as child) {
                  @if (child.customHeader()) {
                    <ng-container [ngTemplateOutlet]="child.headerTemplate()" />
                  } @else {
                    {{ row.tile.item.title }}
                  }
                } @else if (headerTemplate(); as tpl) {
                  <ng-container
                    [ngTemplateOutlet]="tpl.templateRef"
                    [ngTemplateOutletContext]="row.context"
                  />
                } @else {
                  {{ row.tile.item.title }}
                }
              </div>
            </div>
            <div class="oge-tile-layout-body">
              @if (row.tile.item.child; as child) {
                <ng-container [ngTemplateOutlet]="child.bodyTemplate()" />
              } @else if (contentTemplate(); as tpl) {
                <ng-container
                  [ngTemplateOutlet]="tpl.templateRef"
                  [ngTemplateOutletContext]="row.context"
                />
              }
            </div>
            @if (row.tile.resizeColumns || row.tile.resizeRows) {
              <!-- pointer-only affordance: Ctrl+Shift+Arrow on the tile is its twin -->
              <span
                class="oge-tile-layout-resize"
                [class.oge-tile-layout-resize-x]="!row.tile.resizeRows"
                [class.oge-tile-layout-resize-y]="!row.tile.resizeColumns"
                aria-hidden="true"
                (pointerdown)="onResizePointerDown($event, row)"
              ></span>
            }
          </div>
          @if (resizeFrame(); as frame) {
            @if (frame.key === row.key) {
              <!-- follows the pointer; the cell snaps to whole tracks under it -->
              <span
                class="oge-tile-layout-resize-frame"
                aria-hidden="true"
                [style.width.px]="frame.width"
                [style.height.px]="frame.height"
              >
                <span class="oge-tile-layout-size-badge">{{ frame.text }}</span>
              </span>
            }
          }
        </div>
      }
    </div>
    <span class="oge-sr-only" [id]="hintId">{{ keyboardHint() }}</span>
  `,
})
export class OgeTileLayout {
  private readonly config = inject(OGE_TILE_LAYOUT_CONFIG);
  private readonly localeId = inject(LOCALE_ID);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly announcer = isPlatformBrowser(inject(PLATFORM_ID))
    ? getOgeLiveAnnouncer(inject(DOCUMENT))
    : getOgeLiveAnnouncer(null);

  protected readonly hintId = `oge-tile-layout-${nextLayoutId++}-hint`;
  private readonly idPrefix = this.hintId.replace(/-hint$/, '');

  /** The tiles as data — rendered after the declarative `oge-tile-layout-item`s. */
  readonly items = input<readonly OgeTileLayoutItemData[]>([]);
  /** Number of grid columns; falls back to the config, then 4. */
  readonly columns = input<number | undefined>(undefined);
  /** Height of one row in px, or `'auto'` (content height); config, then 160. */
  readonly rowHeight = input<number | 'auto' | undefined>(undefined);
  /** Gap between tiles in px; config, then 16. */
  readonly gap = input<number | undefined>(undefined);
  /** Fixed column width (`240` px or any CSS length); default equal `1fr` columns. */
  readonly columnWidth = input<number | string | undefined>(undefined);
  /** Default resizability of every tile (`OgeTileLayoutItemData.resizable` overrides). */
  readonly resizable = input<
    OgeTileLayoutResizable,
    OgeTileLayoutResizable | ''
  >(false, { transform: (value) => (value === '' ? true : value) });
  /** Default reorderability of every tile (`OgeTileLayoutItemData.reorderable` overrides). */
  readonly reorderable = input(true, { transform: booleanAttribute });
  /** Accessible name of the list; falls back to the `layoutLabel` message. */
  readonly ariaLabel = input<string | undefined>(undefined);
  /** BCP 47 locale of the announcements' plural rules; config, then `LOCALE_ID`. */
  readonly locale = input<string | undefined>(undefined);
  /**
   * The committed layout (two-way). `undefined` lays the tiles out from their
   * own `order` / spans; every move and resize writes a new state here.
   */
  readonly state = model<OgeTileLayoutState | undefined>(undefined);

  /** A tile is about to move — set `cancel` to keep it. */
  readonly reordering = output<OgeTileLayoutReorderingEvent>();
  /** A tile moved. */
  readonly reordered = output<OgeTileLayoutReorderedEvent>();
  /** A tile is about to change its spans — set `cancel` to keep them. */
  readonly resizing = output<OgeTileLayoutResizingEvent>();
  /** A tile changed its spans. */
  readonly resized = output<OgeTileLayoutResizedEvent>();
  /** The layout changed (move, resize, `applyState`) — persist `state`. */
  readonly layoutChanged = output<OgeTileLayoutChangedEvent>();

  protected readonly children = contentChildren(OgeTileLayoutItem);
  protected readonly headerTemplate = contentChild(
    OgeTileLayoutHeaderTemplate,
    {
      descendants: false,
    },
  );
  protected readonly contentTemplate = contentChild(
    OgeTileLayoutContentTemplate,
    { descendants: false },
  );

  protected readonly msg = computed<OgeTileLayoutMessages>(
    () => this.config.messages,
  );
  protected readonly resolvedColumns = computed(
    () =>
      this.columns() ?? this.config.columns ?? OGE_TILE_LAYOUT_DEFAULTS.columns,
  );
  protected readonly resolvedGap = computed(
    () => this.gap() ?? this.config.gap ?? OGE_TILE_LAYOUT_DEFAULTS.gap,
  );
  protected readonly templateColumns = computed(() =>
    ogeTileLayoutTemplateColumns(this.resolvedColumns(), this.columnWidth()),
  );
  protected readonly autoRows = computed(() =>
    ogeTileLayoutAutoRows(
      this.rowHeight() ??
        this.config.rowHeight ??
        OGE_TILE_LAYOUT_DEFAULTS.rowHeight,
    ),
  );
  private readonly resolvedLocale = computed(
    () => this.locale() ?? this.config.locale ?? this.localeId,
  );

  private readonly sources = computed<TileSource[]>(() => [
    ...this.children().map((child) => ({ ...child.data(), child })),
    ...this.items(),
  ]);

  /** The tiles in display order, spans clamped. */
  readonly tiles = computed(() =>
    ogeTileLayoutResolve(this.sources(), {
      columns: this.resolvedColumns(),
      resizable: this.resizable(),
      reorderable: this.reorderable(),
      state: this.state() ?? null,
    }),
  );

  protected readonly focusKey = signal<OgeTileLayoutKey | null>(null);
  protected readonly tabStop = computed(() =>
    ogeTileLayoutTabStop(this.tiles(), this.focusKey()),
  );

  private readonly apple = ogeEditorIsMac();
  protected readonly keyboardHint = computed(() =>
    ogeTileLayoutKeyboardHint(this.msg(), this.apple, this.resolvedLocale()),
  );

  /** The tile the pointer carries (it floats `position: fixed` meanwhile). */
  protected readonly dragKey = signal<OgeTileLayoutKey | null>(null);
  /** The carried tile's viewport box. */
  protected readonly dragBox = signal<OgeRect>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  /** The tile Space picked up (keyboard grab mode). */
  protected readonly grabKey = signal<OgeTileLayoutKey | null>(null);
  /** Where the carried / picked-up tile would land — the layout previews it live. */
  private readonly previewIndex = signal<number | null>(null);
  protected readonly resizePreview = signal<{
    key: OgeTileLayoutKey;
    span: OgeTileLayoutSpan;
  } | null>(null);
  /** The pointer-following outline of a resize, with its "2 × 1" badge. */
  protected readonly resizeFrame = signal<{
    key: OgeTileLayoutKey;
    width: number;
    height: number;
    text: string;
  } | null>(null);
  private gesture: OgePointerGestureHandle | null = null;
  private scroller: OgeAutoScroller | null = null;

  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');
  private animator: OgeLayoutAnimator<string> | null = null;

  /** Display position of every committed index while a drag or grab previews. */
  private readonly displayOrder = computed<number[] | null>(() => {
    const key = this.dragKey() ?? this.grabKey();
    const to = this.previewIndex();
    if (key === null || to === null) return null;
    const tiles = this.tiles();
    const from = tiles.findIndex((t) => t.key === key);
    if (from < 0) return null;
    const order = ogeTileLayoutPreviewOrder(
      tiles.map((_, i) => i),
      from,
      to,
    );
    const position: number[] = [];
    order.forEach((index, pos) => (position[index] = pos));
    return position;
  });

  protected readonly rows = computed<TileRow[]>(() => {
    const messages = this.msg();
    const locale = this.resolvedLocale();
    const preview = this.resizePreview();
    const order = this.displayOrder();
    return this.tiles().map((tile, index) => {
      const span = preview && preview.key === tile.key ? preview.span : tile;
      const position = order?.[index] ?? index;
      return {
        tile,
        key: tile.key,
        id: `${this.idPrefix}-${index}`,
        label: ogeTileLayoutTileLabel(tile, messages, locale),
        hasTitle:
          !!tile.item.title?.trim() ||
          !!tile.item.child?.customHeader() ||
          (!tile.item.child && !!this.headerTemplate()),
        colSpan: span.colSpan,
        rowSpan: span.rowSpan,
        shortcuts: ogeTileLayoutShortcuts(
          tile.reorderable,
          tile.resizeColumns || tile.resizeRows,
          this.apple,
        ),
        order: position,
        context: {
          $implicit: tile.item,
          key: tile.key,
          index: position,
          colSpan: span.colSpan,
          rowSpan: span.rowSpan,
        },
      };
    });
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => {
      this.gesture?.cancel();
      this.scroller?.stop();
      this.animator?.cancel();
    });
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    // a track change (columns, gap, row height) re-lays everything out — not a move
    let tracks = '';
    afterRenderEffect(() => {
      const rows = this.rows();
      const carried = this.dragKey();
      const nextTracks = `${this.templateColumns()}|${this.autoRows()}|${this.resolvedGap()}`;
      const animator = this.ensureAnimator();
      if (nextTracks !== tracks) {
        tracks = nextTracks;
        animator.reset();
      }
      void rows;
      void animator.play({
        exclude: carried === null ? [] : [String(carried)],
      });
    });
    afterNextRender(() => {
      // a container resize re-flows the tiles — record it so the next change
      // animates from the real layout
      if (typeof ResizeObserver !== 'function') return;
      const observer = new ResizeObserver(() => {
        if (!this.animator?.animating) this.animator?.capture();
      });
      observer.observe(this.list().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** Focuses the tile with `key` (default: the current tab stop). */
  focus(key?: OgeTileLayoutKey): void {
    const target = key ?? this.tabStop();
    if (target === null || target === undefined) return;
    this.tileElement(target)?.focus();
  }

  /** The current layout as a serializable state. */
  getState(): OgeTileLayoutState {
    return ogeTileLayoutToState(this.tiles());
  }

  /**
   * Applies a persisted / imported state after validating it
   * (`sanitizeOgeTileLayoutState`). Returns `false` and changes nothing
   * when the input is not a valid state.
   */
  applyState(state: unknown): boolean {
    const clean = sanitizeOgeTileLayoutState(
      state,
      this.sources().map((s) => s.key),
    );
    if (!clean) return false;
    this.capture();
    this.state.set(clean);
    this.layoutChanged.emit({ state: this.getState(), source: 'api' });
    return true;
  }

  /** Moves a tile to display position `toIndex` through the cancelable pipeline. */
  moveTile(key: OgeTileLayoutKey, toIndex: number): boolean {
    return this.commitMove(key, toIndex, 'api');
  }

  /** Gives a tile new spans (clamped to its bounds) through the cancelable pipeline. */
  resizeTile(key: OgeTileLayoutKey, colSpan: number, rowSpan: number): boolean {
    return this.commitResize(key, { colSpan, rowSpan }, 'api');
  }

  // --- commits (shared by pointer, keyboard and API) ------------------------

  private commitMove(
    key: OgeTileLayoutKey,
    toIndex: number,
    source: OgeTileLayoutChangeSource,
    event?: Event,
    dropped = false,
  ): boolean {
    const tiles = this.tiles();
    const tile = tiles.find((t) => t.key === key);
    if (!tile) return false;
    const to = Math.max(0, Math.min(Math.round(toIndex), tiles.length - 1));
    const label = this.labelOf(tile);
    if (to === tile.index || !tile.reorderable) {
      if (source !== 'api') this.announce(this.unchanged(label));
      return false;
    }
    const reordering: OgeTileLayoutReorderingEvent = {
      item: this.publicItem(tile.item),
      key,
      fromIndex: tile.index,
      toIndex: to,
      source,
      event,
      cancel: false,
    };
    this.reordering.emit(reordering);
    if (reordering.cancel) {
      if (source !== 'api') this.announce(this.unchanged(label));
      return false;
    }
    this.capture();
    this.state.set(ogeTileLayoutMoveState(tiles, tile.index, to));
    const done: OgeTileLayoutReorderedEvent = {
      item: reordering.item,
      key,
      fromIndex: reordering.fromIndex,
      toIndex: to,
      source,
      event,
    };
    this.reordered.emit(done);
    this.layoutChanged.emit({ state: this.getState(), source });
    this.announce(
      dropped
        ? ogeTileLayoutGrabText(
            this.msg(),
            'dropped',
            label,
            to + 1,
            tiles.length,
            this.resolvedLocale(),
          )
        : ogeTileLayoutMovedText(
            this.msg(),
            label,
            to + 1,
            tiles.length,
            this.resolvedLocale(),
          ),
    );
    if (source !== 'api') this.refocus(key);
    return true;
  }

  private commitResize(
    key: OgeTileLayoutKey,
    span: OgeTileLayoutSpan,
    source: OgeTileLayoutChangeSource,
    event?: Event,
  ): boolean {
    const tiles = this.tiles();
    const tile = tiles.find((t) => t.key === key);
    if (!tile) return false;
    const next = ogeTileLayoutClampResize(tile, span);
    const label = this.labelOf(tile);
    const previous = { colSpan: tile.colSpan, rowSpan: tile.rowSpan };
    if (
      next.colSpan === previous.colSpan &&
      next.rowSpan === previous.rowSpan
    ) {
      if (source !== 'api') this.announce(this.unchanged(label));
      return false;
    }
    const resizing: OgeTileLayoutResizingEvent = {
      item: this.publicItem(tile.item),
      key,
      previous,
      next,
      source,
      event,
      cancel: false,
    };
    this.resizing.emit(resizing);
    if (resizing.cancel) {
      if (source !== 'api') this.announce(this.unchanged(label));
      return false;
    }
    this.capture();
    this.state.set(ogeTileLayoutResizeState(tiles, tile.index, next));
    const done: OgeTileLayoutResizedEvent = {
      item: resizing.item,
      key,
      previous,
      next,
      source,
      event,
    };
    this.resized.emit(done);
    this.layoutChanged.emit({ state: this.getState(), source });
    this.announce(
      ogeTileLayoutResizedText(this.msg(), label, next, this.resolvedLocale()),
    );
    if (source !== 'api') this.refocus(key);
    return true;
  }

  // --- keyboard -------------------------------------------------------------

  protected onTileKeydown(event: KeyboardEvent, row: TileRow): void {
    // keys only act on the tile itself — a field inside keeps its arrows
    if (event.target !== event.currentTarget) return;
    if (this.grabKey() === row.key) {
      this.onGrabKeydown(event, row);
      return;
    }
    const intent = ogeTileLayoutKeyIntent(event, this.isRtl());
    // the committed tile, not the rendered row — two keys can arrive before a render
    const tile = this.tiles().find((t) => t.key === row.key);
    if (!intent || !tile) return;
    if (intent.type === 'grab') {
      if (!tile.reorderable || this.gesture) return;
      event.preventDefault();
      this.capture();
      this.grabKey.set(tile.key);
      this.previewIndex.set(tile.index);
      this.announce(
        ogeTileLayoutGrabText(
          this.msg(),
          'pickedUp',
          this.labelOf(tile),
          tile.index + 1,
          this.tiles().length,
          this.resolvedLocale(),
        ),
      );
      return;
    }
    if (intent.type === 'focus') {
      event.preventDefault();
      const to = ogeTileLayoutStep(
        this.measure(),
        tile.index,
        intent.to,
        this.resolvedColumns(),
      );
      const target = to >= 0 ? this.tiles()[to] : undefined;
      if (target) this.focus(target.key);
      return;
    }
    if (intent.type === 'move') {
      if (!tile.reorderable) return;
      event.preventDefault();
      const to =
        intent.to === 'prev'
          ? tile.index - 1
          : intent.to === 'next'
            ? tile.index + 1
            : ogeTileLayoutStep(
                this.measure(),
                tile.index,
                intent.to,
                this.resolvedColumns(),
              );
      if (to < 0 || to >= this.tiles().length) {
        this.announce(this.unchanged(this.labelOf(tile)));
        return;
      }
      this.commitMove(tile.key, to, 'keyboard', event);
      return;
    }
    const axisOk = intent.axis === 'col' ? tile.resizeColumns : tile.resizeRows;
    if (!axisOk) return;
    event.preventDefault();
    this.commitResize(
      tile.key,
      intent.axis === 'col'
        ? { colSpan: tile.colSpan + intent.delta, rowSpan: tile.rowSpan }
        : { colSpan: tile.colSpan, rowSpan: tile.rowSpan + intent.delta },
      'keyboard',
      event,
    );
  }

  /** Keyboard grab mode: arrows move the preview, Space drops, Escape cancels. */
  private onGrabKeydown(event: KeyboardEvent, row: TileRow): void {
    const intent = ogeTileLayoutGrabIntent(event, this.isRtl());
    const tile = this.tiles().find((t) => t.key === row.key);
    const at = this.previewIndex();
    if (!intent || !tile || at === null) return;
    event.preventDefault();
    if (intent.type === 'cancel') {
      this.endGrab();
      this.announce(this.msg().dragCancelled);
      return;
    }
    if (intent.type === 'drop') {
      this.endGrab();
      if (at === tile.index)
        this.announce(
          ogeTileLayoutGrabText(
            this.msg(),
            'dropped',
            this.labelOf(tile),
            at + 1,
            this.tiles().length,
            this.resolvedLocale(),
          ),
        );
      else this.commitMove(tile.key, at, 'keyboard', event, true);
      return;
    }
    const count = this.tiles().length;
    const to =
      intent.to === 'prev'
        ? at - 1
        : intent.to === 'next'
          ? at + 1
          : ogeTileLayoutStep(
              this.measureDisplay(),
              at,
              intent.to,
              this.resolvedColumns(),
            );
    if (to < 0 || to >= count || to === at) {
      this.announce(this.unchanged(this.labelOf(tile)));
      return;
    }
    this.capture();
    this.previewIndex.set(to);
    this.announce(
      ogeTileLayoutMovedText(
        this.msg(),
        this.labelOf(tile),
        to + 1,
        count,
        this.resolvedLocale(),
      ),
    );
  }

  /** Focus leaving a picked-up tile puts it back. */
  protected onTileFocusOut(row: TileRow): void {
    if (this.grabKey() !== row.key) return;
    this.endGrab();
    this.announce(this.msg().dragCancelled);
  }

  private endGrab(): void {
    this.capture();
    this.grabKey.set(null);
    this.previewIndex.set(null);
  }

  // --- pointer --------------------------------------------------------------

  protected onHeaderPointerDown(event: PointerEvent, row: TileRow): void {
    const tile = row.tile;
    if (!tile.reorderable || event.button !== 0 || this.gesture) return;
    const target = event.target as Element | null;
    if (target?.closest?.(DRAG_EXCLUDED)) return;
    if (this.grabKey() !== null) this.endGrab();
    const element = this.tileElement(tile.key);
    const origin = this.cellElement(tile.key)?.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const header = event.currentTarget as HTMLElement;
    element?.focus({ preventScroll: true });
    let x = startX;
    let y = startY;
    let anchor = { x: startX, y: startY };
    const retarget = (): void => {
      const current = this.previewIndex() ?? tile.index;
      const to = ogeTileLayoutLiveTarget(this.measureDisplay(), x, y, current);
      // after a re-target the reflow may slide another tile under a still
      // pointer — wait for real travel before following it
      if (
        to === current ||
        Math.hypot(x - anchor.x, y - anchor.y) < RETARGET_TRAVEL
      )
        return;
      anchor = { x, y };
      this.capture();
      this.previewIndex.set(to);
    };
    this.gesture = beginPointerGesture(event, {
      longPress: 0,
      source: header,
      suppressClick: true,
      onMove: (dx, dy) => {
        x = startX + dx;
        y = startY + dy;
        if (this.dragKey() === null) {
          this.capture();
          this.dragKey.set(tile.key);
          this.previewIndex.set(tile.index);
          const scrollParent = element ? ogeScrollParent(element) : null;
          if (scrollParent)
            this.scroller = createAutoScroller(scrollParent, {
              onScroll: retarget,
            });
        }
        this.dragBox.set({
          left: (origin?.left ?? 0) + dx,
          top: (origin?.top ?? 0) + dy,
          width: origin?.width ?? 0,
          height: origin?.height ?? 0,
        });
        this.scroller?.update(x, y);
        retarget();
      },
      onFinish: (commit, cancelled) => {
        this.gesture = null;
        this.scroller?.stop();
        this.scroller = null;
        const to = this.previewIndex();
        // the carried tile glides from under the pointer into its slot
        this.capture();
        this.dragKey.set(null);
        this.previewIndex.set(null);
        if (cancelled) this.announce(this.msg().dragCancelled);
        else if (commit && to !== null && to !== tile.index)
          this.commitMove(tile.key, to, 'pointer');
      },
    });
  }

  protected onResizePointerDown(event: PointerEvent, row: TileRow): void {
    const tile = row.tile;
    if (event.button !== 0 || this.gesture) return;
    event.stopPropagation();
    if (this.grabKey() !== null) this.endGrab();
    const element = this.tileElement(tile.key);
    const rect = element?.getBoundingClientRect();
    const rtl = this.isRtl();
    const gap = this.resolvedGap();
    const start = { colSpan: tile.colSpan, rowSpan: tile.rowSpan };
    const locale = this.resolvedLocale();
    element?.focus({ preventScroll: true });
    const scrollParent = element ? ogeScrollParent(element) : null;
    let last = start;
    this.gesture = beginPointerGesture(event, {
      longPress: 0,
      source: event.currentTarget as Element,
      suppressClick: true,
      onMove: (dx, dy) => {
        if (!this.scroller && scrollParent)
          this.scroller = createAutoScroller(scrollParent);
        this.scroller?.update(event.clientX + dx, event.clientY + dy);
        const span = ogeTileLayoutClampResize(
          tile,
          ogeTileLayoutResizeSpan({
            start,
            width: rect?.width ?? 0,
            height: rect?.height ?? 0,
            dx,
            dy,
            gap,
            rtl,
          }),
        );
        this.resizeFrame.set({
          key: tile.key,
          width: Math.max(48, (rect?.width ?? 0) + (rtl ? -dx : dx)),
          height: Math.max(48, (rect?.height ?? 0) + dy),
          text: ogeTileLayoutSizeText(span, locale),
        });
        if (span.colSpan !== last.colSpan || span.rowSpan !== last.rowSpan) {
          this.capture();
          last = span;
        }
        this.resizePreview.set({ key: tile.key, span });
      },
      onFinish: (commit, cancelled) => {
        this.gesture = null;
        this.scroller?.stop();
        this.scroller = null;
        const preview = this.resizePreview();
        this.capture();
        this.resizePreview.set(null);
        this.resizeFrame.set(null);
        if (cancelled) this.announce(this.msg().dragCancelled);
        else if (commit && preview)
          this.commitResize(tile.key, preview.span, 'pointer');
      },
    });
  }

  // --- helpers --------------------------------------------------------------

  private publicItem(item: TileSource): OgeTileLayoutItemData {
    if (!item.child) return item;
    return item.child.data();
  }

  private labelOf(tile: OgeTileLayoutResolvedTile): string {
    return ogeTileLayoutTileLabel(tile, this.msg(), this.resolvedLocale());
  }

  private unchanged(label: string): string {
    return ogeTileLayoutUnchangedText(this.msg(), label, this.resolvedLocale());
  }

  private announce(message: string): void {
    this.announcer.announce(message);
  }

  private isRtl(): boolean {
    return ogeIsRtl(this.host.nativeElement);
  }

  private ensureAnimator(): OgeLayoutAnimator<string> {
    this.animator ??= createOgeLayoutAnimator<string>({
      root: this.list().nativeElement,
      query: () =>
        this.tileElements().map(
          (el) => [el.getAttribute('data-oge-tile-key') ?? '', el] as const,
        ),
    });
    return this.animator;
  }

  /** "First" of a layout change the component makes itself. */
  private capture(): void {
    this.animator?.capture();
  }

  private tileElements(): HTMLElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(
        '.oge-tile-layout-tile',
      ),
    );
  }

  private tileElement(key: OgeTileLayoutKey): HTMLElement | null {
    return (
      this.tileElements().find(
        (el) => el.getAttribute('data-oge-tile-key') === String(key),
      ) ?? null
    );
  }

  private cellElement(key: OgeTileLayoutKey): HTMLElement | null {
    return this.tileElement(key)?.parentElement ?? null;
  }

  /**
   * The cells' boxes in committed order. Cells never animate (the tiles in
   * them do), so these are honest layout boxes even mid-glide.
   */
  private measure(): OgeTileLayoutRect[] {
    return this.tileElements().map((el) => {
      const r = (el.parentElement ?? el).getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    });
  }

  /** The cells' boxes in display (preview) order. */
  private measureDisplay(): OgeTileLayoutRect[] {
    const rects = this.measure();
    const order = this.displayOrder();
    if (!order) return rects;
    const out: OgeTileLayoutRect[] = [];
    rects.forEach((r, i) => (out[order[i] ?? i] = r));
    return out;
  }

  private refocus(key: OgeTileLayoutKey): void {
    this.focusKey.set(key);
    afterNextRender(
      () => this.tileElement(key)?.focus({ preventScroll: false }),
      {
        injector: this.injector,
      },
    );
  }
}
